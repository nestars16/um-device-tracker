use eyre::Result;
use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;

pub trait DataSource<T>: Clone + Send + Sync + 'static
where
    T: Sized + Send + Sync,
{
    type Id;
    fn get_all(&self) -> impl std::future::Future<Output = Result<Vec<T>>> + Send;
    fn update(&self, value: T) -> impl std::future::Future<Output = Result<T>> + Send;
    fn get(&self, id: Self::Id) -> impl std::future::Future<Output = Result<T>> + Send;
    fn create(&self, value: T) -> impl std::future::Future<Output = Result<T>> + Send;
}

pub trait Reporter<T>: Clone + Send + Sync + 'static
where
    T: Sized + Send + Sync,
{
    type Id;

    fn report(&self, value: T) -> impl std::future::Future<Output = Result<T>> + Send;
    fn acknowledge(&self, id: Self::Id) -> impl std::future::Future<Output = Result<()>> + Send;
    fn finish(
        &self,
        id: Self::Id,
        message: String,
    ) -> impl std::future::Future<Output = Result<()>> + Send;
}

pub trait NotificationRepository<T>: Clone + Send + Sync + 'static
where
    T: Sized + Send + Sync,
{
    fn get_all(&self) -> impl std::future::Future<Output = Result<Vec<T>>> + Send;
    fn get_new(&self) -> impl std::future::Future<Output = Result<Vec<T>>> + Send;
}

#[derive(Serialize)]
pub struct CircuitImportReport {
    pub r#type: String,
    pub id: String,
    pub message: String,
    pub file_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Circuit {
    pub id: String,
    pub state: String,
    pub site_name: String,
    pub ckt_id: String,
    pub parent: String,
    pub link_type: String,
    pub provider: String,
    pub z_loc: String,
    pub rtr_name_z_loc: String,
    pub to_description: String,
    pub rtr_port_z_loc: String,
    pub interf_ip_z_loc: String,
    pub a_loc: String,
    pub rtr_name_a_loc: String,
    pub rtr_port: String,
    pub interf_ip_a_loc: String,
    pub bw_mbps: String,
    pub single_isp: String,
    pub ups_closet: String,
    pub router_ip: String,
}

#[derive(Clone)]
pub struct AppState<T, S>
where
    S: DataSource<T>,
    T: Send + Sync,
{
    pub data_source: S,
    _marker: std::marker::PhantomData<T>,
}

impl<T, S> AppState<T, S>
where
    S: DataSource<T>,
    T: Send + Sync,
{
    pub fn new(data_source: S) -> AppState<T, S> {
        AppState {
            data_source,
            _marker: std::marker::PhantomData,
        }
    }
}

impl From<CircuitDTO> for Circuit {
    fn from(value: CircuitDTO) -> Self {
        Circuit {
            id: ulid::Ulid::new().to_string(),
            state: value.state.unwrap_or_default(),
            site_name: value.site_name.unwrap_or_default(),
            ckt_id: value.ckt_id.unwrap_or_default(),
            parent: value.parent.unwrap_or_default(),
            link_type: value.link_type.unwrap_or_default(),
            provider: value.provider.unwrap_or_default(),
            z_loc: value.z_loc.unwrap_or_default(),
            rtr_name_z_loc: value.rtr_name_z_loc.unwrap_or_default(),
            to_description: value.to_description.unwrap_or_default(),
            rtr_port_z_loc: value.rtr_port_z_loc.unwrap_or_default(),
            interf_ip_z_loc: value.interf_ip_z_loc.unwrap_or_default(),
            a_loc: value.a_loc.unwrap_or_default(),
            rtr_name_a_loc: value.rtr_name_a_loc.unwrap_or_default(),
            rtr_port: value.rtr_port.unwrap_or_default(),
            interf_ip_a_loc: value.interf_ip_a_loc.unwrap_or_default(),
            bw_mbps: value.bw_mbps.unwrap_or_default(),
            single_isp: value.single_isp.unwrap_or_default(),
            ups_closet: value.ups_closet.unwrap_or_default(),
            router_ip: value.router_ip.unwrap_or_default(),
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CircuitDTO {
    pub state: Option<String>,
    pub site_name: Option<String>,
    pub ckt_id: Option<String>,
    pub parent: Option<String>,
    pub link_type: Option<String>,
    pub provider: Option<String>,
    pub z_loc: Option<String>,
    pub rtr_name_z_loc: Option<String>,
    pub to_description: Option<String>,
    pub rtr_port_z_loc: Option<String>,
    pub interf_ip_z_loc: Option<String>,
    pub a_loc: Option<String>,
    pub rtr_name_a_loc: Option<String>,
    pub rtr_port: Option<String>,
    pub interf_ip_a_loc: Option<String>,
    pub bw_mbps: Option<String>,
    pub single_isp: Option<String>,
    pub ups_closet: Option<String>,
    pub router_ip: Option<String>,
}
