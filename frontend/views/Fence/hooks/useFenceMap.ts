import { useRef, useState, useEffect, useCallback } from "react";
import type React from "react";
import AMapLoader from "@amap/amap-jsapi-loader";
import { FenceData, ProjectRegionData, FenceDevice } from "../types";
import { isFenceActive } from "../utils/geoUtils";

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || "ab3044412b12b8deb9da741c6739be1d";
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || "65a74edbb64d47769637df170a5da117";

const DEFAULT_CENTER_LNGLAT: [number, number] = [109.13, 34.28];

export const useFenceMap = (containerRef: React.RefObject<HTMLDivElement>) => {
  const mapRef = useRef<any>(null);
  const amapRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const overlayRefs = useRef<{
    fences: any[];
    devices: any[];
    draft: any[];
  }>({ fences: [], devices: [], draft: [] });

  const toAmapLngLat = (latlng: [number, number]) => [latlng[1], latlng[0]] as [number, number];

  // Initialize Map
  useEffect(() => {
    let cancelled = false;
    const initMap = async () => {
      if (!containerRef.current || mapRef.current) return;
      try {
        if (!(window as any)._AMapSecurityConfig) {
          (window as any)._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
        }
        const AMap = await AMapLoader.load({ key: AMAP_KEY, version: "2.0" });
        if (cancelled) return;

        amapRef.current = AMap;
        mapRef.current = new AMap.Map(containerRef.current, {
          zoom: 17,
          zooms: [10, 20],
          center: DEFAULT_CENTER_LNGLAT,
          viewMode: "2D",
          mapStyle: "amap://styles/light",
          features: ["bg", "road"],
        });
        infoWindowRef.current = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -20) });
        setMapReady(true);
      } catch (e) {
        console.error("AMap init failed", e);
      }
    };
    initMap();
    return () => {
      cancelled = true;
      if (mapRef.current && mapRef.current.destroy) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  const clearGroup = useCallback((group: keyof typeof overlayRefs.current) => {
    if (!mapRef.current) return;
    overlayRefs.current[group].forEach((overlay) => mapRef.current.remove(overlay));
    overlayRefs.current[group] = [];
  }, []);

  const setCenter = useCallback((latlng: [number, number]) => {
    if (mapRef.current) mapRef.current.setCenter(toAmapLngLat(latlng));
  }, []);

  const renderFences = useCallback((
    fences: FenceData[],
    regions: ProjectRegionData[],
    selectedFenceId?: string,
    selectedRegionId?: string,
    onRegionClick?: (region: ProjectRegionData) => void
  ) => {
    if (!mapRef.current || !amapRef.current) return;
    const AMap = amapRef.current;
    const map = mapRef.current;
    clearGroup("fences");

    // Render Regions
    regions.forEach((region) => {
      const isSelected = selectedRegionId === region.id;
      const color = "#a855f7";
      
      // 如果是在新建或编辑过程中，我们希望点击完全由地图底层处理
      const isInteractionActive = onRegionClick === undefined;

      const polygon = new AMap.Polygon({
        path: region.points.map(toAmapLngLat),
        strokeColor: color,
        fillColor: color,
        fillOpacity: isSelected ? 0.2 : 0.05,
        strokeWeight: isSelected ? 3 : 2,
        strokeDasharray: "2,2",
        // 核心修复：当处于绘制阶段时，必须通过 bubble 让事件直达地图
        bubble: isInteractionActive,
        // 同时控制是否响应鼠标状态，避免光标形状干扰
        clickable: !isInteractionActive,
      });

      if (!isInteractionActive && onRegionClick) {
        polygon.on("click", (e: any) => {
          // 极度强化的事件阻断
          if (e && e.originEvent) {
            if (e.originEvent.stopPropagation) e.originEvent.stopPropagation();
            if (e.originEvent.preventDefault) e.originEvent.preventDefault();
            if (e.originEvent.stopImmediatePropagation) e.originEvent.stopImmediatePropagation();
          }
          onRegionClick(region);
        });
      }
      map.add(polygon);
      overlayRefs.current.fences.push(polygon);
    });

    // Render Fences
    fences.forEach((fence) => {
      const isSelected = selectedFenceId === fence.id;
      const isActive = isFenceActive(fence);
      const color = !isActive ? "#64748b" : fence.behavior === "No Entry" ? "#ef4444" : "#06b6d4";
      const fillOpacity = isSelected ? 0.3 : isActive ? 0.15 : 0.05;
      
      const isInteractionActive = onRegionClick === undefined;

      const commonOptions = {
        strokeColor: color,
        fillColor: color,
        fillOpacity,
        strokeWeight: isSelected ? 3 : 2,
        bubble: isInteractionActive, // 绘图时也要能点穿已有的围栏
        clickable: !isInteractionActive,
      };

      if (fence.type === "Circle") {
        const circle = new AMap.Circle({
          ...commonOptions,
          center: toAmapLngLat(fence.center),
          radius: fence.radius,
          strokeDasharray: "5,10",
        });
        map.add(circle);
        overlayRefs.current.fences.push(circle);
      } else if (fence.type === "Polygon" && fence.points) {
        const polygon = new AMap.Polygon({
          ...commonOptions,
          path: fence.points.map(toAmapLngLat),
        });
        map.add(polygon);
        overlayRefs.current.fences.push(polygon);
      }
    });
  }, [clearGroup]);

  const renderDevices = useCallback((
    devices: FenceDevice[], 
    violationTypes: Record<string, "No Entry" | "No Exit" | null>, 
    controlledIds: Set<string>
  ) => {
    if (!mapRef.current || !amapRef.current) return;
    const AMap = amapRef.current;
    const map = mapRef.current;
    clearGroup("devices");

    devices.forEach((device) => {
      const vType = violationTypes[device.id];
      const isControlled = controlledIds.has(device.id);
      
      // 着色逻辑：
      // - 禁入违规: 红色
      // - 禁出违规: 蓝色 (Cyan)
      // - 普通/受控: 绿色/浅蓝
      let color = "#22c55e"; // 默认绿色
      if (vType === "No Entry") color = "#ef4444";
      else if (vType === "No Exit") color = "#06b6d4";
      else if (isControlled) color = "#3b82f6";
      
      const marker = new AMap.Marker({
        position: [device.lng, device.lat],
        content: `<div class="device-marker" style="width:20px;height:20px;border-radius:50%;background:${color};border:2px solid #ffffff;box-shadow:0 0 5px rgba(0,0,0,0.3);cursor:pointer;transition:all 0.3s;"></div>`,
        offset: new AMap.Pixel(-10, -10),
        extData: device,
      });

      marker.on('click', () => {
        const content = `
          <div style="padding: 12px; min-width: 200px; font-family: sans-serif;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
              ${device.name}
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #64748b;">
              <div style="display: flex; justify-content: space-between;">
                <span>ID:</span> <span style="color: #334155;">${device.id}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>部门:</span> <span style="color: #334155;">${device.dept}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>状态:</span> 
                <span style="color: ${device.status === 'online' ? '#22c55e' : '#64748b'}">
                  ${device.status === 'online' ? '● 在线' : '○ 离线'}
                </span>
              </div>
              ${vType ? `
                <div style="margin-top: 4px; padding: 4px 8px; background: ${vType === 'No Entry' ? '#fef2f2' : '#ecfeff'}; color: ${vType === 'No Entry' ? '#ef4444' : '#0891b2'}; border-radius: 4px; text-align: center; font-weight: bold;">
                  违规: ${vType === 'No Entry' ? '非法闯入' : '非法越界'}
                </div>
              ` : ''}
            </div>
          </div>
        `;
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(map, marker.getPosition());
      });

      map.add(marker);
      overlayRefs.current.devices.push(marker);
    });
  }, [clearGroup]);

  const renderDraft = useCallback((
    viewMode: string, 
    formData: Partial<FenceData>, 
    regionFormData: Partial<ProjectRegionData>
  ) => {
    if (!mapRef.current || !amapRef.current) return;
    const AMap = amapRef.current;
    const map = mapRef.current;
    clearGroup("draft");

    if ((viewMode === "create" || viewMode === "edit") && formData.type === "Circle" && formData.center) {
        const center = toAmapLngLat(formData.center);
        const circle = new AMap.Circle({
          center,
          radius: formData.radius || 100,
          strokeColor: "#fbbf24",
          fillColor: "#fbbf24",
          fillOpacity: 0.2,
          strokeWeight: 2,
          strokeDasharray: "10,5",
        });
        map.add(circle);
        overlayRefs.current.draft.push(circle);
    }

    const isRegionMode = viewMode === "region_create";
    const points = isRegionMode ? regionFormData.points : formData.points;
    const color = isRegionMode ? "#a855f7" : "#fbbf24";

    if (points && points.length > 0) {
      const path = points.map(toAmapLngLat);
      if (path.length > 1) {
        const polyline = new AMap.Polyline({
          path,
          strokeColor: color,
          strokeWeight: 2,
          strokeOpacity: 0.9,
          strokeDasharray: "5,5",
        });
        map.add(polyline);
        overlayRefs.current.draft.push(polyline);
      }
      path.forEach(pos => {
        const marker = new AMap.Marker({
          position: pos,
          content: `<div style="width:8px;height:8px;border-radius:50%;background:${color};border:1px solid #ffffff;"></div>`,
          offset: new AMap.Pixel(-4, -4),
        });
        map.add(marker);
        overlayRefs.current.draft.push(marker);
      });
    }
  }, [clearGroup]);

  const bindClick = useCallback((callback: (lat: number, lng: number) => void) => {
      if (!mapRef.current) return;
      const handler = (e: any) => {
          callback(e.lnglat.getLat(), e.lnglat.getLng());
      };
      mapRef.current.on('click', handler);
      return () => mapRef.current?.off('click', handler);
  }, []);

  return {
    mapReady,
    setCenter,
    renderFences,
    renderDevices,
    renderDraft,
    bindClick
  };
};
