// 项目相关类型定义

export interface User {
  id: number;
  username: string;
  full_name?: string;
}

export interface Device {
  id: string;
  device_name: string;
  device_type: string;
  is_online: boolean;
}

export interface Region {
  id: number;
  name: string;
  coordinates_json: string;
  remark?: string;
}

export interface Branch {
  id: number;
  name: string;
}

export interface ProjectListItem {
  id: number;
  name: string;
  description?: string;
  manager?: string;
  status: string;
  remark?: string;
  branch_id?: number;
  user_count: number;
  device_count: number;
  region_count: number;
  fence_count: number;
}

export interface ProjectDetail {
  id: number;
  name: string;
  description?: string;
  manager?: string;
  status: string;
  remark?: string;
  branch_id?: number;
  users: User[];
  devices: Device[];
  regions: Region[];
}

export interface Fence {
  id: number;
  name: string;
  region_name: string;
  region_id: number;
  shape: string;
  behavior: string;
  alarm_type: string;
  is_active: number;
  worker_count: number;
}

export interface ProjectFormData {
  name: string;
  description: string;
  manager: string;
  status: string;
  remark: string;
  branch_id?: number;
  user_ids: number[];
  device_ids: string[];
  region_ids: number[];
}
