use std::{sync::Arc, time::Duration};

use axum::{
    error_handling::HandleErrorLayer,
    http::StatusCode,
    middleware::{from_fn, map_response},
    BoxError, Router,
};
use data::CircuitDB;
use model::AppState;
use tokio::net::TcpListener;
use tower::{buffer::BufferLayer, limit::RateLimitLayer, timeout::TimeoutLayer, ServiceBuilder};
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use web::{
    middleware::{log_responses, response_mapper},
    responses::RequestResponse,
};

mod data;
mod model;
mod web;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().expect(".env file must exist");

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
                // axum logs rejections from built-in extractors with the `axum::rejection`
                // target, at `TRACE` level. `axum::rejection=trace` enables showing those events
                "um_device_tracker=debug,tower_http=debug,axum::rejection=trace,sqlx=info".into()
            }),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let pool =
        sqlx::PgPool::connect(&std::env::var("DATABASE_URL").expect("DATABASE_URL MUST BE SET"))
            .await
            .expect("Failed to connect to db");

    let data_source = Arc::new(CircuitDB { pool });

    let app_state = AppState::new(data_source);

    let api_routes = web::handlers::get_api_router()
        .with_state(app_state)
        .layer(axum::middleware::from_fn(web::middleware::validate_jwt_mw));

    let app = Router::new()
        .route("/favicon.ico", axum::routing::get(favicon_ico_handler))
        .nest("/api", api_routes)
        .nest("/auth", web::handlers::get_auth_router())
        .route_service("/", ServeFile::new("static/index.html"))
        .nest_service("/assets", ServeDir::new("static/assets"))
        .layer(from_fn(log_responses))
        .layer(map_response(response_mapper))
        .layer(TraceLayer::new_for_http())
        .layer(
            ServiceBuilder::new()
                .layer(HandleErrorLayer::new(|err: BoxError| async move {
                    tracing::error! {"Error {err} ocurred!"}
                    RequestResponse::<()>::Error {
                        message: err.to_string(),
                        code: StatusCode::BAD_REQUEST,
                    }
                }))
                .layer(BufferLayer::new(1024))
                .layer(RateLimitLayer::new(5, Duration::from_secs(1)))
                .layer(TimeoutLayer::new(Duration::from_secs(60))),
        );

    let listener = TcpListener::bind(format!(
        "0.0.0.0:{}",
        std::env::var("PORT").unwrap_or("3000".to_string())
    ))
    .await
    .unwrap();

    tracing::debug!("listening on {}", listener.local_addr().unwrap());

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {
            tracing::warn!("Initiating graceful shutdown")
       },
        _ = terminate => {
            tracing::warn!("Initiating graceful shutdown")
        },
    }
}

async fn favicon_ico_handler() -> impl axum::response::IntoResponse {
    use axum::response::Response;

    Response::builder()
        .status(StatusCode::NO_CONTENT)
        .body("".to_string())
        .expect("Response will always be valid")
}
