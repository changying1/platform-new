import { ApiDevice } from "@/src/api/deviceApi";
import { FenceData, ProjectRegionData, FenceDevice } from "../types";

const hashToUnit = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return (hash % 10000) / 10000;
};

const seededOffset = (seed: string, range: number, salt: string) => {
  const unit = hashToUnit(`${seed}:${salt}`);
  return (unit - 0.5) * range;
};

export const mapDbDevicesToFenceDevices = (
  items: ApiDevice[],
): FenceDevice[] => {
  return items.map((device, index) => {
    let lat = 31.2304;
    let lng = 121.4737;

    if (device.last_latitude && device.last_longitude) {
      lat = device.last_latitude;
      lng = device.last_longitude;
    } else {
      lat = 31.2304 + seededOffset(device.id, 0.01, "lat");
      lng = 121.4737 + seededOffset(device.id, 0.01, "lng");
    }

    return {
      id: device.id,
      name: device.device_name || device.id,
      dept: index % 2 === 0 ? "工程部" : "安保部",
      lat: lat,
      lng: lng,
      status: device.is_online ? "online" : "offline",
    };
  });
};

export const mapResponseToFenceData = (res: any): FenceData => {
  return {
    id: res.id.toString(),
    name: res.name,
    projectRegionId: res.project_region_id?.toString(),
    type: res.shape === "polygon" ? "Polygon" : "Circle",
    behavior: res.behavior || "No Exit",
    alarmCount: 0,
    startTime: res.effective_time?.split("-")[0] || "00:00",
    endTime: res.effective_time?.split("-")[1] || "23:59",
    radius: res.radius || 0,
    center:
      res.shape === "circle"
        ? JSON.parse(res.coordinates_json)
        : [31.2304, 121.4737],
    points: res.shape === "polygon" ? JSON.parse(res.coordinates_json) : [],
    description: res.remark || "",
    level: (res.alarm_type
      ? res.alarm_type.charAt(0).toUpperCase() + res.alarm_type.slice(1)
      : "Medium") as any,
    deviceIds: res.deviceIds || [],
    workerCount: res.worker_count || 0,
  };
};

export const mapResponseToRegionData = (res: any): ProjectRegionData => {
  return {
    id: res.id.toString(),
    name: res.name,
    points: JSON.parse(res.coordinates_json),
    remark: res.remark || "",
  };
};
