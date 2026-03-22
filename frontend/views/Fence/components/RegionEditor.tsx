import React from "react";
import { X, Save, MousePointer2, FileText } from "lucide-react";
import { ProjectRegionData } from "../types";

interface RegionEditorProps {
  formData: Partial<ProjectRegionData>;
  onClose: () => void;
  onSave: () => void;
  onChange: (data: Partial<ProjectRegionData>) => void;
}

export const RegionEditor: React.FC<RegionEditorProps> = ({
  formData,
  onClose,
  onSave,
  onChange,
}) => {
  return (
    <div className="absolute right-6 top-6 w-[400px] bg-gradient-to-b from-[#1f4fa8]/95 to-[#123a85]/95 rounded-3xl shadow-2xl border border-cyan-200/35 p-0 z-20 animate-in slide-in-from-right duration-300 overflow-hidden backdrop-blur-md">
      <div className="p-6 border-b border-cyan-200/25 flex justify-between items-center bg-gradient-to-r from-[#2a67c6]/35 to-[#1b4d9d]/20">
        <div>
          <h2 className="text-xl font-bold text-slate-100">新建项目区域</h2>
          <p className="text-xs text-slate-400 mt-1">定义工作面的地理边界</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-300 hover:text-slate-100">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <FileText size={14} /> 区域名称
          </label>
          <input
            type="text"
            placeholder="例如：1号地块施工区"
            value={formData.name || ""}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full px-4 py-3 bg-[#0f326f]/85 border border-cyan-200/35 rounded-xl focus:ring-2 focus:ring-cyan-300/30 focus:border-cyan-200 outline-none transition-all text-sm text-slate-100 placeholder-cyan-100/45"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">备注说明</label>
          <textarea
            placeholder="描述区域用途..."
            value={formData.remark || ""}
            onChange={(e) => onChange({ remark: e.target.value })}
            className="w-full px-4 py-3 bg-[#0f326f]/85 border border-cyan-200/35 rounded-xl focus:ring-2 focus:ring-cyan-300/30 focus:border-cyan-200 outline-none transition-all text-sm min-h-[100px] resize-none text-slate-100 placeholder-cyan-100/45"
          />
        </div>

        <div className="p-4 bg-cyan-500/10 border border-cyan-300/20 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-cyan-400 text-slate-950 rounded-lg">
            <MousePointer2 size={16} />
          </div>
          <div>
            <div className="text-sm font-bold text-cyan-200">绘制模式已开启</div>
            <p className="text-xs text-cyan-100/80 mt-0.5">请在地图上依次点击，连接成多边形区域。</p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-[#123a85]/92 border-t border-cyan-200/25">
        <button
          onClick={onSave}
          className="w-full py-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-2xl shadow-lg shadow-cyan-900/50 font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Save size={18} />
          保存项目区域
        </button>
      </div>
    </div>
  );
};
