import React, { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Loader } from 'lucide-react';
import { ptzStartControl, ptzStopControl, Video } from '../api/videoApi';

interface PTZControlPanelProps {
  video: Video;
  onError?: (msg: string) => void;
  onSuccess?: (msg: string) => void;
}

const PTZControlPanel: React.FC<PTZControlPanelProps> = ({
  video,
  onError,
  onSuccess
}) => {
  const [isControlling, setIsControlling] = useState(false);
  const [speed, setSpeed] = useState(0.3);

  const getDirectionName = (direction: string): string => {
    const names: Record<string, string> = {
      up: '上',
      down: '下',
      left: '左',
      right: '右'
    };
    return names[direction] || direction;
  };

  const startMove = useCallback(
    async (direction: 'up' | 'down' | 'left' | 'right') => {
      if (isControlling) return;
      try {
        setIsControlling(true);
        await ptzStartControl(video.id, direction, speed);
        onSuccess?.(`摄像头向${getDirectionName(direction)}移动中...`);
      } catch (err: any) {
        onError?.(`云台控制失败: ${err.message || err}`);
        setIsControlling(false);
      }
    },
    [isControlling, speed, video.id, onSuccess, onError]
  );

  const stopMove = useCallback(async () => {
    try {
      await ptzStopControl(video.id);
    } catch (err: any) {
      onError?.(`云台停止失败: ${err.message || err}`);
    } finally {
      setIsControlling(false);
    }
  }, [video.id, onError]);

  const bindPress = (direction: 'up' | 'down' | 'left' | 'right') => ({
    onMouseDown: () => startMove(direction),
    onMouseUp: stopMove,
    onMouseLeave: stopMove,
    onTouchStart: () => startMove(direction),
    onTouchEnd: stopMove,
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-4 select-none">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">云台控制</h3>

      {/* 方向控制键盘 */}
      <div className="flex flex-col items-center gap-2 mb-6">
        {/* 上 */}
        <button
          {...bindPress('up')}
          disabled={false}
          className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white transition"
          title="向上"
        >
          <ChevronUp size={24} />
        </button>

        {/* 左、中、右 */}
        <div className="flex gap-2">
          <button
            {...bindPress('left')}
            className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white transition"
            title="向左"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="px-6 py-2 bg-gray-100 rounded-lg flex items-center justify-center min-w-[120px]">
            {isControlling ? (
              <div className="flex items-center gap-2">
                <Loader size={20} className="animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">移动中...</span>
              </div>
            ) : (
              <span className="text-sm text-gray-600">按住方向可持续移动</span>
            )}
          </div>

          <button
            {...bindPress('right')}
            className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white transition"
            title="向右"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* 下 */}
        <button
          {...bindPress('down')}
          className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white transition"
          title="向下"
        >
          <ChevronDown size={24} />
        </button>
      </div>

      {/* 参数控制 */}
      <div className="border-t pt-4 space-y-3">
        {/* 速度 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            速度: {speed.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="text-xs text-gray-500 mt-1">范围: 0.1 (慢) - 1.0 (快)</div>
        </div>
      </div>

      {/* 摄像头信息 */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-700">
          <span className="font-medium">摄像头:</span> {video.name}
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-medium">地址:</span> {video.ip_address}:{video.port}
        </p>
      </div>
    </div>
  );
};

export default PTZControlPanel;
