export interface Device {
  id: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  port: number;
  stream_url: string;
  is_online: boolean;
  last_latitude?: number | null;
  last_longitude?: number | null;
  owner_id?: number | null;
}

export interface DeviceFormState {
  id: string;
  device_name: string;
  device_type: string;
  ip_address: string;
  port: number;
  stream_url: string;
}
