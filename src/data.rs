use crate::model::{Circuit, DataSource};
use sqlx::PgPool;

#[derive(Clone)]
pub struct CircuitDB {
    pub pool: PgPool,
}

use eyre::Result;

impl DataSource<Circuit> for CircuitDB {
    type Id = ulid::Ulid;

    async fn get_all(&self) -> eyre::Result<Vec<Circuit>> {
        sqlx::query_as("SELECT * FROM circuits")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| eyre::Report::msg(e.to_string()))
    }

    async fn update(&self, value: Circuit) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE circuits SET
                state = $1,
                site_name = $2,
                ckt_id = $3,
                parent = $4,
                link_type = $5,
                provider = $6,
                z_loc = $7,
                rtr_name_z_loc = $8,
                to_description = $9,
                rtr_port_z_loc = $10,
                interf_ip_z_loc = $11,
                a_loc = $12,
                rtr_name_a_loc = $13,
                rtr_port = $14,
                interf_ip_a_loc = $15,
                bw_mbps = $16,
                single_isp = $17,
                ups_closet = $18,
                router_ip = $19
            WHERE id = $20
            "#,
            value.state,
            value.site_name,
            value.ckt_id,
            value.parent,
            value.link_type,
            value.provider,
            value.z_loc,
            value.rtr_name_z_loc,
            value.to_description,
            value.rtr_port_z_loc,
            value.interf_ip_z_loc,
            value.a_loc,
            value.rtr_name_a_loc,
            value.rtr_port,
            value.interf_ip_a_loc,
            value.bw_mbps,
            value.single_isp,
            value.ups_closet,
            value.router_ip,
            value.id
        )
        .execute(&self.pool)
        .await
        .map_err(|e| eyre::Report::msg(e.to_string()))?;

        Ok(())
    }

    async fn get(&self, id: Self::Id) -> Result<Circuit> {
        sqlx::query_as("SELECT * FROM circuits WHERE id = $1")
            .bind(id.to_string())
            .fetch_one(&self.pool)
            .await
            .map_err(|e| eyre::Report::msg(e.to_string()))
    }

    async fn create(&self, value: Circuit) -> Result<()> {
        sqlx::query!(
            r#"
            INSERT INTO circuits (
                id, state, site_name, ckt_id, parent, link_type, provider, z_loc, 
                rtr_name_z_loc, to_description, rtr_port_z_loc, interf_ip_z_loc, 
                a_loc, rtr_name_a_loc, rtr_port, interf_ip_a_loc, bw_mbps, 
                single_isp, ups_closet, router_ip
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
                $13, $14, $15, $16, $17, $18, $19, $20
            )
            "#,
            value.id,
            value.state,
            value.site_name,
            value.ckt_id,
            value.parent,
            value.link_type,
            value.provider,
            value.z_loc,
            value.rtr_name_z_loc,
            value.to_description,
            value.rtr_port_z_loc,
            value.interf_ip_z_loc,
            value.a_loc,
            value.rtr_name_a_loc,
            value.rtr_port,
            value.interf_ip_a_loc,
            value.bw_mbps,
            value.single_isp,
            value.ups_closet,
            value.router_ip
        )
        .execute(&self.pool)
        .await
        .map_err(|e| eyre::Report::msg(e.to_string()))?;
        Ok(())
    }
}
