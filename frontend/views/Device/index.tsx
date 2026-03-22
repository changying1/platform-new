import React, { useState } from "react";
import { Cpu, Plus, Search, RefreshCw, Layers } from "lucide-react";
import { useDeviceStore } from "./hooks/useDeviceStore";
import { DeviceList } from "./components/DeviceList";
import { DeviceForm } from "./components/DeviceForm";
import { ApiDevice } from "../../src/api/deviceApi";

export default function DeviceManagement() {
  const {
    filteredDevices,
    searchTerm,
    setSearchTerm,
    loading,
    refresh,
    addDevice,
    updateDevice,
    deleteDevice,
  } = useDeviceStore();

  const [showForm, setShowForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState<ApiDevice | null>(null);

  const handleEdit = (device: ApiDevice) => {
    setEditingDevice(device);
    setShowForm(true);
  };

  const handleSave = async (data: Partial<ApiDevice>) => {
    if (editingDevice) {
      await updateDevice(editingDevice.id, data);
    } else {
      await addDevice(data);
    }
    setShowForm(false);
    setEditingDevice(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingDevice(null);
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">
              个人设备管理
            </h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
              Personnel Device Fleet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="搜索设备..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all w-64 shadow-inner"
            />
            <Search
              className="absolute left-3.5 top-3 text-gray-400"
              size={16}
            />
          </div>
          <button
            onClick={refresh}
            className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all hover:rotate-180 duration-500"
            title="刷新数据"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={() => {
              setEditingDevice(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-100 transition-all active:scale-95"
          >
            <Plus size={18} /> 新增设备
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-blue-500">
            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
              Loading Fleet Data...
            </p>
          </div>
        ) : (
          <DeviceList
            devices={filteredDevices}
            onEdit={handleEdit}
            onDelete={deleteDevice}
          />
        )}
      </div>

      {/* Stats Summary Footer */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-widest px-8 shadow-sm">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Total: {filteredDevices.length}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            Online: {filteredDevices.filter((d) => d.is_online).length}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            Offline: {filteredDevices.filter((d) => !d.is_online).length}
          </span>
        </div>
        <div className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
          Smart Fleet Portal v1.0
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <DeviceForm
          initialData={editingDevice}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
