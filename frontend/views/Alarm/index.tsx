import React, { useEffect, useState } from "react";
import { AlarmStats } from "./components/AlarmStats";
import { AlarmFilterBar } from "./components/AlarmFilterBar";
import { AlarmTable } from "./components/AlarmTable";
import { AlarmLive } from "./components/AlarmLive";
import { CyberPanel } from "./components/CyberPanel";
import {
  AlarmTrendChart,
  AlarmTypeDonut,
  AlarmLevelRose,
  DeviceTop5Bar,
  ResolveRateGauge,
} from "./components/AlarmCharts";
import { useAlarms } from "./hooks/useAlarms";

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

// ------------------------------------------------------------------
// 主页面
// ------------------------------------------------------------------
export default function AlarmRecords() {
  const {
    alarms,
    stats,
    chartData,
    statusFilter,
    setStatusFilter,
    levelFilter,
    setLevelFilter,
    searchTerm,
    setSearchTerm,
    projectFilter,
    setProjectFilter,
    actions,
  } = useAlarms();

  // 获取项目列表
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const headers: Record<string, string> = {
          "x-role": (localStorage.getItem("role") || "HQ").toUpperCase(),
          "x-department-id": localStorage.getItem("department_id") || "",
          "x-username": localStorage.getItem("username") || "",
        };
        const res = await fetch("/api/dashboard/summary", { headers });
        if (res.ok) {
          const data = await res.json();
          setProjects(
            Array.isArray(data)
              ? data.map((p: any) => ({ id: p.id, name: p.name }))
              : []
          );
        }
      } catch (e) {
        console.error("Failed to fetch projects:", e);
      }
    })();
  }, []);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ====== 背景层 ====== */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(59,130,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ====== 顶栏 ====== */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid rgba(59,130,246,0.15)",
          background: "rgba(8,20,46,0.6)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 3,
              height: 20,
              background: "linear-gradient(180deg, #60a5fa, #3b82f6)",
              borderRadius: 2,
            }}
          />
          <span
            style={{
              color: "#e0f2fe",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 2,
              textShadow: "0 0 8px rgba(96,165,250,0.6)",
            }}
          >
            报警管理中心
          </span>
          <div
            style={{
              width: 1,
              height: 18,
              background: "rgba(59,130,246,0.3)",
              margin: "0 4px",
            }}
          />
          <AlarmFilterBar
            status={statusFilter}
            level={levelFilter}
            searchTerm={searchTerm}
            projectId={projectFilter}
            projects={projects}
            onStatusChange={setStatusFilter}
            onLevelChange={setLevelFilter}
            onSearchChange={setSearchTerm}
            onProjectChange={setProjectFilter}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600 }}>
              实时监控
            </span>
          </div>
          <LiveClock />
        </div>
      </div>

      {/* ====== 三列主体 ====== */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 2fr 1fr",
          gap: 10,
          padding: 10,
          overflow: "hidden",
        }}
      >
        {/* ---- 左列 ---- */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            overflow: "hidden",
          }}
        >
          {/* 今日概览 */}
          <CyberPanel title="今日概览" style={{ flex: "0 0 auto" }}>
            <AlarmStats
              total={stats.total}
              pending={stats.pending}
              resolved={stats.resolved}
              high={stats.high}
            />
          </CyberPanel>

          {/* 报警级别分布 */}
          <CyberPanel title="报警级别分布" style={{ flex: 1, minHeight: 0 }}>
            <AlarmLevelRose data={chartData.levelDistribution} />
          </CyberPanel>

          {/* 设备报警 TOP5 */}
          <CyberPanel title="设备报警 TOP5" style={{ flex: 1, minHeight: 0 }}>
            <DeviceTop5Bar data={chartData.deviceTop5} />
          </CyberPanel>
        </div>

        {/* ---- 中列 ---- */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            overflow: "hidden",
          }}
        >
          {/* 报警趋势 */}
          <CyberPanel
            title="预报警趋势"
            style={{ flex: "0 0 240px" }}
            extra={
              <span
                style={{ color: "#64748b", fontSize: 11, fontWeight: 500 }}
              >
                近15天
              </span>
            }
          >
            <AlarmTrendChart data={chartData.trend} />
          </CyberPanel>

          {/* 报警列表 */}
          <CyberPanel
            title="报警记录明细"
            style={{ flex: 1, minHeight: 0 }}
            extra={
              <span
                style={{
                  color: "#60a5fa",
                  fontSize: 11,
                  fontWeight: 700,
                  background: "rgba(59,130,246,0.12)",
                  border: "1px solid rgba(59,130,246,0.25)",
                  borderRadius: 4,
                  padding: "2px 8px",
                }}
              >
                共 {alarms.length} 条
              </span>
            }
          >
            <AlarmTable
              alarms={alarms}
              onResolve={actions.resolve}
              onDelete={actions.delete}
              onUpdateLevel={actions.updateLevel}
            />
          </CyberPanel>
        </div>

        {/* ---- 右列 ---- */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            overflow: "hidden",
          }}
        >
          {/* 报警类型分布 */}
          <CyberPanel
            title="报警类型分布"
            style={{ flex: "0 0 260px" }}
            extra={
              <span style={{ color: "#64748b", fontSize: 11 }}>
                {chartData.typeDistribution.length} 类别
              </span>
            }
          >
            <AlarmTypeDonut
              data={chartData.typeDistribution}
              total={stats.total}
            />
          </CyberPanel>

          {/* 实时播报 */}
          <CyberPanel title="实时报警播报" style={{ flex: 1, minHeight: 0 }}>
            <AlarmLive alarms={chartData.latestAlarms} />
          </CyberPanel>

          {/* 处置效率 */}
          <CyberPanel title="处置效率" style={{ flex: "0 0 220px" }}>
            <ResolveRateGauge rate={chartData.resolveRate} />
          </CyberPanel>
        </div>
      </div>
    </div>
  );
}
