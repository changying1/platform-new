import React from "react";
import { AlertTriangle, Search, ChevronDown, MapPin } from "lucide-react";
import { AlarmRecord } from "../types";

export interface ProjectSearchOption {
  id: number;
  name: string;
}

export interface RegionSearchOption {
  id: string;
  name: string;
  remark?: string;
}

export const AlarmOverlay: React.FC<{ alarms: AlarmRecord[] }> = ({ alarms }) => {
  if (alarms.length === 0) return null;
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
      <div className="w-[600px] space-y-4 pointer-events-auto">
        {alarms.map((alarm) => (
          <div 
            key={alarm.id} 
            className="bg-gradient-to-br from-[#1f4fa8]/98 to-[#123a85]/98 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_0_50px_rgba(244,63,94,0.3)] border-2 border-rose-500/50 border-l-[12px] border-l-rose-500 animate-in zoom-in-95 duration-300 relative overflow-hidden"
          >
            {/* 装饰性背景发光 */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-rose-500/10 rounded-full blur-[80px]" />
            <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px]" />

            <div className="relative z-10 flex items-center gap-6">
              <div className="p-5 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                <AlertTriangle size={48} className="animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-black text-rose-400 uppercase tracking-[0.2em] drop-shadow-sm">
                    ⚠️ 电子围栏实时预警
                  </span>
                  <span className="text-sm font-mono text-cyan-200/70 bg-slate-900/50 px-3 py-1 rounded-full border border-cyan-500/20">
                    {alarm.time}
                  </span>
                </div>
                <p className="text-3xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                  {alarm.msg}
                </p>
                <div className="mt-4 flex items-center gap-2">
                   <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 animate-[progress_5s_linear_infinite]" style={{ width: '100%' }} />
                   </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export const MapControls: React.FC<{ mapReady: boolean }> = ({ mapReady }) => {
  return (
    <div className="absolute left-6 top-6 flex flex-col gap-3 pointer-events-none">
      <div className="p-3 bg-gradient-to-r from-[#245dc0]/95 via-[#1d52b0]/95 to-[#18479e]/95 backdrop-blur rounded-2xl shadow-[0_8px_24px_rgba(18,58,133,0.45)] border border-cyan-200/45 flex gap-4 items-center pointer-events-auto">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${mapReady ? 'bg-cyan-200/22 text-cyan-50 border border-cyan-100/55 shadow-[inset_0_0_12px_rgba(125,211,252,0.25)]' : 'bg-[#113a82]/88 text-cyan-100/75 border border-cyan-200/30'}`}>
          <div className={`w-2 h-2 rounded-full ${mapReady ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-sm font-bold">{mapReady ? '地图已就绪' : '地图加载中'}</span>
        </div>
        <div className="h-4 w-px bg-cyan-100/35" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-cyan-50 font-medium">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> 禁止进入
          </div>
          <div className="flex items-center gap-1.5 text-xs text-cyan-50 font-medium">
            <div className="w-2.5 h-2.5 rounded-full bg-[#06b6d4]" /> 禁止离开
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProjectSearchBarProps {
  query: string;
  loading: boolean;
  options: ProjectSearchOption[];
  regions: RegionSearchOption[];
  isOpen: boolean;
  onQueryChange: (value: string) => void;
  onPickProject: (project: ProjectSearchOption) => void;
  onPickRegion: (region: RegionSearchOption) => void;
  onClose: () => void;
}

export const ProjectSearchBar: React.FC<ProjectSearchBarProps> = ({
  query,
  loading,
  options,
  regions,
  isOpen,
  onQueryChange,
  onPickProject,
  onPickRegion,
  onClose,
}) => {
  return (
    <div className="absolute left-1/2 top-6 z-40 w-[520px] -translate-x-1/2 pointer-events-auto flex gap-3 items-start justify-center">
      <div className="flex-1 bg-gradient-to-r from-[#1f4fa8]/95 to-[#17428f]/95 backdrop-blur-md shadow-2xl border border-cyan-200/35 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-300/20 text-cyan-100 border border-cyan-200/35">
            <Search size={18} />
          </div>
          <div className="flex-1">
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="搜索项目名称"
              className="w-full bg-transparent text-sm font-medium text-slate-100 placeholder:text-cyan-100/50 focus:outline-none"
            />
            <p className="text-[11px] text-cyan-100/65">支持模糊搜索，回车或点击项目可展开区域</p>
          </div>
          <div className="text-xs text-cyan-100/65">{loading ? "搜索中" : `${options.length} 项`}</div>
        </div>

        {isOpen && (options.length > 0 || regions.length > 0) && (
          <div className="border-t border-cyan-200/25 bg-[#16428e]/92">
            {options.length > 0 && (
              <div className="px-4 py-3 border-b border-cyan-300/15">
                <div className="flex items-center gap-2 text-xs text-cyan-100/75 uppercase tracking-wider">
                  <ChevronDown size={14} /> 项目列表
                </div>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto fence-cyber-scroll">
                  {options.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => onPickProject(project)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-300/15 transition-colors text-sm font-medium text-slate-100"
                    >
                      {project.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-cyan-100/75 uppercase tracking-wider">
                <MapPin size={14} /> 项目区域
              </div>
              {regions.length === 0 ? (
                <p className="mt-2 text-xs text-cyan-100/70">暂无项目区域，请先选择项目</p>
              ) : (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto fence-cyber-scroll">
                  {regions.map((region) => (
                    <button
                      key={region.id}
                      onClick={() => onPickRegion(region)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-cyan-500/15 transition-colors"
                    >
                      <div className="text-sm font-medium text-slate-100">{region.name}</div>
                      {region.remark && (
                        <div className="text-[11px] text-cyan-100/65 line-clamp-1">{region.remark}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-cyan-300/15">
                <button
                  onClick={onClose}
                  className="text-xs text-cyan-100/80 hover:text-cyan-100 font-medium transition-colors"
                >
                  收起搜索结果
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const DeviceJumpMenu: React.FC<{ 
  devices: any[], 
  onJump: (device: any) => void 
}> = ({ devices, onJump }) => {
  const [open, setOpen] = React.useState(false);
  
  return (
    <div className="absolute right-6 top-6 z-40 pointer-events-auto">
      <div className="relative">
        <button 
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1f4fa8]/95 to-[#17428f]/95 backdrop-blur-md shadow-xl border border-cyan-200/35 rounded-2xl transition-all"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-bold text-slate-100">在线设备 ({devices.filter(d => d.status === 'online').length})</span>
          <ChevronDown size={14} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 mt-3 w-64 bg-gradient-to-b from-[#1f4fa8]/95 to-[#123a85]/95 backdrop-blur-md shadow-2xl border border-cyan-200/35 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            <div className="p-2 space-y-1 max-h-80 overflow-y-auto fence-cyber-scroll">
              {devices.length === 0 ? (
                <div className="p-4 text-center text-xs text-cyan-100/70">暂无设备数据</div>
              ) : (
                devices.map(device => (
                  <button
                    key={device.id}
                    onClick={() => { onJump(device); setOpen(false); }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-cyan-500/15 transition-colors group text-left"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="text-sm font-bold text-slate-100 line-clamp-1 group-hover:text-cyan-300 transition-colors">
                        {device.name}
                      </div>
                      <div className="text-[10px] text-cyan-100/65 font-mono tracking-wider">
                        {device.id}
                      </div>
                    </div>
                    {device.status === 'online' && (
                      <div className="px-2 py-0.5 bg-emerald-500/15 text-emerald-200 border border-emerald-300/25 rounded-md text-[9px] font-black uppercase">
                        Active
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
