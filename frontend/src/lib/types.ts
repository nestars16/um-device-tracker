export interface Circuit {
  id: string;
  state: string;
  site_name: string;
  ckt_id: string;
  parent: string;
  link_type: string;
  provider: string;
  z_loc: string;
  rtr_name_z_loc: string;
  to_description: string;
  rtr_port_z_loc: string;
  interf_ip_z_loc: string;
  a_loc: string;
  rtr_name_a_loc: string;
  rtr_port: string;
  interf_ip_a_loc: string;
  bw_mbps: string;
  single_isp: string;
  ups_closet: string;
  router_ip: string;
}

export interface CircuitDTO {
  state: string;
  site_name: string;
  ckt_id: string;
  parent: string;
  link_type: string;
  provider: string;
  z_loc: string;
  rtr_name_z_loc: string;
  to_description: string;
  rtr_port_z_loc: string;
  interf_ip_z_loc: string;
  a_loc: string;
  rtr_name_a_loc: string;
  rtr_port: string;
  interf_ip_a_loc: string;
  bw_mbps: string;
  single_isp: string;
  ups_closet: string;
  router_ip: string;
}

export interface SuccessfulRequestResponse<T> {
  status: "success";
  data: T;
}

export interface FailedRequestResponse {
  status: "error";
  message: string;
}

export type RequestResponse<T> =
  | SuccessfulRequestResponse<T>
  | FailedRequestResponse;
