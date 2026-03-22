import React from "react";
import {
  Trash2,
  Edit,
  Cpu,
  Wifi,
  WifiOff,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { ApiDevice } from "../../../src/api/deviceApi";

interface DeviceListProps {
  devices: ApiDevice[];
  onEdit: (device: ApiDevice) => void;
  onDelete: (id: string) => void;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto p-1">
      {devices.map((device) => (
        <div
          key={device.id}
          className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all group border-l-4"
          style={{ borderLeftColor: device.is_online ? "#22c55e" : "#94a3b8" }}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  device.is_online
                    ? "bg-green-50 text-green-600"
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                <Cpu size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  {device.device_name}
                </h3>
                <p className="text-[10px] font-mono text-gray-400">
                  {device.id}
                </p>
              </div>
            </div>
            <div
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                device.is_online
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {device.is_online ? <Wifi size={10} /> : <WifiOff size={10} />}
              {device.is_online ? "ONLINE" : "OFFLINE"}
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">IP 地址</span>
              <span className="text-gray-700 font-medium">
                {device.ip_address}:{device.port}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">设备类型</span>
              <span className="text-gray-700 font-medium">
                {device.device_type}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">最后位置</span>
              <span className="text-gray-700 font-medium flex items-center gap-1">
                <MapPin size={10} className="text-blue-500" />
                {device.last_latitude?.toFixed(4)},{" "}
                {device.last_longitude?.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(device)}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all"
            >
              <Edit size={14} /> 编辑
            </button>
            <button
              onClick={() => onDelete(device.id)}
              className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {devices.length === 0 && (
        <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Cpu size={32} />
          </div>
          <p className="text-sm">暂无匹配的设备</p>
        </div>
      )}
    </div>
  );
};
