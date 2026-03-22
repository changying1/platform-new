import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Trash2,
  MonitorPlay,
  Maximize2,
  X,
  Camera,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  Grid2x2,
  LayoutGrid,
  Loader,
  Settings,
  Edit2,
  // --- ✅ 新增图标（已合并，无重复）---
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import VideoPlayer from "../src/components/VideoPlayer";
import PTZControlPanel from "../src/components/PTZControlPanel";
import {
  getAllVideos,
  deleteVideo,
  getVideoStreamUrl,
  addCameraViaRTSP,
  updateVideo,
  ptzControl,
  Video,
  VideoCreate,
  VideoUpdate,
  // --- ✅ 新增 API（已合并，无重复）---
  startAIMonitoring,
  stopAIMonitoring,
  getAIRules,
  AIRule,
} from "../src/api/videoApi";

const VIDEO_CENTER_STYLE_ID = "video-center-cyber-style";
if (typeof document !== "undefined" && !document.getElementById(VIDEO_CENTER_STYLE_ID)) {
  const styleEl = document.createElement("style");
  styleEl.id = VIDEO_CENTER_STYLE_ID;
  styleEl.textContent = `
    @keyframes vc-pulse {
      0%, 100% { opacity: 0.55; box-shadow: 0 0 6px rgba(96, 165, 250, 0.55); }
      50% { opacity: 1; box-shadow: 0 0 16px rgba(96, 165, 250, 0.95); }
    }
    @keyframes vc-scan {
      0% { transform: translateY(-140%); }
      100% { transform: translateY(220%); }
    }
    .vc-scrollbar::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .vc-scrollbar::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.3);
    }
    .vc-scrollbar::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #38bdf8, #2563eb);
      border-radius: 999px;
    }
  `;
  document.head.appendChild(styleEl);
}

function CyberPanel({
  title,
  icon,
  actions,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-md border border-blue-400/30 bg-slate-900/65 backdrop-blur-md shadow-[inset_0_0_30px_rgba(59,130,246,0.12),0_8px_28px_rgba(2,6,23,0.6)] overflow-hidden ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40" style={{
        background: "linear-gradient(180deg, rgba(148,163,184,0) 0%, rgba(14,116,144,0.14) 45%, rgba(148,163,184,0) 100%)",
        animation: "vc-scan 6s linear infinite",
      }} />

      <div className="absolute -top-px -left-px h-3 w-3 border-l-2 border-t-2 border-cyan-300" />
      <div className="absolute -top-px -right-px h-3 w-3 border-r-2 border-t-2 border-cyan-300" />
      <div className="absolute -bottom-px -left-px h-3 w-3 border-l-2 border-b-2 border-cyan-300" />
      <div className="absolute -bottom-px -right-px h-3 w-3 border-r-2 border-b-2 border-cyan-300" />

      <div className="relative z-10 flex items-center justify-between border-b border-blue-400/20 bg-gradient-to-r from-blue-500/20 via-blue-300/5 to-transparent px-4 py-2.5">
        <div className="flex items-center gap-2 text-sky-100 font-semibold tracking-[0.12em] text-sm">
          <span className="h-2 w-2 rounded-full bg-cyan-300" style={{ animation: "vc-pulse 2.2s ease-in-out infinite" }} />
          {icon}
          <span>{title}</span>
        </div>
        {actions}
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default function VideoCenter() {
  // --- 状态管理 ---
  const [activeAlgos, setActiveAlgos] = useState<string[]>([]); 
  const [algos, setAlgos] = useState<Array<{ id: string; name: string }>>([
    { id: "helmet", name: "安全帽类" },
    { id: "signage", name: "现场标识类" },
    { id: "supervisor_count", name: "现场监督人数统计" },
    { id: "ladder_angle", name: "梯子角度类" },
    { id: "hole_curb", name: "孔口挡坎违规类" },
    { id: "unauthorized_person", name: "围栏入侵管理类" },
  ]);
  const [devices, setDevices] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [maximizedVideo, setMaximizedVideo] = useState<Video | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  
  // --- ✅ 新增 AI 监控状态 ---
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // --- 分页与网格状态 ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [gridInputValue, setGridInputValue] = useState("9");
  const [previewStreams, setPreviewStreams] = useState<Record<number, string>>({});
  const [previewLoading, setPreviewLoading] = useState<Record<number, boolean>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<number, string>>({});

  // --- 弹窗与表单状态 ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Video | null>(null);
  const [editingDevice, setEditingDevice] = useState<Video | null>(null);

  const [newDeviceForm, setNewDeviceForm] = useState<VideoCreate>({
    name: "",
    ip_address: "",
    port: 80,
    username: "",
    password: "",
    stream_url: "",
    status: "offline",
    remark: "",
  });

  const [editDeviceForm, setEditDeviceForm] = useState<VideoUpdate>({
    name: "",
    ip_address: "",
    port: 80,
    username: "",
    password: "",
    stream_url: "",
    status: "offline",
    remark: "",
  });

  // --- ✅ 新增：切换摄像头时重置 AI 状态 ---
  useEffect(() => {
    setIsAIEnabled(false);
  }, [maximizedVideo]);

  // --- ✅ 改进：AI 开关处理逻辑 ---

  // 1. 处理单个功能的开启/关闭
  const handleSingleAI = async (type: string) => {
  if (!maximizedVideo) return;
  setAiLoading(true);

  try {
    const deviceId = String(maximizedVideo.id);
    const rtsp = maximizedVideo.stream_url || maximizedVideo.rtsp_url || "";

    const nextAlgos = activeAlgos.includes(type)
      ? activeAlgos.filter(t => t !== type)
      : [...activeAlgos, type];

    // ✅ 关键：不要循环 start 多次；后端按 device_id 只允许一个监控线程
    await stopAIMonitoring(deviceId);
    if (nextAlgos.length > 0) {
      await startAIMonitoring(deviceId, rtsp, nextAlgos.join(","));
    }

    setActiveAlgos(nextAlgos);
  } catch (error) {
    console.error(`${type} 操作失败:`, error);
    alert("AI 服务同步失败");
  } finally {
    setAiLoading(false);
  }
};


  // 2. 处理一键全开启/全关闭
  const handleToggleAll = async (enable: boolean) => {
  if (!maximizedVideo) return;
  setAiLoading(true);

  try {
    const deviceId = String(maximizedVideo.id);
    const rtsp = maximizedVideo.stream_url || maximizedVideo.rtsp_url || "";

    await stopAIMonitoring(deviceId);

    if (enable) {
      const all = algos.map(a => a.id);
      await startAIMonitoring(deviceId, rtsp, all.join(","));
      setActiveAlgos(all);
    } else {
      setActiveAlgos([]);
    }
  } catch (error) {
    alert("批量操作失败");
  } finally {
    setAiLoading(false);
  }
};


  // --- 初始化加载 ---
  useEffect(() => {
    fetchDevices();
    fetchAIRules();
  }, []);

  const fetchAIRules = async () => {
    try {
      const rules: AIRule[] = await getAIRules();
      if (!rules.length) return;

      const mapped = rules.map((rule) => ({
        id: rule.key,
        name: rule.desc || rule.key,
      }));

      setAlgos(mapped);
    } catch (e) {
      console.warn("AI 规则加载失败，使用本地兜底列表", e);
    }
  };

  useEffect(() => {

    const ws = new WebSocket("ws://localhost:8000/ws/alarm")

    ws.onopen = () => {
      console.log("AI报警WebSocket已连接")
    }

    ws.onmessage = (event) => {

      const data = JSON.parse(event.data)

      if (data.alarm && data.boxes) {
        drawBoxes(data.boxes)
      }

    }

    ws.onerror = (err) => {
      console.error("AI WebSocket错误:", err)
    }

    ws.onclose = () => {
      console.log("AI报警连接关闭")
    }

    return () => ws.close()

  }, [])

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const data = await getAllVideos();
      setDevices(data);
      setError(null);
    } catch (e: any) {
      setError("无法加载设备。请确认后端服务已启动。");
    } finally {
      setLoading(false);
    }
  };

  // --- 逻辑处理 ---
  const handleSearch = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const filteredDevices = devices.filter(
    (h) =>
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(h.id).includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage) || 1;
  const currentVideos = filteredDevices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleShowStream = async (device: Video) => {
    try {
      let url = previewStreams[device.id];
      if (!url) {
        const data = await getVideoStreamUrl(device.id);
        url = data.url;
        setPreviewStreams((prev) => ({ ...prev, [device.id]: url }));
      }
      setStreamUrl(url);
      setMaximizedVideo(device);
    } catch (err: any) {
      alert(`获取视频流失败: ${err.message}`);
    }
  };

  const loadPreviewStream = useCallback(
    async (device: Video) => {
      if (!device || previewStreams[device.id] || previewLoading[device.id]) {
        return;
      }
      setPreviewLoading((prev) => ({ ...prev, [device.id]: true }));
      try {
        const data = await getVideoStreamUrl(device.id);
        setPreviewStreams((prev) => ({ ...prev, [device.id]: data.url }));
        setPreviewErrors((prev) => ({ ...prev, [device.id]: "" }));
      } catch (err: any) {
        setPreviewErrors((prev) => ({
          ...prev,
          [device.id]: err?.message || "加载失败",
        }));
      } finally {
        setPreviewLoading((prev) => ({ ...prev, [device.id]: false }));
      }
    },
    [previewLoading, previewStreams]
  );

  useEffect(() => {
    currentVideos.forEach((device) => {
      if (device) {
        loadPreviewStream(device);
      }
    });
  }, [currentVideos, loadPreviewStream]);

  const handleGridInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGridInputValue(value);

    if (value === "") return;

    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 100) {
      setItemsPerPage(num);
      setCurrentPage(1);
    }
  };

  const handleVideoDoubleClick = async (device: Video) => {
    await handleShowStream(device);
  };

  const handleAddDevice = async () => {
    if (!newDeviceForm.name || !newDeviceForm.stream_url) {
      alert("请填写必填字段：设备名称和流地址");
      return;
    }

    const payload = {
      name: newDeviceForm.name,
      rtsp_url: newDeviceForm.stream_url,
      ip_address: newDeviceForm.ip_address || undefined,
      port: newDeviceForm.port,
      username: newDeviceForm.username,
      password: newDeviceForm.password,
      remark: newDeviceForm.remark,
    };

    try {
      const newDevice = await addCameraViaRTSP(payload);
      setDevices([newDevice, ...devices]);
      setShowAddModal(false);
      setNewDeviceForm({
        name: "",
        ip_address: "",
        port: 80,
        username: "",
        password: "",
        stream_url: "",
        status: "offline",
        remark: "",
      });
    } catch (err: any) {
      console.error("添加失败详情:", err);
      const errorMsg = err.message || JSON.stringify(err);
      alert(`添加失败: ${errorMsg}`);
    }
  };

  const handleEditClick = (device: Video, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDevice(device);
    setEditDeviceForm({
      name: device.name,
      ip_address: device.ip_address,
      port: device.port,
      username: device.username || "",
      password: device.password || "",
      stream_url: device.stream_url || "",
      status: device.status,
      remark: device.remark || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateDevice = async () => {
    if (!editingDevice) return;
    if (!editDeviceForm.name || !editDeviceForm.stream_url) {
      alert("请填写必填字段：设备名称和流地址");
      return;
    }

    try {
      const updatedDevice = await updateVideo(editingDevice.id, editDeviceForm);
      setDevices(
        devices.map((d) => (d.id === editingDevice.id ? updatedDevice : d))
      );
      setShowEditModal(false);
      setEditingDevice(null);
    } catch (err: any) {
      alert(`更新失败: ${err.message}`);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`确定删除设备 ID: ${id} 吗？`)) {
      try {
        await deleteVideo(id);
        setDevices((prev) => prev.filter((d) => d.id !== id));
      } catch (err: any) {
        alert(`删除失败: ${err.message}`);
      }
    }
  };

  const cols = Math.ceil(Math.sqrt(itemsPerPage));

  if (loading)
    return (
      <div className="h-full flex items-center justify-center text-blue-500">
        <Loader className="animate-spin" size={48} />
      </div>
    );

    const trackHistory:any = {}

    const drawBoxes = (boxes:any[]) => {

      const canvas:any = document.getElementById("aiCanvas")
      if(!canvas) return

      const ctx = canvas.getContext("2d")

      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight

      ctx.clearRect(0,0,canvas.width,canvas.height)

      boxes.forEach((box)=>{

        const [x1,y1,x2,y2] = box.coords
        const id = box.track_id || 0

        const color = `hsl(${(id*50)%360},80%,50%)`

        ctx.strokeStyle=color
        ctx.lineWidth=3

        ctx.strokeRect(x1,y1,x2-x1,y2-y1)

        ctx.fillStyle=color
        ctx.fillRect(x1,y1-20,120,20)

        ctx.fillStyle="white"
        ctx.font="14px Arial"
        ctx.fillText(`${box.msg} #${id}`,x1+5,y1-5)

      })

    }

  return (
    <div className="h-full flex gap-4 p-4 text-slate-100 bg-[radial-gradient(circle_at_12%_8%,rgba(56,189,248,0.20),transparent_32%),radial-gradient(circle_at_86%_2%,rgba(59,130,246,0.22),transparent_30%),linear-gradient(135deg,#020617,#0b1f3f_45%,#102a5e)]">
      {/* 左侧列表 */}
      <CyberPanel
        title="设备管理"
        icon={<MonitorPlay size={16} className="text-cyan-300" />}
        className="w-80 flex flex-col"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 px-2 py-1 rounded text-xs flex items-center gap-1 font-semibold"
          >
            <Plus size={14} />
            新增
          </button>
        }
      >
        <div className="p-3 flex flex-col gap-3">
          <input
            type="text"
            placeholder="搜索设备..."
            className="bg-slate-950/65 border border-blue-300/35 rounded px-3 py-2 text-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 text-slate-100 placeholder-slate-500"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[calc(100vh-15rem)] vc-scrollbar pr-1">
          {filteredDevices.map((device) => (
            <div
              key={device.id}
              onClick={() => setSelectedDevice(device)}
              className={`p-3 rounded border cursor-pointer transition-all flex justify-between items-center ${
                selectedDevice?.id === device.id
                  ? "border-cyan-300/90 bg-cyan-400/15 shadow-[0_0_14px_rgba(56,189,248,.35)]"
                  : "border-blue-300/20 bg-slate-900/35 hover:border-cyan-300/45 hover:bg-sky-500/10"
              }`}
            >
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate text-slate-100">
                  {device.name}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>
                    {device.ip_address}:{device.port}
                  </span>
                  {device.remark && (
                    <span className="bg-slate-800/90 px-1 rounded truncate max-w-[80px] border border-slate-700">
                      {device.remark}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => handleEditClick(device, e)}
                  className="text-slate-500 hover:text-cyan-300 transition-colors"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => handleDelete(device.id, e)}
                  className="text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          </div>
        </div>
      </CyberPanel>

      {/* 右侧网格 */}
      <div className="flex-1 flex flex-col gap-4">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: "1rem",
          }}
          className="flex-1"
        >
          {Array.from({ length: itemsPerPage }).map((_, i) => {
            const device = currentVideos[i];
            return (
              <div
                key={`${device?.id ?? "slot"}-${i}`}
                className="relative group overflow-hidden rounded-md border border-blue-300/20 bg-slate-900/55 shadow-[inset_0_0_18px_rgba(14,165,233,0.08),0_6px_14px_rgba(2,6,23,.5)] hover:border-cyan-300/45 transition-colors"
              >
                {device ? (
                  <>
                    <div
                      className="relative w-full pt-[56.25%] bg-black"
                      onDoubleClick={() => handleVideoDoubleClick(device)}
                    >
                      <div className="absolute inset-0">
                        {previewStreams[device.id] ? (
                          <VideoPlayer
                            key={previewStreams[device.id]}
                            src={previewStreams[device.id]}
                          />
                        ) : previewLoading[device.id] ? (
                          <div className="h-full w-full flex items-center justify-center text-slate-300 text-sm">
                            正在加载预览...
                          </div>
                        ) : previewErrors[device.id] ? (
                          <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-xs text-rose-300">
                            <span>{previewErrors[device.id]}</span>
                            <button
                              className="px-3 py-1 bg-rose-500 text-white rounded"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadPreviewStream(device);
                              }}
                            >
                              重试
                            </button>
                          </div>
                        ) : (
                          <button
                            className="h-full w-full flex items-center justify-center text-slate-300 text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadPreviewStream(device);
                            }}
                          >
                            点击加载预览
                          </button>
                        )}
                      </div>
                    </div>
                    {/* 状态指示器 */}
                    <div className="absolute top-2 left-2 flex items-center gap-2 z-10">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          device.status === "online"
                            ? "bg-green-500 animate-pulse"
                            : "bg-slate-500"
                        }`}
                      />
                      <span className="text-xs bg-slate-900/75 backdrop-blur px-2 py-0.5 rounded text-slate-100 border border-cyan-300/20 shadow-sm">
                        {device.name}
                      </span>
                    </div>
                    {/* 悬浮操作栏 */}
                    <div className="absolute bottom-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button
                        onClick={() => handleShowStream(device)}
                        className="p-1.5 bg-cyan-500 hover:bg-cyan-400 rounded text-slate-900 shadow-lg transition-all"
                        title="全屏播放"
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-700">
                    <Plus size={32} opacity={0.2} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* 分页控制 */}
        <div className="h-12 bg-slate-900/65 border border-blue-300/25 rounded-md flex items-center justify-between px-4 shadow-[inset_0_0_18px_rgba(56,189,248,.08)]">
          <div className="text-xs text-slate-300">
            共 {filteredDevices.length} 个设备
          </div>
          <div className="flex gap-3 items-center">
            <label className="text-xs text-slate-300 font-medium">布局：</label>
            <input
              type="number"
              min="1"
              max="100"
              value={gridInputValue}
              onChange={handleGridInputChange}
              className="w-16 px-2 py-1 text-xs border border-blue-300/30 rounded bg-slate-950/65 text-slate-100 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30"
              placeholder="1-100"
            />
            <span className="text-xs text-slate-400">屏</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="p-1 disabled:opacity-30 hover:bg-sky-500/15 rounded transition-colors text-slate-300"
            >
              <ChevronLeft />
            </button>
            <span className="text-xs font-mono w-10 text-center text-cyan-200">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="p-1 disabled:opacity-30 hover:bg-sky-500/15 rounded transition-colors text-slate-300"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* 添加设备弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-cyan-300/30 rounded-lg w-[500px] p-6 shadow-2xl text-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-100">
                <Settings size={18} className="text-cyan-300" /> 添加监控设备
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            {/* 表单内容 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  设备名称 <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={newDeviceForm.name}
                  onChange={(e) =>
                    setNewDeviceForm({ ...newDeviceForm, name: e.target.value })
                  }
                  placeholder="例如：北门入口摄像头"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">IP 地址</label>
                <input
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={newDeviceForm.ip_address}
                  onChange={(e) =>
                    setNewDeviceForm({ ...newDeviceForm, ip_address: e.target.value })
                  }
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">端口</label>
                <input
                  type="number"
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={newDeviceForm.port}
                  onChange={(e) =>
                    setNewDeviceForm({ ...newDeviceForm, port: parseInt(e.target.value) || 80 })
                  }
                  placeholder="80"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">用户名</label>
                <input
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={newDeviceForm.username || ""}
                  onChange={(e) =>
                    setNewDeviceForm({ ...newDeviceForm, username: e.target.value })
                  }
                  placeholder="请输入登录账号"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">密码</label>
                <input
                  type="password"
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={newDeviceForm.password || ""}
                  onChange={(e) =>
                    setNewDeviceForm({ ...newDeviceForm, password: e.target.value })
                  }
                  placeholder="******"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  流地址（RTSP/HLS）
                </label>
                <input
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={newDeviceForm.stream_url || ""}
                  onChange={(e) =>
                    setNewDeviceForm({ ...newDeviceForm, stream_url: e.target.value })
                  }
                  placeholder="示例：rtsp://账号:密码@192.168.1.100:554/..."
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">备注</label>
                <input
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={newDeviceForm.remark || ""}
                  onChange={(e) =>
                    setNewDeviceForm({ ...newDeviceForm, remark: e.target.value })
                  }
                  placeholder="位置描述或其他信息"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleAddDevice}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 py-2 rounded text-sm font-bold text-slate-900 transition-colors shadow-md"
              >
                保存配置
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded text-sm text-slate-100 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑设备弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-cyan-300/30 rounded-lg w-[500px] p-6 shadow-2xl text-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-100">
                <Settings size={18} className="text-cyan-300" /> 编辑监控设备
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            {/* 表单内容 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  设备名称 <span className="text-red-500">*</span>
                </label>
                <input
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={editDeviceForm.name}
                  onChange={(e) =>
                    setEditDeviceForm({ ...editDeviceForm, name: e.target.value })
                  }
                  placeholder="例如：北门入口摄像头"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">IP 地址</label>
                <input
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={editDeviceForm.ip_address}
                  onChange={(e) =>
                    setEditDeviceForm({ ...editDeviceForm, ip_address: e.target.value })
                  }
                  placeholder="192.168.1.100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">端口</label>
                <input
                  type="number"
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={editDeviceForm.port}
                  onChange={(e) =>
                    setEditDeviceForm({ ...editDeviceForm, port: parseInt(e.target.value) || 80 })
                  }
                  placeholder="80"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">用户名</label>
                <input
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={editDeviceForm.username || ""}
                  onChange={(e) =>
                    setEditDeviceForm({ ...editDeviceForm, username: e.target.value })
                  }
                  placeholder="请输入登录账号"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">密码</label>
                <input
                  type="password"
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={editDeviceForm.password || ""}
                  onChange={(e) =>
                    setEditDeviceForm({ ...editDeviceForm, password: e.target.value })
                  }
                  placeholder="******"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  流地址（RTSP/HLS）
                </label>
                <input
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={editDeviceForm.stream_url || ""}
                  onChange={(e) =>
                    setEditDeviceForm({ ...editDeviceForm, stream_url: e.target.value })
                  }
                  placeholder="示例：rtsp://账号:密码@192.168.1.100:554/..."
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-300 block mb-1">备注</label>
                <input
                  className="w-full bg-slate-950/60 border border-blue-300/30 rounded p-2 text-sm focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/30 outline-none text-slate-100"
                  value={editDeviceForm.remark || ""}
                  onChange={(e) =>
                    setEditDeviceForm({ ...editDeviceForm, remark: e.target.value })
                  }
                  placeholder="位置描述或其他信息"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleUpdateDevice}
                className="flex-1 bg-cyan-500 hover:bg-cyan-400 py-2 rounded text-sm font-bold text-slate-900 transition-colors shadow-md"
              >
                更新配置
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded text-sm text-slate-100 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 播放弹窗 (包含 AI 侧边栏) */}
      {maximizedVideo && (
        <div className="fixed inset-0 z-[200] bg-[radial-gradient(circle_at_15%_8%,rgba(34,211,238,.15),transparent_35%),linear-gradient(140deg,#020617,#0b1f3f_50%,#102a5e)] flex flex-col p-4 gap-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-3 text-slate-100">
              {maximizedVideo.name}
              <span className="text-sm font-mono font-normal text-slate-300 bg-slate-900/75 px-2 rounded border border-blue-300/20">
                {maximizedVideo.ip_address}
              </span>
            </h2>
            <button
              onClick={() => {
                setMaximizedVideo(null);
                setStreamUrl(null);
              }}
              className="p-2 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex gap-4 min-h-0">
            {/* Video Section */}
            <div className="flex-1 flex flex-col bg-slate-900/65 rounded-lg border border-blue-300/25 overflow-hidden">
              {streamUrl ? (
                <>
                  <div className="p-3 bg-blue-500/12 border-b border-blue-300/25 text-sm text-cyan-100">
                    <div className="flex items-center gap-2 font-semibold">
                      <MonitorPlay size={18} /> 流信息
                    </div>
                    <code className="mt-2 block text-xs bg-slate-950/70 p-2 rounded border border-blue-300/25 break-all text-slate-200 max-h-20 overflow-auto vc-scrollbar">
                      {streamUrl}
                    </code>
                  </div>
                  <div className="flex-1 flex items-center justify-center bg-black relative min-h-0">
                    <div className="relative w-full h-full">
                      <VideoPlayer src={streamUrl} />
                      <canvas
                      id="aiCanvas"
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center flex-1">
                  <Loader className="animate-spin text-cyan-300" size={48} />
                </div>
              )}
            </div>

            {/* Right Sidebar: AI Control + PTZ */}
            {streamUrl && (
              <div className="w-80 flex flex-col gap-3 h-full">
                
                {/* ✅ 新增：AI 智脑控制中心 (下拉菜单版) */}
                <div className="bg-slate-900/75 rounded-lg border border-blue-300/25 p-4 shadow-lg shrink-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-100 flex items-center gap-2">
                      <Shield size={18} className="text-cyan-300" />
                      AI 智脑控制
                    </h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleToggleAll(true)}
                        className="text-[10px] font-bold text-cyan-200 bg-cyan-500/20 border border-cyan-300/30 px-2 py-1 rounded hover:bg-cyan-500/30 transition-colors"
                      >全开启</button>
                      <button 
                        onClick={() => handleToggleAll(false)}
                        className="text-[10px] font-bold text-rose-200 bg-rose-500/20 border border-rose-300/30 px-2 py-1 rounded hover:bg-rose-500/30 transition-colors"
                      >全关闭</button>
                    </div>
                  </div>

                  {/* 下拉选择菜单 */}
                  <div className="relative mb-4">
                    <select 
                      className="w-full p-2.5 bg-slate-950/65 border border-blue-300/25 rounded-md text-sm text-slate-200 outline-none focus:ring-2 focus:ring-cyan-400/40 appearance-none cursor-pointer"
                      value=""
                      onChange={(e) => handleSingleAI(e.target.value)}
                      disabled={aiLoading}
                    >
                      <option value="" disabled>＋ 添加/切换算法功能</option>
                      {algos.map(algo => (
                        <option key={algo.id} value={algo.id}>
                          {activeAlgos.includes(algo.id) ? "✅ 已开启：" : "⭕ 未开启："} {algo.name}
                        </option>
                      ))}
                    </select>
                    {/* 自定义下拉箭头图标 */}
                    <div className="absolute right-3 top-3.5 pointer-events-none text-slate-500">
                      <Settings size={14} />
                    </div>
                  </div>

                  {/* 已开启功能状态标签 */}
                  <div className="flex flex-wrap gap-2 min-h-[24px]">
                    {activeAlgos.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
                        <AlertCircle size={12} /> 暂无监测任务运行
                      </span>
                    ) : (
                      activeAlgos.map(id => {
                        const algo = algos.find(a => a.id === id);
                        return (
                          <div key={id} className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-300/35 text-emerald-200 px-2 py-1 rounded text-[11px] animate-pulse">
                            <ShieldCheck size={12} />
                            {algo?.name}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* 加载状态提示 */}
                  {aiLoading && (
                    <div className="mt-3 pt-3 border-t border-blue-300/20 flex items-center justify-center gap-2 text-[11px] text-cyan-300">
                      <Loader size={12} className="animate-spin" /> 正在同步云端算法状态...
                    </div>
                  )}
                </div>

                {/* PTZ Control Panel */}
                <div className="bg-slate-900/75 rounded-lg border border-blue-300/25 overflow-y-auto shadow-lg flex-1 vc-scrollbar">
                  <PTZControlPanel
                    video={maximizedVideo}
                    onSuccess={(msg) => console.log(msg)}
                    onError={(err) => console.error(err)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}