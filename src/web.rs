use serde::{Deserialize, Serialize};

pub mod responses {
    use axum::{
        http::{header::CONTENT_TYPE, Response, StatusCode},
        response::IntoResponse,
    };
    use eyre::Report;
    use serde::Serialize;

    #[derive(Serialize, Clone)]
    #[serde(tag = "status")]
    #[serde(rename_all = "lowercase")]
    pub enum RequestResponse<T: Serialize> {
        Success {
            data: T,
            #[serde(skip)]
            code: StatusCode,
        },
        Error {
            message: String,
            #[serde(skip)]
            code: StatusCode,
        },
    }

    impl<T> RequestResponse<T>
    where
        T: Serialize,
    {
        pub fn from_result(
            result: Result<T, Report>,
            (success_code, error_code): (StatusCode, StatusCode),
        ) -> RequestResponse<T> {
            match result {
                Ok(data) => RequestResponse::Success {
                    data,
                    code: success_code,
                },
                Err(report) => RequestResponse::Error {
                    message: report.to_string(),
                    code: error_code,
                },
            }
        }
    }

    impl<T> IntoResponse for RequestResponse<T>
    where
        T: Serialize,
    {
        fn into_response(self) -> axum::response::Response {
            let code = match &self {
                RequestResponse::Success { code, .. } => *code,
                RequestResponse::Error { code, .. } => *code,
            };

            let body = serde_json::to_string(&self).expect("Type is serializeable");

            Response::builder()
                .status(code)
                .header(CONTENT_TYPE, "application/json")
                .body(body.into())
                .expect("Is valid body")
        }
    }

    #[derive(Serialize)]
    pub struct LoginResponse {
        pub token: String,
    }
}

pub mod requests {
    use serde::{Deserialize, Serialize};
    use sqlx::prelude::FromRow;

    #[derive(Deserialize, Serialize, FromRow)]
    pub struct LoginRequest {
        pub username: String,
        pub password: String,
        pub requested_role: super::Role,
    }

    #[derive(FromRow)]
    pub struct UserResponse {
        pub username: String,
        #[allow(dead_code)]
        pub password: String,
        pub role: String,
    }

    #[derive(Deserialize)]
    pub struct ReportAcknowledgement {
        pub id: String,
    }
}

#[derive(Serialize, Deserialize, Clone)]
struct Claims {
    sub: String,
    exp: usize,
    role: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(try_from = "&str")]
pub enum Role {
    Admin,
    User,
}

impl TryFrom<&str> for Role {
    type Error = eyre::Report;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value {
            "admin" => Ok(Self::Admin),
            "user" => Ok(Self::User),
            _ => Err(eyre::Report::msg("Not a valid application role")),
        }
    }
}

impl From<Role> for String {
    fn from(value: Role) -> Self {
        match value {
            Role::Admin => "admin".to_owned(),
            Role::User => "user".to_owned(),
        }
    }
}

pub mod handlers {
    use axum::Router;
    use ulid::Ulid;

    use crate::model::{
        AppState, Circuit, CircuitImportReport, DataSource, NotificationRepository, Reporter,
    };

    pub mod circuits {
        use axum::{
            extract::{Multipart, Path, State},
            http::{Response, StatusCode},
            middleware::from_fn,
            response::IntoResponse,
            routing::{get, post, put},
            Json, Router,
        };

        use ulid::Ulid;

        use crate::{
            model::{AppState, Circuit, CircuitDTO, CircuitImportReport, DataSource, Reporter},
            web::{middleware::validate_role_mw, responses::RequestResponse},
        };

        pub fn get_router<S>() -> Router<AppState<Circuit, S>>
        where
            S: DataSource<Circuit> + Clone + Send + Sync + 'static + Reporter<CircuitImportReport>,
            <S as DataSource<Circuit>>::Id: From<Ulid> + Send + Sync,
            <S as Reporter<CircuitImportReport>>::Id: From<std::string::String>,
        {
            Router::new()
                .route(
                    "/create",
                    post(create)
                        .layer(from_fn(|req, next| validate_role_mw(req, next, &["admin"]))),
                )
                .route(
                    "/update",
                    put(update).layer(from_fn(|req, next| validate_role_mw(req, next, &["admin"]))),
                )
                .route(
                    "/export",
                    get(export_circuits).layer(from_fn(|req, next| {
                        validate_role_mw(req, next, &["admin", "user"])
                    })),
                )
                .route(
                    "/import",
                    post(import_circuits)
                        .layer(from_fn(|req, next| validate_role_mw(req, next, &["admin"]))),
                )
                .route(
                    "/:circuit_id",
                    get(get_circuit).layer(from_fn(|req, next| {
                        validate_role_mw(req, next, &["admin", "user"])
                    })),
                )
                .route(
                    "/all",
                    get(get_all).layer(from_fn(|req, next| {
                        validate_role_mw(req, next, &["admin", "user"])
                    })),
                )
        }

        async fn create<S>(
            State(state): State<AppState<Circuit, S>>,
            Json(circuit_dto): Json<CircuitDTO>,
        ) -> impl IntoResponse
        where
            S: DataSource<Circuit> + Clone + Send + Sync + 'static,
        {
            RequestResponse::<Circuit>::from_result(
                state.data_source.create(circuit_dto.into()).await,
                (StatusCode::CREATED, StatusCode::INTERNAL_SERVER_ERROR),
            )
        }

        async fn get_circuit<S>(
            State(state): State<AppState<Circuit, S>>,
            Path(circuit_id): Path<Ulid>,
        ) -> impl IntoResponse
        where
            S: DataSource<Circuit> + Clone + Send + Sync + 'static,
            S::Id: From<Ulid>,
        {
            RequestResponse::<Circuit>::from_result(
                state.data_source.get(circuit_id.into()).await,
                (StatusCode::OK, StatusCode::INTERNAL_SERVER_ERROR),
            )
        }

        async fn update<S>(
            State(state): State<AppState<Circuit, S>>,
            Json(circuit): Json<Circuit>,
        ) -> impl IntoResponse
        where
            S: DataSource<Circuit> + Clone + Send + Sync + 'static,
        {
            RequestResponse::<Circuit>::from_result(
                state.data_source.update(circuit).await,
                (StatusCode::OK, StatusCode::INTERNAL_SERVER_ERROR),
            )
        }

        async fn get_all<S>(State(state): State<AppState<Circuit, S>>) -> impl IntoResponse
        where
            S: DataSource<Circuit> + Clone + Send + Sync + 'static,
        {
            RequestResponse::<Vec<Circuit>>::from_result(
                state.data_source.get_all().await,
                (StatusCode::OK, StatusCode::INTERNAL_SERVER_ERROR),
            )
        }

        async fn export_circuits<S>(State(state): State<AppState<Circuit, S>>) -> impl IntoResponse
        where
            S: DataSource<Circuit> + Clone + Send + Sync + 'static,
        {
            let all_circuits_result = state.data_source.get_all().await;

            match all_circuits_result {
                Ok(circuits) => {
                    let mut writer = csv::Writer::from_writer(vec![]);

                    for circuit in circuits {
                        let _ = writer.serialize(circuit);
                    }

                    let csv_data = writer.into_inner();

                    match csv_data {
                        Ok(data) => {
                            let headers = [
                                (axum::http::header::CONTENT_TYPE, "text/csv"),
                                (
                                    axum::http::header::CONTENT_DISPOSITION,
                                    "attachment; filename=\"circuits.csv\"",
                                ),
                            ];

                            (headers, axum::body::Body::from(data)).into_response()
                        }
                        Err(e) => {
                            tracing::error!("Error ocurred exporting csv {}", e);

                            Response::builder()
                                .status(StatusCode::INTERNAL_SERVER_ERROR)
                                .body(axum::body::Body::empty())
                                .expect("Is valid response")
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Error ocurred exporting csv {}", e);

                    Response::builder()
                        .status(StatusCode::INTERNAL_SERVER_ERROR)
                        .body(axum::body::Body::empty())
                        .expect("Is valid response")
                }
            }
        }

        async fn import_circuits<S>(
            State(state): State<AppState<Circuit, S>>,
            mut multipart: Multipart,
        ) -> impl IntoResponse
        where
            S: DataSource<Circuit> + Reporter<CircuitImportReport> + Clone + Send + Sync + 'static,

            <S as Reporter<CircuitImportReport>>::Id: From<std::string::String>,
        {
            if let Ok(Some(field)) = multipart.next_field().await {
                if !field.content_type().is_some_and(|ct| ct == "text/csv") {
                    return RequestResponse::<&str>::Error {
                        message: "No data field".to_string(),
                        code: StatusCode::BAD_REQUEST,
                    }
                    .into_response();
                }

                let file_name = field.file_name().map(|s| s.to_string());
                let csv_data = field.text().await;

                match csv_data {
                    Ok(raw) => {
                        let report_begin_id = ulid::Ulid::new().to_string();
                        let report_begin_result = state
                            .data_source
                            .report(CircuitImportReport {
                                r#type: "finished".to_string(),
                                id: report_begin_id.clone(),
                                message: "In progress".to_string(),
                                file_name: file_name.clone(),
                            })
                            .await;

                        match report_begin_result {
                            Ok(_) => {
                                tracing::info!("Beginning report");
                            }
                            Err(e) => {
                                tracing::error!("Failed to begin report : {}", e);
                                return RequestResponse::<&str>::Error {
                                    message: e.to_string(),
                                    code: StatusCode::INTERNAL_SERVER_ERROR,
                                }
                                .into_response();
                            }
                        }

                        tokio::spawn(async move {
                            let mut num_errors: i32 = 0;
                            let mut reader = csv::ReaderBuilder::new()
                                .has_headers(true)
                                .from_reader(raw.as_bytes());

                            for record in reader.records() {
                                match record {
                                    Ok(row) => {
                                        let circuit_deserialize_res: Result<Circuit, csv::Error> =
                                            row.deserialize(None);

                                        if let Ok(mut circuit) = circuit_deserialize_res {
                                            if circuit.id.is_empty() {
                                                circuit.id = ulid::Ulid::new().to_string();
                                                match state.data_source.create(circuit).await {
                                                    Ok(circuit) => {
                                                        tracing::info!(
                                                            "Successfully created circuit {:?}",
                                                            circuit
                                                        )
                                                    }
                                                    Err(e) => {
                                                        let report_result = state
                                                            .data_source
                                                            .report(CircuitImportReport {
                                                                id: ulid::Ulid::new().to_string(),
                                                                file_name: file_name.clone(),
                                                                r#type: "error".to_string(),
                                                                message: e.to_string(),
                                                            })
                                                            .await;

                                                        match report_result {
                                                            Err(e) => {
                                                                tracing::error!(
                                                                "Failed to report error to db : {}",
                                                                e
                                                            );
                                                            }
                                                            _ => {}
                                                        }

                                                        tracing::error!(
                                                            "Failed to create circuit {:?}",
                                                            e
                                                        );

                                                        num_errors += 1;
                                                    }
                                                }
                                                continue;
                                            }

                                            match state.data_source.update(circuit).await {
                                                Ok(circuit) => {
                                                    tracing::info!(
                                                        "Succesfully updated circuit {:?}",
                                                        circuit
                                                    )
                                                }
                                                Err(e) => {
                                                    tracing::error!("Failed to update imported circuit with error {}", e);
                                                    num_errors += 1;

                                                    let report_result = state
                                                        .data_source
                                                        .report(CircuitImportReport {
                                                            id: ulid::Ulid::new().to_string(),
                                                            file_name: file_name.clone(),
                                                            r#type: "error".to_string(),
                                                            message: e.to_string(),
                                                        })
                                                        .await;

                                                    match report_result {
                                                        Err(e) => {
                                                            tracing::error!(
                                                                "Failed to report error to db : {}",
                                                                e
                                                            );
                                                        }
                                                        _ => {}
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        tracing::error!(
                                            "Failed reading record from imported csv : {}",
                                            e
                                        );
                                        let report_result = state
                                            .data_source
                                            .report(CircuitImportReport {
                                                id: ulid::Ulid::new().to_string(),
                                                file_name: file_name.clone(),
                                                r#type: "error".to_string(),
                                                message: e.to_string(),
                                            })
                                            .await;

                                        match report_result {
                                            Err(e) => {
                                                tracing::error!(
                                                    "Failed to report error to db : {}",
                                                    e
                                                );
                                            }
                                            _ => {}
                                        }
                                        num_errors += 1
                                    }
                                }
                            }

                            let finish_report_status = state
                                .data_source
                                .finish(
                                    report_begin_id.into(),
                                    format!("Finished import with {} errors", num_errors),
                                )
                                .await;

                            match finish_report_status {
                                Ok(_) => {}
                                Err(e) => {
                                    tracing::error!("Failed to finish reporting import : {}", e)
                                }
                            };
                        });
                    }
                    Err(e) => {
                        tracing::error!("Failed to read csv file");
                        return RequestResponse::<String>::Error {
                            message: e.to_string(),
                            code: StatusCode::BAD_REQUEST,
                        }
                        .into_response();
                    }
                }

                RequestResponse::<&str>::Success {
                    data: "Successfully started report",
                    code: StatusCode::OK,
                }
                .into_response()
            } else {
                RequestResponse::<&str>::Error {
                    message: "Malformed request".to_string(),
                    code: StatusCode::BAD_REQUEST,
                }
                .into_response()
            }
        }

        pub mod reporting {
            use axum::extract::State;
            use axum::middleware::from_fn;

            use axum::Json;
            use axum::{
                http::StatusCode,
                response::IntoResponse,
                routing::{get, post},
                Router,
            };
            use ulid::Ulid;

            use crate::model::{AppState, Circuit, DataSource, NotificationRepository, Reporter};
            use crate::web::requests::ReportAcknowledgement;
            use crate::{
                model::CircuitImportReport,
                web::{middleware::validate_role_mw, responses::RequestResponse},
            };

            pub fn get_router<S>() -> Router<AppState<Circuit, S>>
            where
                S: DataSource<Circuit>
                    + Clone
                    + Send
                    + Sync
                    + 'static
                    + NotificationRepository<CircuitImportReport>
                    + Reporter<CircuitImportReport>,

                <S as DataSource<Circuit>>::Id: From<Ulid> + Send + Sync,
                <S as Reporter<CircuitImportReport>>::Id: From<std::string::String>,
            {
                Router::new()
                    .route(
                        "/get/unseen",
                        get(get_all_unseen_reports)
                            .layer(from_fn(|req, next| validate_role_mw(req, next, &["admin"]))),
                    )
                    .route(
                        "/get/all",
                        get(get_all_reports)
                            .layer(from_fn(|req, next| validate_role_mw(req, next, &["admin"]))),
                    )
                    .route(
                        "/acknowledge",
                        post(acknowledge_report)
                            .layer(from_fn(|req, next| validate_role_mw(req, next, &["admin"]))),
                    )
            }

            async fn get_all_unseen_reports<S>(
                State(state): State<AppState<Circuit, S>>,
            ) -> impl IntoResponse
            where
                S: DataSource<Circuit>
                    + Clone
                    + Send
                    + Sync
                    + 'static
                    + NotificationRepository<CircuitImportReport>,
            {
                RequestResponse::<Vec<CircuitImportReport>>::from_result(
                    NotificationRepository::get_new(&state.data_source).await,
                    (StatusCode::OK, StatusCode::INTERNAL_SERVER_ERROR),
                )
            }

            async fn get_all_reports<S>(
                State(state): State<AppState<Circuit, S>>,
            ) -> impl IntoResponse
            where
                S: DataSource<Circuit>
                    + NotificationRepository<CircuitImportReport>
                    + Clone
                    + Send
                    + Sync
                    + 'static,
            {
                RequestResponse::<Vec<CircuitImportReport>>::from_result(
                    NotificationRepository::get_all(&state.data_source).await,
                    (StatusCode::OK, StatusCode::INTERNAL_SERVER_ERROR),
                )
            }

            async fn acknowledge_report<S>(
                State(state): State<AppState<Circuit, S>>,
                Json(acknowledgement): Json<ReportAcknowledgement>,
            ) -> impl IntoResponse
            where
                S: DataSource<Circuit>
                    + Reporter<CircuitImportReport>
                    + Clone
                    + Send
                    + Sync
                    + 'static,
                <S as Reporter<CircuitImportReport>>::Id: From<std::string::String>,
            {
                RequestResponse::<()>::from_result(
                    state
                        .data_source
                        .acknowledge(acknowledgement.id.into())
                        .await,
                    (StatusCode::OK, StatusCode::INTERNAL_SERVER_ERROR),
                )
            }
        }
    }

    pub mod auth {
        use std::time::SystemTime;

        use axum::{http::StatusCode, response::IntoResponse, routing::post, Json, Router};

        use crate::web::{
            requests::{LoginRequest, UserResponse},
            responses::{LoginResponse, RequestResponse},
            Claims,
        };

        use jsonwebtoken::{encode, EncodingKey, Header};
        use std::env;

        pub fn create_jwt(username: &str, role: &str) -> String {
            let expiration = (SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("Time went backwards")
                + std::time::Duration::from_secs(86400))
            .as_millis();

            let claims = Claims {
                sub: username.to_owned(),
                exp: expiration as usize,
                role: role.to_owned(),
            };

            let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");

            encode(
                &Header::default(),
                &claims,
                &EncodingKey::from_secret(secret.as_ref()),
            )
            .unwrap()
        }

        pub fn get_router() -> Router {
            Router::new().route("/login", post(login))
        }

        async fn login(Json(login_request): Json<LoginRequest>) -> impl IntoResponse {
            let pool = sqlx::PgPool::connect(
                &std::env::var("DATABASE_URL").expect("DATABASE_URL MUST BE SET"),
            )
            .await
            .map_err(Into::<eyre::Report>::into);

            let pool = if let Err(e) = pool {
                return RequestResponse::<LoginResponse>::Error {
                    message: e.to_string(),
                    code: StatusCode::INTERNAL_SERVER_ERROR,
                };
            } else {
                pool.unwrap()
            };

            let result: Result<Option<UserResponse>, _> = sqlx::query_as(
                "SELECT username, password, role FROM users WHERE username = $1 AND password = $2 AND role = $3 ",
            )
            .bind(login_request.username)
            .bind(login_request.password)
            .bind(Into::<String>::into(login_request.requested_role))
            .fetch_optional(&pool)
            .await
            .map_err(Into::<eyre::Report>::into);

            let query = if let Err(e) = result {
                return RequestResponse::<LoginResponse>::Error {
                    message: e.to_string(),
                    code: StatusCode::INTERNAL_SERVER_ERROR,
                };
            } else {
                result.unwrap()
            };

            if let Some(user) = query {
                RequestResponse::<LoginResponse>::Success {
                    data: LoginResponse {
                        token: create_jwt(&user.username, &Into::<String>::into(user.role)),
                    },
                    code: StatusCode::OK,
                }
            } else {
                RequestResponse::<LoginResponse>::Error {
                    message: "Invalid user".to_string(),
                    code: StatusCode::BAD_REQUEST,
                }
            }
        }
    }

    pub fn get_api_router<S>() -> Router<AppState<Circuit, S>>
    where
        S: DataSource<Circuit>
            + Clone
            + Send
            + Sync
            + 'static
            + Reporter<CircuitImportReport>
            + NotificationRepository<CircuitImportReport>,
        <S as DataSource<Circuit>>::Id: From<Ulid> + Send + Sync,
        <S as Reporter<CircuitImportReport>>::Id: From<std::string::String>,
    {
        Router::new().nest(
            "/circuits",
            circuits::get_router().nest("/reports", circuits::reporting::get_router()),
        )
    }

    pub fn get_auth_router() -> Router {
        Router::new().merge(auth::get_router())
    }
}

pub mod middleware {

    use axum::{
        body::{to_bytes, Body},
        extract::Request,
        http::{header::AUTHORIZATION, StatusCode},
        middleware::Next,
        response::{IntoResponse, Response},
    };
    use jsonwebtoken::{decode, DecodingKey, Validation};

    use super::{responses::RequestResponse, Claims};

    pub async fn response_mapper(res: Response) -> Response {
        match res.status() {
            StatusCode::UNPROCESSABLE_ENTITY
            | StatusCode::BAD_REQUEST
            | StatusCode::UNSUPPORTED_MEDIA_TYPE => RequestResponse::<()>::from_result(
                Err(eyre::Report::msg("Invalid request body")),
                (StatusCode::OK, StatusCode::BAD_REQUEST),
            )
            .into_response(),
            StatusCode::NOT_FOUND => RequestResponse::<()>::from_result(
                Err(eyre::Report::msg("Resource not found")),
                (StatusCode::OK, StatusCode::NOT_FOUND),
            )
            .into_response(),
            _ => res,
        }
    }
    fn get_valid_token(token: &str, secret: &str) -> Option<Claims> {
        let decoding_key = DecodingKey::from_secret(secret.as_ref());
        let validation = Validation::default();
        match decode::<Claims>(token, &decoding_key, &validation) {
            Ok(data) => Some(data.claims),
            Err(_) => None,
        }
    }

    const MAX_BODY_LENGTH: usize = 200;
    pub async fn log_responses(req: Request, next: Next) -> Response {
        let path = req.uri().clone();

        let res = next.run(req).await;
        let (mut res_parts, res_body) = res.into_parts();
        res_parts.headers.remove("transfer-encoding");

        let body_bytes = to_bytes(res_body, usize::MAX)
            .await
            .expect("Failed to read body");

        let truncated_body_bytes = if body_bytes.len() > MAX_BODY_LENGTH {
            &body_bytes[..MAX_BODY_LENGTH]
        } else {
            &body_bytes
        };

        tracing::info!(
            "Caught outward response body from {path} : {}",
            String::from_utf8_lossy(truncated_body_bytes)
        );

        Response::from_parts(res_parts, Body::from(body_bytes))
    }

    //It says auth token because it is not necessarily a valid jwt
    fn get_auth_token_from_req(req: &Request<Body>) -> Option<&str> {
        match req.headers().get(AUTHORIZATION) {
            Some(header) => {
                let bearer_string = header.to_str().ok()?;
                let token = bearer_string.strip_prefix("Bearer ");
                match token {
                    Some(stripped) => Some(stripped),
                    _ => None,
                }
            }
            None => None,
        }
    }

    pub async fn validate_jwt_mw(
        mut req: Request<Body>,
        next: Next,
    ) -> Result<Response, RequestResponse<()>> {
        tracing::debug!("Validating jwt for request...");

        let ret_error = RequestResponse::<()>::Error {
            message: "Invalid auth".to_string(),
            code: StatusCode::UNAUTHORIZED,
        };

        let auth_token = get_auth_token_from_req(&req);

        match auth_token {
            Some(token) => {
                if let Some(token_data) = get_valid_token(
                    token,
                    &std::env::var("JWT_SECRET").expect("JWT_SECRET MUST BE SET"),
                ) {
                    req.extensions_mut().insert(token_data);

                    Ok(next.run(req).await)
                } else {
                    Err(ret_error)
                }
            }

            None => Err(ret_error),
        }
    }
    pub async fn validate_role_mw(
        req: Request<Body>,
        next: Next,
        allowed_roles: &[&str],
    ) -> Result<Response<Body>, RequestResponse<()>> {
        let ret_error = RequestResponse::<()>::Error {
            message: "Invalid auth".to_string(),
            code: StatusCode::UNAUTHORIZED,
        };

        let role = match req.extensions().get::<Claims>() {
            Some(claims) => &claims.role,
            None => return Err(ret_error),
        };

        for required_role in allowed_roles {
            if role == required_role {
                return Ok(next.run(req).await);
            }
        }

        Err(ret_error)
    }
}
