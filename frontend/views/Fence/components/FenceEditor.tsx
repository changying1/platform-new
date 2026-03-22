import React from "react";
import { 
  X, 
  Save, 
  MousePointer2, 
  Shield, 
  Clock, 
  FileText,
  Users
} from "lucide-react";
import { FenceData, ProjectRegionData } from "../types";

interface EditorProps {
  formData: Partial<FenceData>;
  regions: ProjectRegionData[];
  onClose: () => void;
  onSave: () => void;
  onChange: (data: Partial<FenceData>) => void;
  onPickCenter: () => void;
  onShowDeviceModal: () => void;
  isEdit: boolean;
}

export const FenceEditor: React.FC<EditorProps> = ({
  formData,
  regions,
  onClose,
  onSave,
  onChange,
  onPickCenter,
  onShowDeviceModal,
  isEdit
}) => {
  return (
    <div className="absolute right-6 top-6 w-[420px] bg-gradient-to-b from-[#1f4fa8]/95 to-[#123a85]/95 rounded-3xl shadow-2xl border border-cyan-200/35 overflow-hidden z-20 animate-in slide-in-from-right duration-300 backdrop-blur-md">
      <div className="p-6 border-b border-cyan-200/25 flex justify-between items-center bg-gradient-to-r from-[#2a67c6]/35 to-[#1b4d9d]/20">
        <div>
          <h2 className="text-xl font-bold text-slate-100">{isEdit ? "编辑电子围栏" : "创建电子围栏"}</h2>
          <p className="text-xs text-slate-400 mt-1">配置空间围栏及触发布置规则</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-300 hover:text-slate-100"><X size={20}/></button>
      </div>

      <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto fence-cyber-scroll">
        {/* 基本信息 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-300 mb-2">
            <span className="w-1 h-4 bg-cyan-300 rounded-full"></span>
            基本设置
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <FileText size={14}/> 围栏名称
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="w-full px-4 py-3 bg-[#0f326f]/85 border border-cyan-200/35 rounded-xl focus:ring-2 focus:ring-cyan-300/30 focus:border-cyan-200 outline-none transition-all text-sm text-slate-100"
              placeholder="请输入围栏名称"
            />
          </div>

          <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Shield size={14}/> 所属项目区域 (可选)
              </label>
              <select
                value={formData.projectRegionId || ""}
                onChange={(e) => onChange({ projectRegionId: e.target.value || undefined })}
                className="w-full px-4 py-3 bg-[#0f326f]/85 border border-cyan-200/35 rounded-xl focus:ring-2 focus:ring-cyan-300/30 focus:border-cyan-200 outline-none transition-all text-sm text-slate-100"
              >
                <option value="">独立围栏 (不绑定区域)</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
          </div>
        </section>

        {/* 空间与规则 */}
        <section className="space-y-4 pt-4 border-t border-cyan-300/20">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-300 mb-2">
            <span className="w-1 h-4 bg-cyan-300 rounded-full"></span>
            空间与触发规则
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">围栏形状</label>
              <div className="flex p-1 bg-[#0f326f]/80 rounded-xl border border-cyan-200/30">
                {(["Circle", "Polygon"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => onChange({ type: t })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      formData.type === t ? "bg-cyan-500/15 text-cyan-200 shadow-sm" : "text-slate-400"
                    }`}
                  >
                    {t === "Circle" ? "圆形" : "多边形"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">触发行为</label>
              <div className="flex p-1 bg-[#0f326f]/80 rounded-xl border border-cyan-200/30">
                {(["No Entry", "No Exit"] as const).map(b => (
                  <button
                    key={b}
                    onClick={() => onChange({ behavior: b })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      formData.behavior === b ? "bg-cyan-500/15 text-cyan-200 shadow-sm" : "text-slate-400"
                    }`}
                  >
                    {b === "No Entry" ? "禁入" : "禁出"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {formData.type === "Circle" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">围栏半径 (米)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={formData.radius || 100}
                  onChange={(e) => onChange({ radius: parseInt(e.target.value) })}
                  className="flex-1 accent-cyan-400 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="number"
                  value={formData.radius || 100}
                  onChange={(e) => onChange({ radius: parseInt(e.target.value) || 0 })}
                  className="w-20 px-2 py-1 text-center bg-[#0f326f]/85 border border-cyan-200/35 rounded-lg text-sm font-bold text-cyan-100"
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-300">
                {formData.type === "Circle" ? "围栏圆心" : `多边形顶点 (${formData.points?.length || 0})`}
              </label>
              {(formData.center || (formData.points && formData.points.length > 0)) && (
                <button 
                  onClick={() => onChange(formData.type === "Circle" ? { center: undefined } : { points: [] })}
                  className="text-[10px] text-rose-300 hover:underline"
                >
                  重新绘制
                </button>
              )}
            </div>
            
            {!formData.center && formData.type === "Circle" && (
              <button
                onClick={onPickCenter}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500/10 text-cyan-200 border border-cyan-300/25 rounded-2xl hover:bg-cyan-500/20 transition-all font-semibold active:scale-95"
              >
                <MousePointer2 size={18} />
                点击地图选择圆心
              </button>
            )}

            {formData.center && formData.type === "Circle" && (
              <div className="p-3 bg-[#0f326f]/85 border border-cyan-200/30 rounded-xl text-xs text-cyan-100 flex justify-between items-center">
                <span>纬度: {formData.center[0].toFixed(6)}, 经度: {formData.center[1].toFixed(6)}</span>
                <span className="text-emerald-300 font-bold">已就绪</span>
              </div>
            )}

            {formData.type === "Polygon" && (
              <button
                onClick={onPickCenter}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500/10 text-cyan-200 border border-cyan-300/25 rounded-2xl hover:bg-cyan-500/20 transition-all font-semibold active:scale-95"
              >
                <MousePointer2 size={18} />
                {formData.points && formData.points.length > 0 ? "继续添加顶点" : "在地图上点击绘制"}
              </button>
            )}
          </div>
        </section>

        {/* 生效时间与报警等级 */}
        <section className="space-y-4 pt-4 border-t border-cyan-300/20">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-300 mb-2">
            <span className="w-1 h-4 bg-cyan-300 rounded-full"></span>
            策略配置
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Clock size={14}/> 开始时间
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => onChange({ startTime: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f326f]/85 border border-cyan-200/35 rounded-xl focus:ring-2 focus:ring-cyan-300/30 focus:border-cyan-200 outline-none transition-all text-sm text-slate-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Clock size={14}/> 结束时间
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => onChange({ endTime: e.target.value })}
                className="w-full px-4 py-2 bg-[#0f326f]/85 border border-cyan-200/35 rounded-xl focus:ring-2 focus:ring-cyan-300/30 focus:border-cyan-200 outline-none transition-all text-sm text-slate-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-300">报警严重程度</label>
            <div className="flex p-1 bg-[#0f326f]/80 rounded-xl border border-cyan-200/30">
              {(["High", "Medium", "Low"] as const).map(l => (
                <button
                  key={l}
                  onClick={() => onChange({ level: l })}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                    formData.level === l 
                      ? l === "High" ? "bg-rose-500 text-white shadow-lg" : 
                        l === "Medium" ? "bg-amber-500 text-white shadow-lg" : 
                        "bg-cyan-500 text-slate-950 shadow-lg"
                      : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {l === "High" ? "紧急" : l === "Medium" ? "一般" : "低"}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 hidden">
            <button
               onClick={onShowDeviceModal}
               className="w-full flex items-center justify-between gap-2 px-4 py-4 bg-[#0f326f]/85 border border-dashed border-cyan-200/35 text-cyan-100 rounded-2xl hover:bg-[#10408b] hover:border-cyan-200/50 hover:text-cyan-50 transition-all text-sm"
            >
              <div className="flex items-center gap-2 font-semibold">
                <Users size={18} />
                绑定受控人员
              </div>
              <span className="px-3 py-1 bg-cyan-500/15 text-cyan-200 border border-cyan-300/30 rounded-full text-[10px] font-bold">
                已选 {formData.deviceIds?.length || 0}
              </span>
            </button>
          </div>
        </section>
      </div>

      <div className="p-6 bg-[#123a85]/92 border-t border-cyan-200/25 flex gap-4">
        <button
          onClick={onClose}
          className="flex-1 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800 rounded-2xl transition-all"
        >
          取消
        </button>
        <button
          onClick={onSave}
          className="flex-[2] py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-2xl shadow-lg shadow-cyan-900/50 font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Save size={18} />
          {isEdit ? "更新围栏" : "保存围栏"}
        </button>
      </div>
    </div>
  );
};
