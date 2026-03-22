import { useState, useEffect, useCallback, useRef } from "react";
import { fenceApi, FenceCreatePayload } from "@/src/api/fenceApi";
import { deviceApi } from "@/src/api/deviceApi";
import { alarmApi } from "@/src/api/alarmApi";
import { getApiUrl } from "@/src/api/config";
import {
  FenceData,
  ProjectRegionData,
  FenceDevice,
  AlarmRecord,
} from "../types";
import {
  mapResponseToFenceData,
  mapResponseToRegionData,
  mapDbDevicesToFenceDevices,
} from "../utils/dataMapping";
import {
  isFenceActive,
  isPointInCircle,
  isPointInPolygon,
} from "../utils/geoUtils";

export type ViewMode =
  | "list"
  | "create"
  | "edit"
  | "region_list"
  | "region_create";

export const useFenceLogic = () => {
  // --- Data States ---
  const [fences, setFences] = useState<FenceData[]>([]);
  const [regions, setRegions] = useState<ProjectRegionData[]>([]);
  const [devices, setDevices] = useState<FenceDevice[]>([]);

  // --- UI States ---
  const [selectedFence, setSelectedFence] = useState<FenceData | null>(null);
  const [selectedRegion, setSelectedRegion] =
    useState<ProjectRegionData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [recentAlarms, setRecentAlarms] = useState<AlarmRecord[]>([]);
  const [violationTypes, setViolationTypes] = useState<
    Record<string, "No Entry" | "No Exit" | null>
  >({});

  // --- Project Search ---
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [projectSearchResults, setProjectSearchResults] = useState<
    { id: number; name: string }[]
  >([]);
  const [projectSearchLoading, setProjectSearchLoading] = useState(false);
  const [selectedProjectRegions, setSelectedProjectRegions] = useState<
    ProjectRegionData[]
  >([]);

  // --- Detection Control ---
  const deviceStatusRef = useRef<Record<string, boolean>>({});
  const isFirstLoad = useRef(true);
  const [tick, setTick] = useState(0);

  // --- Audio (Synthesized System Sound) ---
  const playAlarmSound = useCallback(() => {
    try {
      const audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();

      // 创建主振荡器 (Drip/Beep sound)
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      oscillator.frequency.exponentialRampToValueAtTime(
        440,
        audioCtx.currentTime + 0.1,
      ); // Slide down

      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.5,
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);

      // 连续响两声增强警报感
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(
          0.01,
          audioCtx.currentTime + 0.5,
        );
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.5);
      }, 150);
    } catch (e) {
      console.error("Failed to play synthesized alarm sound", e);
    }
  }, []);

  // --- Fetchers ---
  const fetchFences = useCallback(async () => {
    try {
      const res = await fenceApi.getFences();
      setFences(res.map(mapResponseToFenceData));
    } catch (err) {
      console.error("Fence fetch error:", err);
    }
  }, []);

  const fetchRegions = useCallback(async () => {
    try {
      const res = await fenceApi.getRegions();
      setRegions(res.map(mapResponseToRegionData));
    } catch (err) {
      console.error("Region fetch error:", err);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const data = await deviceApi.getAllDevices();
      setDevices(mapDbDevicesToFenceDevices(data));
    } catch (err) {
      console.error("Device fetch error:", err);
    }
  }, []);

  const searchProjects = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setProjectSearchResults([]);
      setSelectedProjectRegions([]);
      return;
    }
    try {
      setProjectSearchLoading(true);
      const res = await fetch(
        getApiUrl(`/projects/?search=${encodeURIComponent(trimmed)}`),
      );
      if (!res.ok) throw new Error("Failed to fetch projects");
      const data = await res.json();
      setProjectSearchResults(
        data.map((item: { id: number; name: string }) => ({
          id: item.id,
          name: item.name,
        })),
      );
    } catch (error) {
      console.error("Project search error:", error);
    } finally {
      setProjectSearchLoading(false);
    }
  }, []);

  const fetchProjectRegions = useCallback(async (projectId: number) => {
    try {
      setProjectSearchLoading(true);
      const res = await fetch(getApiUrl(`/projects/${projectId}`));
      if (!res.ok) throw new Error("Failed to fetch project detail");
      const data = await res.json();
      const regions = (data.regions || []).map(
        (region: {
          id: number;
          name: string;
          coordinates_json: string;
          remark?: string;
        }) => ({
          id: region.id.toString(),
          name: region.name,
          points: JSON.parse(region.coordinates_json),
          remark: region.remark || "",
        }),
      ) as ProjectRegionData[];
      setSelectedProjectRegions(regions);
    } catch (error) {
      console.error("Project region fetch error:", error);
      setSelectedProjectRegions([]);
    } finally {
      setProjectSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFences();
    fetchRegions();
    fetchDevices();
    // 缩短轮询时间到 10 秒，让画面动起来
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      fetchDevices();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchFences, fetchRegions, fetchDevices]);

  // --- Actions ---
  const saveFence = async (data: Partial<FenceData>) => {
    const payload: Partial<FenceCreatePayload> = {
      name: data.name || "未命名围栏",
      project_region_id: data.projectRegionId
        ? Number(data.projectRegionId)
        : undefined,
      shape: (data.type === "Circle" ? "circle" : "polygon") as
        | "circle"
        | "polygon",
      behavior: data.behavior,
      effective_time: `${data.startTime}-${data.endTime}`,
      radius: data.radius,
      coordinates_json: JSON.stringify(
        data.type === "Circle" ? data.center : data.points,
      ),
      alarm_type: (data.level?.toLowerCase() || "medium") as any,
      remark: data.description,
      deviceIds: data.deviceIds,
    };

    if (viewMode === "edit" && selectedFence) {
      await fenceApi.updateFence(selectedFence.id, payload);
    } else {
      await fenceApi.createFence(payload as any);
    }
    fetchFences();
    setViewMode("list");
  };

  const saveRegion = async (data: Partial<ProjectRegionData>) => {
    await fenceApi.createRegion({
      name: data.name || "未命名区域",
      coordinates_json: JSON.stringify(data.points),
      remark: data.remark,
    });
    fetchRegions();
    setViewMode("region_list");
  };

  const deleteFence = async (id: string) => {
    if (!confirm("确定删除该围栏吗？")) return;
    await fenceApi.deleteFence(id);
    // 清除该围栏相关的状态
    const newStatus = { ...deviceStatusRef.current };
    Object.keys(newStatus).forEach((key) => {
      if (key.endsWith(`-${id}`)) delete newStatus[key];
    });
    deviceStatusRef.current = newStatus;
    fetchFences();
  };

  const deleteRegion = async (id: string) => {
    if (!confirm("确定删除该区域吗？")) return;
    await fenceApi.deleteRegion(id);
    fetchRegions();
  };

  // --- Alarm Detection Logic (Internal) ---
  useEffect(() => {
    if (devices.length === 0 || fences.length === 0) {
      setViolationTypes({});
      return;
    }

    const newViolationTypes: Record<string, "No Entry" | "No Exit" | null> = {};

    devices.forEach((device) => {
      if (device.status === "offline") return;

      fences.forEach((fence) => {
        if (!isFenceActive(fence)) return;

        // 绑定人员校验：如果围栏绑定了特定人员，只校验这些人；否则跳过该人员
        if (fence.deviceIds && fence.deviceIds.length > 0) {
          if (!fence.deviceIds.includes(device.id)) return;
        }

        let isInside = false;
        if (fence.type === "Circle") {
          isInside = isPointInCircle(
            [device.lat, device.lng],
            fence.center,
            fence.radius,
          );
        } else if (fence.type === "Polygon" && fence.points) {
          isInside = isPointInPolygon([device.lat, device.lng], fence.points);
        }

        const projectRegion = fence.projectRegionId
          ? regions.find((r) => r.id === fence.projectRegionId)
          : null;

        // 禁出型围栏逻辑修正：
        // 1. 如果绑定了项目区域，则仅在项目区域内的人员触发出界报警（逻辑范围限制）
        // 2. 如果未绑定项目区域，禁出型围栏通常不成立（因为全球都是外部），此处设置不报警或仅在曾进入过的情况下报警
        const isInRegion = fence.projectRegionId
          ? projectRegion
            ? isPointInPolygon([device.lat, device.lng], projectRegion.points)
            : false
          : fence.behavior === "No Entry";

        const statusKey = `${device.id}-${fence.id}`;
        const wasInside = deviceStatusRef.current[statusKey];

        let alarmTriggered = false;
        let alarmMsg = "";

        if (wasInside === undefined) {
          if (!isFirstLoad.current) {
            if (fence.behavior === "No Entry" && isInside) {
              alarmTriggered = true;
              alarmMsg = `非法闯入 (监测开始): ${device.name} 位于 ${fence.name} 内`;
            } else if (
              fence.behavior === "No Exit" &&
              isInRegion &&
              !isInside
            ) {
              alarmTriggered = true;
              alarmMsg = `非法越界 (监测开始): ${device.name} 位于 ${fence.name} 外`;
            }
          }
        } else {
          if (fence.behavior === "No Entry") {
            if (isInside && !wasInside) {
              alarmTriggered = true;
              alarmMsg = `非法闯入: ${device.name} 进入 ${fence.name}`;
            }
          } else {
            // 禁出型：必须在区域内，且当前在外，且之前在内，才触发越界
            if (isInRegion && !isInside && wasInside) {
              alarmTriggered = true;
              alarmMsg = `非法越界: ${device.name} 离开 ${fence.name}`;
            }
          }
        }

        // 记录当前的违规类型用于地图着色
        const isViolating =
          (fence.behavior === "No Entry" && isInside) ||
          (fence.behavior === "No Exit" && isInRegion && !isInside);
        if (isViolating) {
          // 如果一个人触发了多个违规，优先显示禁入型违规(红色)
          if (!newViolationTypes[device.id] || fence.behavior === "No Entry") {
            newViolationTypes[device.id] = fence.behavior;
          }
        }

        if (alarmTriggered) {
          const newAlarm: AlarmRecord = {
            id: `ALM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            user: device.name,
            device: device.id,
            fenceId: fence.id,
            type:
              fence.behavior === "No Entry" ? "电子围栏闯入" : "电子围栏越界",
            time: new Date().toLocaleString(),
            location: fence.name,
            status: "pending",
            level: fence.level.toLowerCase() as any,
            msg: alarmMsg,
          };
          setRecentAlarms((prev) => [newAlarm, ...prev].slice(0, 5));
          playAlarmSound();

          // 5秒后自动清除该报警提示，避免一直遮挡屏幕
          setTimeout(() => {
            setRecentAlarms((prev) =>
              prev.filter((alarm) => alarm.id !== newAlarm.id)
            );
          }, 5000);

          // Persist fence alarms so they are visible in the global alarm records page.
          alarmApi
            .createAlarm({
              device_id: device.id,
              fence_id: Number(fence.id),
              alarm_type:
                fence.behavior === "No Entry"
                  ? "电子围栏闯入"
                  : "电子围栏越界",
              severity: (fence.level || "Medium").toLowerCase(),
              description: alarmMsg,
              location: fence.name,
              status: "pending",
            })
            .then((res) => {
              console.log("Successfully persisted fence alarm:", res);
            })
            .catch((err) => {
              console.error("Failed to persist fence alarm:", err);
              if (err.response) {
                console.error("Server response error:", err.response.data);
              }
            });
        }
        deviceStatusRef.current[statusKey] = isInside;
      });
    });

    setViolationTypes(newViolationTypes);
    if (isFirstLoad.current) isFirstLoad.current = false;
  }, [devices, fences, regions, tick]);

  return {
    // States
    fences,
    regions,
    devices,
    selectedFence,
    selectedRegion,
    viewMode,
    recentAlarms,
    violationTypes,
    projectSearchQuery,
    projectSearchResults,
    projectSearchLoading,
    selectedProjectRegions,

    // Setters
    setSelectedFence,
    setSelectedRegion,
    setViewMode,
    setProjectSearchQuery,

    // Actions
    saveFence,
    saveRegion,
    deleteFence,
    deleteRegion,
    searchProjects,
    fetchProjectRegions,
    refreshData: () => {
      fetchFences();
      fetchRegions();
    },
  };
};
