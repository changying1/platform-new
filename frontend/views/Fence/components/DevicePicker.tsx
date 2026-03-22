import React from "react";
import { X, User, Check, Users } from "lucide-react";
import { FenceDevice } from "../types";

interface DevicePickerProps {
  devices: FenceDevice[];
  selectedIds: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}

export const DevicePicker: React.FC<DevicePickerProps> = ({
  devices,
  selectedIds,
  onClose,
  onConfirm,
}) => {
  const [tempIds, setTempIds] = React.useState<string[]>(selectedIds);

  const toggleDevice = (id: string) => {
    setTempIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-black/40 animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-[#1f4fa8]/95 to-[#123a85]/95 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-cyan-200/35 animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-cyan-200/20 flex justify-between items-center bg-gradient-to-r from-[#2a67c6]/35 to-[#1b4d9d]/20">
          <div>
            <h3 className="text-2xl font-bold text-slate-100">绑定受控人员</h3>
            <p className="text-sm text-slate-400 mt-1">选择需要受到此围栏监控的移动端设备或人员</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-2xl transition-all">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto fence-cyber-scroll">
          <div className="flex items-center gap-3 p-4 bg-cyan-500/10 text-cyan-200 rounded-2xl mb-6 border border-cyan-300/20 shadow-inner">
            <Users size={20} />
            <span className="font-semibold">已选人员: {tempIds.length} 位</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {devices.map((device) => {
              const isSelected = tempIds.includes(device.id);
              return (
                <div
                  key={device.id}
                  onClick={() => toggleDevice(device.id)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? "bg-cyan-500/12 border-cyan-300/60 shadow-md ring-1 ring-cyan-300/20"
                      : "border-cyan-200/20 hover:border-cyan-200/45 hover:bg-[#10408b]/70"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                        isSelected ? "bg-cyan-400 text-slate-950" : "bg-[#0f326f]/85 text-cyan-100/70"
                      }`}
                    >
                      <User size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-100">{device.name}</div>
                      <div className="text-xs text-cyan-100/65">{device.dept}</div>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-cyan-400 border-cyan-400 text-slate-950 scale-110"
                        : "border-slate-600 group-hover:border-cyan-300"
                    }`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-8 bg-[#123a85]/92 border-t border-cyan-200/20 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 font-bold text-slate-300 hover:bg-slate-800 rounded-2xl transition-all"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(tempIds)}
            className="flex-1 py-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-2xl shadow-lg shadow-cyan-900/50 transition-all active:scale-95"
          >
            确认选择
          </button>
        </div>
      </div>
    </div>
  );
};
