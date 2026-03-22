import React, { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import * as echarts from "echarts";
import chinaJson from "../src/assets/china.json";
import { deviceApi, ApiDevice } from "../src/api/deviceApi";
import { Users, Shield, Cpu, Activity, MapPin } from "lucide-react";

// ------------------------------------------------------------------
// 中国省份到高德/阿里云 DataV 的 Adcode (行政区划代码) 映射
// ------------------------------------------------------------------
const PROVINCE_ADCODE: Record<string, number> = {
  北京市: 110000,
  天津市: 120000,
  河北省: 130000,
  山西省: 140000,
  内蒙古自治区: 150000,
  辽宁省: 210000,
  吉林省: 220000,
  黑龙江省: 230000,
  上海市: 310000,
  江苏省: 320000,
  浙江省: 330000,
  安徽省: 340000,
  福建省: 350000,
  江西省: 360000,
  山东省: 370000,
  河南省: 410000,
  湖北省: 420000,
  湖南省: 430000,
  广东省: 440000,
  广西壮族自治区: 450000,
  海南省: 460000,
  重庆市: 500000,
  四川省: 510000,
  贵州省: 520000,
  云南省: 530000,
  西藏自治区: 540000,
  陕西省: 610000,
  甘肃省: 620000,
  青海省: 630000,
  宁夏回族自治区: 640000,
  新疆维吾尔自治区: 650000,
  台湾省: 710000,
  香港特别行政区: 810000,
  澳门特别行政区: 820000,
};

// 工具函数：清洗省份名字，尝试多种匹配
function getProvinceAdcode(prov: string): number | null {
  if (PROVINCE_ADCODE[prov]) return PROVINCE_ADCODE[prov];
  const k = Object.keys(PROVINCE_ADCODE).find(
    (key) => key.startsWith(prov) || prov.startsWith(key)
  );
  return k ? PROVINCE_ADCODE[k] : null;
}

// 类型定义
type BranchStatus = "正常" | "告警" | "离线";

type Branch = {
  id: number;
  province: string;
  name: string;
  coord?: [number, number];
  address?: string;
  project?: string;
  manager?: string;
  phone?: string;
  deviceCount?: number;
  status?: BranchStatus;
  updatedAt?: string;
  remark?: string;
};

type ProjectSummary = {
  id: number;
  name: string;
  branch_id?: number;
  manager: string;
  status: string;
  deviceCount: number;
  userCount: number;
  fenceCount: number;
};

if (!echarts.getMap("china")) {
  echarts.registerMap("china", chinaJson as any);
}

// ------------------------------------------------------------------
// 全局 CSS 注入（动画关键帧）
// ------------------------------------------------------------------
const STYLE_ID = "cyber-dashboard-keyframes";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const styleEl = document.createElement("style");
  styleEl.id = STYLE_ID;
  styleEl.textContent = `
    @keyframes cyber-scan {
      0%   { transform: translateY(-100%); }
      100% { transform: translateY(200vh); }
    }
    @keyframes corner-pulse {
      0%, 100% { opacity: 0.5; }
      50%      { opacity: 1; }
    }
    @keyframes title-bar-glow {
      0%, 100% { opacity: 0.7; }
      50%      { opacity: 1; box-shadow: 0 0 12px #60a5fa; }
    }
    @keyframes status-dot {
      0%, 100% { box-shadow: 0 0 4px currentColor; }
      50%      { box-shadow: 0 0 12px currentColor, 0 0 24px currentColor; }
    }
    @keyframes marquee {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes fadeInUp {
      0%   { opacity: 0; transform: translateY(12px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .cyber-select:hover {
      border-color: rgba(96, 165, 250, 0.8) !important;
      box-shadow: 0 0 12px rgba(96, 165, 250, 0.4) !important;
    }
    .cyber-select option {
      background: #0f1d3d;
      color: #fff;
    }
    .cyber-alarm-card:hover {
      transform: translateX(4px);
      transition: transform 0.2s;
    }
  `;
  document.head.appendChild(styleEl);
}

// ------------------------------------------------------------------
// CyberPanel 2.0 — 带呼吸角标 + 发光标题
// ------------------------------------------------------------------
function CyberPanel({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const cornerStyle = (
    pos: Record<string, number>
  ): React.CSSProperties => ({
    position: "absolute",
    width: 14,
    height: 14,
    pointerEvents: "none",
    animation: "corner-pulse 3s ease-in-out infinite",
    ...pos,
  });

  return (
    <div
      style={{
        position: "relative",
        background:
          "linear-gradient(135deg, rgba(16, 42, 94, 0.72) 0%, rgba(8, 28, 66, 0.6) 100%)",
        border: "1px solid rgba(59, 130, 246, 0.25)",
        boxShadow:
          "inset 0 0 30px rgba(59, 130, 246, 0.08), 0 4px 24px rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* 呼吸角标 */}
      <div
        style={{
          ...cornerStyle({ top: -1, left: -1 }),
          borderTop: "2px solid #60a5fa",
          borderLeft: "2px solid #60a5fa",
        }}
      />
      <div
        style={{
          ...cornerStyle({ top: -1, right: -1 }),
          borderTop: "2px solid #60a5fa",
          borderRight: "2px solid #60a5fa",
          animationDelay: "0.5s",
        }}
      />
      <div
        style={{
          ...cornerStyle({ bottom: -1, left: -1 }),
          borderBottom: "2px solid #60a5fa",
          borderLeft: "2px solid #60a5fa",
          animationDelay: "1s",
        }}
      />
      <div
        style={{
          ...cornerStyle({ bottom: -1, right: -1 }),
          borderBottom: "2px solid #60a5fa",
          borderRight: "2px solid #60a5fa",
          animationDelay: "1.5s",
        }}
      />

      {/* 标题栏 */}
      <div
        style={{
          background:
            "linear-gradient(90deg, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0.05) 60%, transparent 100%)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid rgba(59,130,246,0.15)",
        }}
      >
        <div
          style={{
            width: 3,
            height: 16,
            background: "linear-gradient(180deg, #60a5fa, #3b82f6)",
            marginRight: 10,
            borderRadius: 2,
            animation: "title-bar-glow 3s ease-in-out infinite",
          }}
        />
        <span
          style={{
            color: "#e0f2fe",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: 1.5,
            textShadow: "0 0 8px rgba(96,165,250,0.6)",
          }}
        >
          {title}
        </span>
      </div>

      {/* 内容 */}
      <div
        style={{
          flex: 1,
          position: "relative",
          padding: 14,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 发光数据数字组件
// ------------------------------------------------------------------
function GlowNumber({
  value,
  color = "#60a5fa",
  size = 28,
  style,
}: {
  value: string | number;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={{
        fontSize: size,
        fontWeight: 800,
        color,
        textShadow: `0 0 8px ${color}, 0 0 20px ${color}40, 0 0 40px ${color}20`,
        fontFamily: "'Orbitron', 'Consolas', monospace",
        letterSpacing: 2,
        ...style,
      }}
    >
      {value}
    </span>
  );
}

// ------------------------------------------------------------------
// 实时时钟
// ------------------------------------------------------------------
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    <span style={{ color: "#94a3b8", fontSize: 12, fontFamily: "monospace" }}>
      {now.getFullYear()}-{pad(now.getMonth() + 1)}-{pad(now.getDate())}{" "}
      {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
    </span>
  );
}

// ==================================================================
// 主组件
// ==================================================================
export default function Dashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );
  const [selectedFilterBranchId, setSelectedFilterBranchId] = useState<
    number | ""
  >("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [dbDevices, setDbDevices] = useState<any[]>([]);

  const [currentMapName, setCurrentMapName] = useState<string>("china");
  
  // 原有的固定的默认中心
  const selectedCenter = useMemo(() => [105, 35] as [number, number], []);

  // ==================================================================
  // 省份地图动态加载与注册
  // ==================================================================
  useEffect(() => {
    (async () => {
      // 未选择分支/全景模式
      if (!selectedFilterBranchId) {
        setCurrentMapName("china");
        return;
      }

      // 获取当前选择的分支
      const currentBranch = branches.find((b) => b.id === selectedFilterBranchId);
      if (!currentBranch || !currentBranch.province) {
        setCurrentMapName("china");
        return;
      }

      const provName = currentBranch.province;
      const adcode = getProvinceAdcode(provName);

      // 找不到 Adcode 或默认在根，则仍然显示全国
      if (!adcode) {
        console.warn(`未找到省份 ${provName} 对应的 Adcode`);
        setCurrentMapName("china");
        return;
      }

      // 检查当前省份是否已经被 ECharts 注册过
      if (!echarts.getMap(provName)) {
        try {
          // 使用 Aliyun DataV 下载对应的 GeoJSON
          // 注意：这需要在有公网访问能力的情况下生效。
          const res = await fetch(`https://geo.datav.aliyun.com/areas_v3/bound/${adcode}_full.json`);
          if (res.ok) {
            const geoJson = await res.json();
            echarts.registerMap(provName, geoJson as any);
          } else {
            console.error(`Failed to fetch map for ${provName} (adcode ${adcode})`);
            setCurrentMapName("china");
            return;
          }
        } catch (e) {
          console.error(`无法加载 ${provName} 的地图数据`, e);
          setCurrentMapName("china");
          return;
        }
      }

      // 切换当前地图使用注册好的省份名
      setCurrentMapName(provName);
    })();
  }, [selectedFilterBranchId, branches]);

  useEffect(() => {
    (async () => {
      try {
        const role = (localStorage.getItem("role") || "HQ").toUpperCase();
        const departmentId = localStorage.getItem("department_id") || "";
        const username = localStorage.getItem("username") || "";
        const headers = {
          "x-role": role,
          "x-department-id": departmentId,
          "x-username": username,
        };

        const [resParams, resBranches, resAlarms] = await Promise.all([
          fetch("/api/dashboard/summary", { headers }),
          fetch("/api/dashboard/branches", { headers }),
          fetch("/api/dashboard/alarms", { headers }),
        ]);

        if (resParams.ok) {
          const data = await resParams.json();
          setProjects(Array.isArray(data) ? data : []);
        }
        if (resBranches.ok) {
          const data = await resBranches.json();
          const branchList = Array.isArray(data) ? data : [];
          setBranches(branchList);
          if (branchList.length === 1)
            setSelectedFilterBranchId(branchList[0].id);
        }
        if (resAlarms.ok) {
          const alarmData = await resAlarms.json();
          setAlarms(Array.isArray(alarmData) ? alarmData : []);
        }

        // 获取后端真实设备数据
        const devicesData = await deviceApi.getAllDevices();
        setDbDevices(Array.isArray(devicesData) ? devicesData : []);
      } catch (e) {
        console.error("fetch failed:", e);
      }
    })();
  }, []);

  const filteredProjects = useMemo(() => {
    if (!selectedFilterBranchId) return [];
    return projects.filter((p) => p.branch_id === selectedFilterBranchId);
  }, [projects, selectedFilterBranchId]);

  useEffect(() => {
    if (filteredProjects.length > 0) {
      if (!filteredProjects.find((p) => p.id === selectedProjectId)) {
        setSelectedProjectId(filteredProjects[0].id);
      }
    } else {
      setSelectedProjectId(null);
    }
  }, [filteredProjects, selectedProjectId]);

  const currentProject = projects.find((p) => p.id === selectedProjectId);

  // ==================================================================
  // ECharts 配置
  // ==================================================================

  // 设备在线状态圆盘图配置
  const deviceStatusOption = useMemo(() => {
    const onlineCount = dbDevices.filter(d => d.is_online).length;
    const offlineCount = dbDevices.length - onlineCount;
    
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'right',
        top: 'middle',
        textStyle: { color: '#e0f2fe', fontSize: 10 },
        itemWidth: 10,
        itemHeight: 10
      },
      series: [
        {
          name: '设备状态',
          type: 'pie',
          radius: ['50%', '80%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '12',
              fontWeight: 'bold',
              color: '#fff',
              formatter: '{b}\n{c}'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { 
              value: onlineCount, 
              name: '在线',
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#059669' }]
                }
              }
            },
            { 
              value: offlineCount, 
              name: '离线',
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [{ offset: 0, color: '#64748b' }, { offset: 1, color: '#475569' }]
                }
              }
            }
          ]
        }
      ]
    };
  }, [dbDevices]);

  const mapOption = useMemo(() => {
    const branchPoints = branches
      .filter((b) => Array.isArray(b.coord) && b.coord.length === 2)
      .map((b) => ({
        id: b.id,
        name: b.name,
        province: b.province,
        value: [b.coord![0], b.coord![1], 1],
        status: b.status,
      }));

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(8,20,46,0.9)",
        borderColor: "#3b82f6",
        textStyle: { color: "#fff", fontSize: 13 },
        padding: [8, 14],
      },
      geo: {
        map: currentMapName, // 动态使用注册的省市区名字
        roam: true,
        // 如果是全国，给一个固定缩放和中心；如果是单独省份，则让他默认自适应 (center 用 undefined)
        zoom: currentMapName === "china" ? 1.15 : 1.0,
        center: currentMapName === "china" ? selectedCenter : undefined,
        itemStyle: {
          areaColor: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(22, 72, 156, 0.5)" },
            { offset: 1, color: "rgba(10, 40, 100, 0.3)" },
          ]),
          borderColor: "rgba(96, 165, 250, 0.5)",
          borderWidth: 1,
          shadowColor: "rgba(59, 130, 246, 0.3)",
          shadowBlur: 15,
        },
        label: {
          show: true,
          color: "rgba(255,255,255,0.55)",
          fontSize: currentMapName === "china" ? 11 : 14, // 省份放大字号
        },
        emphasis: {
          itemStyle: {
            areaColor: "rgba(59, 130, 246, 0.5)",
            borderColor: "#60a5fa",
            borderWidth: 2,
          },
          label: { color: "#fff", fontWeight: "bold" },
        },
      },
      series: [
        {
          type: "effectScatter",
          coordinateSystem: "geo",
          rippleEffect: { scale: 5.0, brushType: "stroke", period: 4 },
          symbolSize: 10,
          itemStyle: {
            color: (params: any) => {
              if (params.data.status === "告警") return "#ef4444";
              if (params.data.status === "离线") return "#f59e0b";
              return "#10b981";
            },
            shadowBlur: 15,
            shadowColor: "rgba(59,130,246,0.6)",
          },
          label: {
            show: true,
            formatter: "{b}",
            position: "right",
            color: "#e0f2fe",
            fontSize: 12,
            textShadow: "0 0 6px rgba(59,130,246,0.8)",
          },
          data: branchPoints,
        },
      ],
    };
  }, [branches, selectedCenter, currentMapName]);

  const deviceOption = useMemo(() => {
    const total = currentProject
      ? currentProject.deviceCount
      : Math.max(1, projects.reduce((acc, p) => acc + p.deviceCount, 0));
    const onlineMock = Math.floor(total * 0.85);
    return {
      series: [
        {
          type: "gauge",
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: total || 100,
          splitNumber: 5,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: "#3b82f6" },
              { offset: 1, color: "#06b6d4" },
            ]),
            shadowColor: "rgba(59,130,246,0.6)",
            shadowBlur: 15,
          },
          progress: { show: true, width: 16, roundCap: true },
          pointer: { show: false },
          axisLine: {
            lineStyle: {
              width: 16,
              color: [[1, "rgba(59,130,246,0.08)"]],
              cap: "round",
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          title: {
            show: true,
            offsetCenter: [0, "25%"],
            color: "#94a3b8",
            fontSize: 11,
          },
          detail: {
            valueAnimation: true,
            offsetCenter: [0, "-10%"],
            fontSize: 36,
            fontWeight: "bolder",
            color: "#60a5fa",
            fontFamily: "'Orbitron', 'Consolas', monospace",
            formatter: "{value}",
          },
          data: [{ value: onlineMock, name: "在线设备数" }],
        },
      ],
    };
  }, [currentProject, projects]);

  const fenceOption = useMemo(() => {
    const totalFences = currentProject
      ? currentProject.fenceCount
      : projects.reduce((acc, p) => acc + p.fenceCount, 0);
    const data = [
      { value: Math.ceil(totalFences * 0.4), name: "施工区" },
      { value: Math.ceil(totalFences * 0.3), name: "危险源" },
      {
        value:
          totalFences -
          Math.ceil(totalFences * 0.4) -
          Math.ceil(totalFences * 0.3),
        name: "办公区",
      },
    ];

    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(8,20,46,0.9)",
        textStyle: { color: "#fff" },
      },
      legend: {
        top: "bottom",
        textStyle: { color: "#94a3b8", fontSize: 11 },
        icon: "circle",
        itemWidth: 8,
        itemGap: 16,
      },
      series: [
        {
          name: "区域占比",
          type: "pie",
          radius: ["45%", "72%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: "rgba(8,20,46,0.5)",
            borderWidth: 2,
          },
          label: { show: false, position: "center" },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: "bold",
              color: "#fff",
            },
            scaleSize: 6,
          },
          labelLine: { show: false },
          data: data,
          color: ["#3b82f6", "#10b981", "#f59e0b"],
        },
      ],
    };
  }, [currentProject, projects]);

  const userOption = useMemo(() => {
    const totalUsers = currentProject
      ? currentProject.userCount
      : projects.reduce((acc, p) => acc + p.userCount, 0);
    const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    const mockTrend = Array.from({ length: 7 }, () =>
      Math.floor(totalUsers * (0.8 + Math.random() * 0.2))
    );

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(8,20,46,0.9)",
        textStyle: { color: "#fff" },
      },
      grid: { left: "3%", right: "4%", bottom: "5%", top: "15%", containLabel: true },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: days,
        axisLabel: { color: "#64748b", fontSize: 11 },
        axisLine: { lineStyle: { color: "#1e3a5f" } },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#64748b", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(59,130,246,0.08)", type: "dashed" } },
      },
      series: [
        {
          name: "出勤人数",
          type: "line",
          smooth: true,
          lineStyle: {
            color: "#0ea5e9",
            width: 2.5,
            shadowColor: "rgba(14,165,233,0.5)",
            shadowBlur: 12,
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(14,165,233,0.35)" },
              { offset: 1, color: "rgba(14,165,233,0)" },
            ]),
          },
          symbolSize: 6,
          itemStyle: { color: "#0ea5e9", borderColor: "#fff", borderWidth: 2 },
          data: mockTrend,
        },
      ],
    };
  }, [currentProject, projects]);

  const healthOption = useMemo(() => {
    const normal = branches.filter(
      (b) => b.status === "正常" || !b.status
    ).length;
    const alert = branches.filter((b) => b.status === "告警").length;
    const offline = branches.filter((b) => b.status === "离线").length;

    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(8,20,46,0.9)",
        textStyle: { color: "#fff" },
      },
      legend: {
        bottom: 0,
        textStyle: { color: "#94a3b8", fontSize: 11 },
        icon: "circle",
        itemWidth: 8,
        itemGap: 16,
      },
      series: [
        {
          name: "分支状态",
          type: "pie",
          radius: [20, 80],
          center: ["50%", "45%"],
          roseType: "area",
          itemStyle: { borderRadius: 6 },
          label: {
            show: true,
            color: "#94a3b8",
            fontSize: 11,
            formatter: "{b}\n{c}",
          },
          data: [
            {
              value: normal || 1,
              name: "正常",
              itemStyle: { color: "#10b981" },
            },
            { value: alert, name: "告警", itemStyle: { color: "#ef4444" } },
            { value: offline, name: "离线", itemStyle: { color: "#f59e0b" } },
          ],
        },
      ],
    };
  }, [branches]);

  // ==================================================================
  // 渲染
  // ==================================================================
  const sevColor = (s: string) =>
    s === "HIGH" ? "#ef4444" : s === "MEDIUM" ? "#f59e0b" : "#3b82f6";
  const sevBg = (s: string) =>
    s === "HIGH"
      ? "rgba(239,68,68,0.12)"
      : s === "MEDIUM"
        ? "rgba(245,158,11,0.12)"
        : "rgba(59,130,246,0.12)";

  return (
    <div style={S.page}>
      {/* ====== 背景层 ====== */}
      {/* 网格 */}
      <div style={S.gridBg} />
      {/* 中心径向光晕 */}
      <div style={S.radialGlow} />
      {/* 扫光动画 */}
      <div style={S.scanLine} />

      <div style={S.container}>
        {/* ====== 顶部筛选栏 ====== */}
        <div style={S.topBar}>
          {/* 左装饰线 */}
          <div style={S.decoLineLeft} />
          <div style={{ display: "flex", gap: 20, padding: "0 20px", alignItems: "center" }}>
            <div style={S.filterGroup}>
              <span style={S.filterLabel}>分支机构</span>
              <select
                className="cyber-select"
                style={S.selectBox}
                value={selectedFilterBranchId || ""}
                onChange={(e) =>
                  setSelectedFilterBranchId(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
              >
                {branches.length !== 1 && (
                  <option value="">-- 全景模式 --</option>
                )}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={S.divider} />

            <div style={S.filterGroup}>
              <span style={S.filterLabel}>当前项目</span>
              <select
                className="cyber-select"
                style={S.selectBox}
                value={selectedProjectId || ""}
                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                disabled={!selectedFilterBranchId}
              >
                {!selectedFilterBranchId ? (
                  <option value="">请先选择分公司</option>
                ) : filteredProjects.length === 0 ? (
                  <option value="">暂无关联项目</option>
                ) : (
                  filteredProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          {/* 右装饰线 */}
          <div style={S.decoLineRight} />
        </div>

        {/* ====== 三栏网格 ====== */}
        <div style={S.mainGrid}>
          {/* ---- 左侧栏 ---- */}
          <div style={S.sideCol}>
            {/* 左上：项目概况 */}
            <CyberPanel title="当前项目概况" style={{ flex: "0 0 220px" }}>
              {currentProject ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    height: "100%",
                    justifyContent: "center",
                    animation: "fadeInUp 0.5s ease-out",
                  }}
                >
                  <GlowNumber
                    value={currentProject.name}
                    color="#60a5fa"
                    size={22}
                  />
                  <div style={S.infoRow}>
                    <span style={S.labelGray}>运营负责人</span>
                    <span style={{ color: "#e2e8f0", fontSize: 15 }}>
                      {currentProject.manager || "—"}
                    </span>
                  </div>
                  <div style={S.infoRow}>
                    <span style={S.labelGray}>项目状态</span>
                    <span
                      style={{
                        color:
                          currentProject.status === "active"
                            ? "#4ade80"
                            : "#f87171",
                        fontWeight: "bold",
                        background:
                          currentProject.status === "active"
                            ? "rgba(74, 222, 128, 0.1)"
                            : "rgba(248, 113, 113, 0.1)",
                        padding: "3px 10px",
                        borderRadius: 12,
                        border: currentProject.status === "active" ? "1px solid #4ade80" : "1px solid #f87171",
                        fontSize: 12,
                      }}
                    >
                      {currentProject.status === "active"
                        ? "● 进行中"
                        : currentProject.status}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={S.emptyText}>
                  全景模式 · 请选择分公司与具体项目
                </div>
              )}
            </CyberPanel>

            {/* 左中：设备状态 */}
            <CyberPanel title="端侧资产状态" style={{ flex: 1.5 }}>
              <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
                 {/* 圆盘图表 */}
                 <div style={{ flex: 1, minHeight: 0 }}>
                    <ReactECharts
                      option={deviceStatusOption}
                      style={{ width: "100%", height: "100%" }}
                    />
                    {/* 圆心处的总数显示 */}
                    <div style={{
                      position: "absolute",
                      left: "40%",
                      top: "50%",
                      transform: "translate(-52%, -50%)",
                      textAlign: "center",
                      pointerEvents: "none"
                    }}>
                      <div style={{ color: "rgba(224, 242, 254, 0.7)", fontSize: "10px" }}>总资产</div>
                      <div style={{ color: "#38bdf8", fontSize: "18px", fontWeight: "bold", textShadow: "0 0 10px rgba(56,189,248,0.5)" }}>
                        {dbDevices.length}
                      </div>
                    </div>
                 </div>
                 
                 {/* 底部详细统计 */}
                 <div style={{ 
                   padding: "0 15px 15px 15px", 
                   display: "grid", 
                   gridTemplateColumns: "1fr 1fr", 
                   gap: "10px" 
                 }}>
                   <div style={{ 
                     background: "rgba(16, 185, 129, 0.1)", 
                     border: "1px solid rgba(16, 185, 129, 0.2)", 
                     borderRadius: "6px", 
                     padding: "8px",
                     textAlign: "center"
                   }}>
                     <div style={{ fontSize: "10px", color: "rgba(16, 185, 129, 0.8)" }}>在线设备</div>
                     <div style={{ fontSize: "14px", fontWeight: "bold", color: "#10b981" }}>
                        {dbDevices.filter(d => d.is_online).length}
                     </div>
                   </div>
                   <div style={{ 
                     background: "rgba(100, 116, 139, 0.1)", 
                     border: "1px solid rgba(100, 116, 139, 0.2)", 
                     borderRadius: "6px", 
                     padding: "8px",
                     textAlign: "center"
                   }}>
                     <div style={{ fontSize: "10px", color: "rgba(148, 163, 184, 0.8)" }}>离线设备</div>
                     <div style={{ fontSize: "14px", fontWeight: "bold", color: "#94a3b8" }}>
                        {dbDevices.length - dbDevices.filter(d => d.is_online).length}
                     </div>
                   </div>
                 </div>
              </div>
            </CyberPanel>

            {/* 左下：围栏分类 */}
            <CyberPanel title="区域电子围栏分类" style={{ flex: 1 }}>
              <ReactECharts
                option={fenceOption}
                style={{ width: "100%", height: "100%" }}
              />
            </CyberPanel>
          </div>

          {/* ---- 中间地图区 ---- */}
          <div style={S.centerCol}>
            {/* 地图悬浮标题 */}
            <div style={S.mapTitle}>
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#10b981",
                  marginRight: 8,
                  animation: "status-dot 2s infinite",
                  color: "#10b981",
                }}
              />
              全国部署态势
            </div>
            {/* 地图科技角标 */}
            <div style={{ ...S.mapCorner, top: 0, left: 0, borderTop: "2px solid rgba(96,165,250,0.4)", borderLeft: "2px solid rgba(96,165,250,0.4)" }} />
            <div style={{ ...S.mapCorner, top: 0, right: 0, borderTop: "2px solid rgba(96,165,250,0.4)", borderRight: "2px solid rgba(96,165,250,0.4)" }} />
            <div style={{ ...S.mapCorner, bottom: 0, left: 0, borderBottom: "2px solid rgba(96,165,250,0.4)", borderLeft: "2px solid rgba(96,165,250,0.4)" }} />
            <div style={{ ...S.mapCorner, bottom: 0, right: 0, borderBottom: "2px solid rgba(96,165,250,0.4)", borderRight: "2px solid rgba(96,165,250,0.4)" }} />
            <ReactECharts
              option={mapOption}
              style={{ width: "100%", height: "100%", zIndex: 1 }}
              notMerge
              lazyUpdate
            />
          </div>

          {/* ---- 右侧栏 ---- */}
          <div style={S.sideCol}>
            {/* 右上：实时预警 */}
            <CyberPanel title="实时预警动态" style={{ flex: "0 0 240px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  height: "100%",
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {alarms.length > 0 ? (
                  alarms.map((a) => (
                    <div
                      key={a.id}
                      className="cyber-alarm-card"
                      style={{
                        background: sevBg(a.severity),
                        border: "1px solid " + sevColor(a.severity) + "30",
                        padding: "8px 12px",
                        borderRadius: 6,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        borderLeft: "3px solid " + sevColor(a.severity),
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            color: sevColor(a.severity),
                            fontWeight: "bold",
                            fontSize: 12,
                          }}
                        >
                          [{a.alarm_type}]
                        </span>
                        <span style={{ color: "#64748b", fontSize: 10 }}>
                          {a.timestamp?.split(" ")[1] || ""}
                        </span>
                      </div>
                      <div
                        style={{
                          color: "#cbd5e1",
                          fontSize: 11,
                          lineHeight: 1.4,
                        }}
                      >
                        {a.description} · {a.branch_name}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color:
                              a.status === "resolved"
                                ? "#10b981"
                                : "#f87171",
                            background:
                              a.status === "resolved"
                                ? "rgba(16,185,129,0.1)"
                                : "rgba(248,113,113,0.1)",
                            border: a.status === "resolved" ? "1px solid #10b981" : "1px solid #f87171",
                            padding: "1px 8px",
                            borderRadius: 10,
                          }}
                        >
                          {a.status === "resolved" ? "已处理" : "未处理"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ ...S.emptyText, color: "#10b981", marginTop: 50 }}>
                    当前全网无活动告警
                  </div>
                )}
              </div>
            </CyberPanel>

            {/* 右中：人员管理 */}
            <CyberPanel title="劳务人员管理" style={{ flex: 1 }}>
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 14,
                  textAlign: "right",
                  zIndex: 10,
                }}
              >
                <div style={{ color: "#64748b", fontSize: 11 }}>今日出勤</div>
                <GlowNumber
                  value={
                    currentProject
                      ? currentProject.userCount
                      : projects.reduce((a, p) => a + p.userCount, 0)
                  }
                  color="#0ea5e9"
                  size={26}
                />
              </div>
              <ReactECharts
                option={userOption}
                style={{ width: "100%", height: "100%" }}
              />
            </CyberPanel>

            {/* 右下：健康度 */}
            <CyberPanel title="全网组织健康度" style={{ flex: 1 }}>
              <ReactECharts
                option={healthOption}
                style={{ width: "100%", height: "100%" }}
              />
            </CyberPanel>
          </div>
        </div>

        {/* ====== 底部状态栏 ====== */}
        <div style={S.bottomBar}>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "inline-block",
                  animation: "status-dot 2s infinite",
                  color: "#10b981",
                }}
              />
              <span style={{ color: "#64748b", fontSize: 11 }}>系统运行中</span>
            </span>
            <span style={{ color: "#334155" }}>|</span>
            <span style={{ color: "#64748b", fontSize: 11 }}>
              数据已同步 · {branches.length} 个分支机构 · {projects.length} 个项目
            </span>
          </div>
          <LiveClock />
        </div>
      </div>
    </div>
  );
}

// ==================================================================
// 样式
// ==================================================================
const S: Record<string, React.CSSProperties> = {
  page: {
    height: "100%",
    width: "100%",
    background:
      "linear-gradient(180deg, #041235 0%, #0b1f52 50%, #05143a 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  gridBg: {
    position: "absolute",
    inset: 0,
    backgroundSize: "40px 40px",
    backgroundImage:
      "linear-gradient(to right, rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(59,130,246,0.04) 1px, transparent 1px)",
    pointerEvents: "none",
    zIndex: 0,
  },
  radialGlow: {
    position: "absolute",
    top: "30%",
    left: "50%",
    width: "70vw",
    height: "70vh",
    transform: "translate(-50%, -50%)",
    background:
      "radial-gradient(ellipse, rgba(59,130,246,0.1) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: 120,
    background:
      "linear-gradient(180deg, transparent 0%, rgba(59,130,246,0.04) 50%, transparent 100%)",
    animation: "cyber-scan 8s linear infinite",
    pointerEvents: "none",
    zIndex: 0,
  },
  container: {
    padding: "16px 24px 8px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 0,
    position: "relative",
    zIndex: 1,
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(12, 35, 80, 0.75)",
    border: "1px solid rgba(96, 165, 250, 0.2)",
    boxShadow:
      "0 2px 20px rgba(59, 130, 246, 0.15), inset 0 -1px 0 rgba(96,165,250,0.1)",
    backdropFilter: "blur(12px)",
    borderRadius: 40,
    padding: "6px 0",
    zIndex: 50,
    position: "relative",
  },
  decoLineLeft: {
    flex: 1,
    height: 1,
    marginLeft: 12,
    background:
      "linear-gradient(90deg, transparent 0%, rgba(96,165,250,0.5) 100%)",
  },
  decoLineRight: {
    flex: 1,
    height: 1,
    marginRight: 12,
    background:
      "linear-gradient(90deg, rgba(96,165,250,0.5) 0%, transparent 100%)",
  },
  filterGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  filterLabel: {
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 1,
  },
  selectBox: {
    background: "rgba(15, 35, 75, 0.9)",
    border: "1px solid rgba(59, 130, 246, 0.35)",
    color: "#e0f2fe",
    padding: "5px 14px",
    borderRadius: 6,
    outline: "none",
    cursor: "pointer",
    fontSize: 13,
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  divider: {
    width: 1,
    height: 20,
    background:
      "linear-gradient(180deg, transparent, rgba(96,165,250,0.5), transparent)",
  },
  mainGrid: {
    display: "flex",
    flex: 1,
    gap: 20,
    marginTop: 16,
    paddingBottom: 8,
    alignItems: "stretch",
  },
  sideCol: {
    flex: "0 0 340px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    height: "100%",
    zIndex: 10,
  },
  centerCol: {
    flex: 1,
    position: "relative",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mapTitle: {
    position: "absolute",
    top: 8,
    left: "50%",
    transform: "translateX(-50%)",
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 3,
    textShadow: "0 0 10px rgba(96,165,250,0.5)",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
  },
  mapCorner: {
    position: "absolute",
    width: 24,
    height: 24,
    pointerEvents: "none",
    zIndex: 10,
    animation: "corner-pulse 4s ease-in-out infinite",
  },
  bottomBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 20px",
    borderTop: "1px solid rgba(59,130,246,0.1)",
    marginTop: 4,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  labelGray: {
    color: "#64748b",
    fontSize: 13,
  },
  emptyText: {
    color: "#475569",
    textAlign: "center",
    marginTop: 40,
    fontSize: 13,
  },
};
