import React from "react";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  Shield, 
  Users, 
  Clock, 
  FileText,
  MousePointer2
} from "lucide-react";
import { FenceData, ProjectRegionData } from "../types";
import { ViewMode } from "../hooks/useFenceLogic";

interface SidebarProps {
  fences: FenceData[];
  regions: ProjectRegionData[];
  selectedFence: FenceData | null;
  selectedRegion: ProjectRegionData | null;
  viewMode: ViewMode;
  onSelectFence: (f: FenceData) => void;
  onSelectRegion: (r: ProjectRegionData) => void;
  onCreateNew: () => void;
  onCreateRegion: () => void;
  onEdit: (f: FenceData) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onDeleteRegion: (id: string, e: React.MouseEvent) => void;
  onSwitchView: (mode: ViewMode) => void;
}

export const FenceSidebar: React.FC<SidebarProps> = ({
  fences,
  regions,
  selectedFence,
  selectedRegion,
  viewMode,
  onSelectFence,
  onSelectRegion,
  onCreateNew,
  onCreateRegion,
  onEdit,
  onDelete,
  onDeleteRegion,
  onSwitchView
}) => {
  return (
    <div className="w-[400px] h-full bg-gradient-to-b from-[#1f4fa8]/95 to-[#123a85]/95 border-r border-cyan-200/35 flex flex-col shadow-xl z-10 backdrop-blur-md">
      <div className="p-6 border-b border-cyan-200/30 bg-gradient-to-r from-[#2a67c6]/40 to-[#1b4d9d]/20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-sky-200 to-blue-200 tracking-wide">
            电子围栏管理
          </h1>
          <button
            onClick={viewMode === "region_list" ? onCreateRegion : onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl transition-all shadow-lg shadow-cyan-900/40 active:scale-95 font-semibold"
          >
            <Plus size={18} />
            <span className="font-semibold">{viewMode === "region_list" ? "新建区域" : "新建围栏"}</span>
          </button>
        </div>

        <div className="flex p-1 bg-[#0f326f]/80 rounded-xl mb-4 border border-cyan-200/30">
          <button
            onClick={() => onSwitchView("list")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              viewMode === "list" || viewMode === "create" || viewMode === "edit"
                ? "bg-cyan-300/20 text-cyan-100 shadow-sm"
                : "text-blue-100/70 hover:text-cyan-100"
            }`}
          >
            围栏列表
          </button>
          <button
            onClick={() => onSwitchView("region_list")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              viewMode === "region_list" || viewMode === "region_create"
                ? "bg-cyan-300/20 text-cyan-100 shadow-sm"
                : "text-blue-100/70 hover:text-cyan-100"
            }`}
          >
            项目区域
          </button>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-200/55 group-focus-within:text-cyan-100 transition-colors" size={18} />
          <input
            type="text"
            placeholder="搜索名称 / 备注..."
            className="w-full pl-10 pr-4 py-3 bg-[#0f326f]/85 border border-cyan-200/35 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-300/30 focus:border-cyan-200 transition-all text-sm text-slate-100 placeholder-cyan-100/45"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 fence-cyber-scroll">
        {viewMode === "region_list" ? (
          regions.map(region => (
            <div
              key={region.id}
              onClick={() => onSelectRegion(region)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                selectedRegion?.id === region.id
                  ? "bg-cyan-500/14 border-cyan-300/60 shadow-md ring-1 ring-cyan-300/25"
                  : "bg-[#103776]/75 border-cyan-200/20 hover:border-cyan-200/45 hover:shadow-sm"
              }`}
            >
               <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${selectedRegion?.id === region.id ? 'bg-cyan-400 text-slate-950' : 'bg-cyan-500/20 text-cyan-300'}`}>
                    <Shield size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100">{region.name}</h3>
                    <p className="text-xs text-slate-400">项目区域</p>
                  </div>
                </div>
                <button
                  onClick={(e) => onDeleteRegion(region.id, e)}
                  className="p-2 text-slate-500 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-xs text-cyan-100/65 line-clamp-2">{region.remark || "暂无描述"}</p>
            </div>
          ))
        ) : (
          fences.map(fence => (
            <div
              key={fence.id}
              onClick={() => onSelectFence(fence)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                selectedFence?.id === fence.id
                  ? "bg-cyan-500/14 border-cyan-300/60 shadow-md ring-1 ring-cyan-300/25"
                  : "bg-[#103776]/75 border-cyan-200/20 hover:border-cyan-200/45 hover:shadow-sm"
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${selectedFence?.id === fence.id ? 'bg-cyan-400 text-slate-950' : 'bg-cyan-500/20 text-cyan-300'}`}>
                    <Shield size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100">{fence.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      fence.behavior === "No Entry" ? "bg-rose-500/20 text-rose-200 border border-rose-300/30" : "bg-cyan-500/20 text-cyan-200 border border-cyan-300/30"
                    }`}>
                      {fence.behavior === "No Entry" ? "禁止进入" : "禁止离开"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(fence); }}
                    className="p-2 text-slate-500 hover:text-cyan-300 hover:bg-cyan-500/15 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={(e) => onDelete(fence.id, e)}
                    className="p-2 text-slate-500 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2 text-cyan-100/90 invisible">
                  <Users size={14} className="text-cyan-300" />
                  <span className="text-xs">{fence.deviceIds.length} 位人员</span>
                </div>
                <div className="flex items-center gap-2 text-cyan-100/90">
                  <Clock size={14} className="text-cyan-300" />
                  <span className="text-xs">{fence.startTime}-{fence.endTime}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2 bg-[#0f326f]/80 rounded-xl border border-cyan-200/25">
                <div className="text-xs text-cyan-100/65">实时违规</div>
                <div className={`text-sm font-bold ${fence.workerCount > 0 ? 'text-rose-300 animate-pulse' : 'text-emerald-300'}`}>
                  {fence.workerCount} 人
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
