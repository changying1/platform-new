import { useState, useEffect, useCallback, useMemo } from 'react';
import { deviceApi, ApiDevice } from '../../../src/api/deviceApi';

export function useDeviceStore() {
  const [devices, setDevices] = useState<ApiDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await deviceApi.getAllDevices();
      setDevices(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || '获取设备列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const addDevice = async (device: Partial<ApiDevice>) => {
    try {
      const newDevice = await deviceApi.addDevice(device);
      setDevices(prev => [...prev, newDevice]);
      return newDevice;
    } catch (err: any) {
      throw new Error(err.message || '添加设备失败');
    }
  };

  const updateDevice = async (id: string, data: Partial<ApiDevice>) => {
    try {
      const updated = await deviceApi.updateDevice(id, data);
      setDevices(prev => prev.map(d => d.id === id ? updated : d));
      return updated;
    } catch (err: any) {
      throw new Error(err.message || '更新设备失败');
    }
  };

  const deleteDevice = async (id: string) => {
    if (!confirm(`确定要删除设备 ${id} 吗？`)) return;
    try {
      await deviceApi.deleteDevice(id);
      setDevices(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      alert(err.message || '删除设备失败');
    }
  };

  const filteredDevices = useMemo(() => {
    return devices.filter(d => 
      d.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.ip_address.includes(searchTerm)
    );
  }, [devices, searchTerm]);

  return {
    devices,
    filteredDevices,
    searchTerm,
    setSearchTerm,
    loading,
    error,
    addDevice,
    updateDevice,
    deleteDevice,
    refresh: fetchDevices
  };
}
