export interface ProjectRegionData {
  id: string;
  name: string;
  points: [number, number][]; // [lat, lng]
  remark?: string;
}

export interface FenceData {
  id: string;
  name: string;
  projectRegionId?: string;
  type: "Circle" | "Polygon";
  behavior: "No Entry" | "No Exit";
  alarmCount: number;
  startTime: string;
  endTime: string;
  radius: number;
  center: [number, number]; // [lat, lng]
  points?: [number, number][]; // [lat, lng]
  description?: string;
  level: "High" | "Medium" | "Low";
  deviceIds: string[];
  workerCount: number;
}

export interface FenceDevice {
  id: string;
  name: string;
  dept: string;
  lat: number;
  lng: number;
  status: "online" | "offline";
}

export interface AlarmRecord {
  id: string;
  user: string;
  device: string;
  fenceId: string;
  type: string;
  time: string;
  location: string;
  status: string;
  level: "high" | "medium" | "low";
  msg: string;
}
