import { FenceData, FenceDevice } from "../types";

/**
 * 计算两点间的距离 (米)
 */
export const distanceMeters = (a: [number, number], b: [number, number]) => {
  const R = 6371000;
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/**
 * 判断点是否在圆内
 */
export const isPointInCircle = (
  point: [number, number],
  center: [number, number],
  radius: number
) => {
  return distanceMeters(point, center) <= radius;
};

/**
 * 判断点是否在多边形内 (射线法)
 */
export const isPointInPolygon = (point: [number, number], vs: [number, number][]) => {
  const x = point[1],
    y = point[0];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][1],
      yi = vs[i][0];
    const xj = vs[j][1],
      yj = vs[j][0];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * 判断设备是否位于围栏内
 */
export const isDeviceInsideFence = (device: { lat: number, lng: number }, fence: FenceData) => {
  if (fence.type === "Circle") {
    return isPointInCircle(
      [device.lat, device.lng],
      fence.center,
      fence.radius
    );
  }
  if (fence.type === "Polygon" && fence.points) {
    return isPointInPolygon([device.lat, device.lng], fence.points);
  }
  return false;
};

/**
 * 判断围栏当前是否在生效时间段内
 */
export const isFenceActive = (fence: { startTime: string; endTime: string }): boolean => {
  if (!fence.startTime || !fence.endTime) return true;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMinute] = fence.startTime.split(":").map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;

  const [endHour, endMinute] = fence.endTime.split(":").map(Number);
  const endTotalMinutes = endHour * 60 + endMinute;

  if (startTotalMinutes <= endTotalMinutes) {
    return currentMinutes >= startTotalMinutes && currentMinutes <= endTotalMinutes;
  } else {
    // 跨天
    return currentMinutes >= startTotalMinutes || currentMinutes <= endTotalMinutes;
  }
};
