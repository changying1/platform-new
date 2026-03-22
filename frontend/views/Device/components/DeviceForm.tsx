import React, { useState, useEffect } from "react";
import { Save, X, Cpu, Globe, Hash, Shield } from "lucide-react";
import { ApiDevice } from "../../../src/api/deviceApi";

interface DeviceFormProps {
  initialData?: ApiDevice | null;
  onSave: (data: Partial<ApiDevice>) => Promise<any>;
  onCancel: () => void;
}

export const DeviceForm: React.FC<DeviceFormProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [form, setForm] = useState<Partial<ApiDevice>>({
    id: "",
    device_name: "",
    device_type: "HELMET_CAM",
    ip_address: "",
    port: 8000,
    stream_url: "",
    is_online: true,
  });

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(form);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Cpu size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {initialData ? "编辑设备" : "添加新设备"}
              </h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Device Configuration
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-all border border-transparent hover:border-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Hash size={12} className="text-blue-500" /> 设备 ID (唯一标识)
              </label>
              <input
                disabled={!!initialData}
                type="text"
                required
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all disabled:opacity-50 font-mono"
                placeholder="例如: DEV-0001"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                设备名称
              </label>
              <input
                type="text"
                required
                value={form.device_name}
                onChange={(e) =>
                  setForm({ ...form, device_name: e.target.value })
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all"
                placeholder="请输入设备显示名称"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                设备类型
              </label>
              <select
                value={form.device_type}
                onChange={(e) =>
                  setForm({ ...form, device_type: e.target.value })
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all cursor-pointer"
              >
                <option value="HELMET_CAM">智能头盔 (HELMET_CAM)</option>
                <option value="PORTABLE_SPHERE">
                  便携球机 (PORTABLE_SPHERE)
                </option>
                <option value="OTHER">其他设备</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                在线状态
              </label>
              <select
                value={form.is_online ? "true" : "false"}
                onChange={(e) =>
                  setForm({ ...form, is_online: e.target.value === "true" })
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all cursor-pointer"
              >
                <option value="true">在线 (Online)</option>
                <option value="false">离线 (Offline)</option>
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Globe size={12} className="text-blue-500" /> IP 地址
              </label>
              <input
                type="text"
                required
                value={form.ip_address}
                onChange={(e) =>
                  setForm({ ...form, ip_address: e.target.value })
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-mono"
                placeholder="192.168.1.101"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                端口号
              </label>
              <input
                type="number"
                required
                value={form.port}
                onChange={(e) =>
                  setForm({ ...form, port: parseInt(e.target.value) || 8000 })
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-mono"
                placeholder="8000"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                流媒体地址 (RTSP/RTMP)
              </label>
              <input
                type="text"
                value={form.stream_url || ""}
                onChange={(e) =>
                  setForm({ ...form, stream_url: e.target.value })
                }
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all font-mono"
                placeholder="rtsp://admin:password@ip:port/stream"
              />
            </div>
          </div>

          <div className="pt-6 flex gap-3">
            <button
              type="submit"
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]"
            >
              <Save size={18} /> {initialData ? "保存修改" : "立即创建"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-8 py-3.5 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-xl font-bold transition-all"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
