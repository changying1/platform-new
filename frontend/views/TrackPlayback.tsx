// ...existing code...
import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Download, Search } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Polyline path
const polylinePositions: [number, number][] = [
  [31.2304, 121.4737],
  [31.2314, 121.4747],
  [31.2324, 121.4757],
  [31.2334, 121.4727],
  [31.2354, 121.4787],
  [31.2304, 121.4737],
];

// Helper to calculate position based on progress 0-100
const getPositionAtProgress = (path: [number, number][], progress: number): [number, number] => {
  if (path.length < 2 || progress <= 0) return path[0];
  if (progress >= 100) return path[path.length - 1];

  // Calculate total length
  const totalLength = path.reduce((acc, curr, idx) => {
    if (idx === 0) return 0;
    return acc + L.latLng(curr).distanceTo(path[idx - 1]);
  }, 0);
  
  const targetDist = (progress / 100) * totalLength;
  
  let currentDist = 0;
  for (let i = 1; i < path.length; i++) {
    const segmentDist = L.latLng(path[i]).distanceTo(path[i - 1]);
    if (currentDist + segmentDist >= targetDist) {
      const ratio = (targetDist - currentDist) / segmentDist;
      const lat = path[i-1][0] + (path[i][0] - path[i-1][0]) * ratio;
      const lng = path[i-1][1] + (path[i][1] - path[i-1][1]) * ratio;
      return [lat, lng];
    }
    currentDist += segmentDist;
  }
  return path[path.length - 1];
};

export default function TrackPlayback() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPos, setCurrentPos] = useState<[number, number]>(polylinePositions[0]);

  // Handle Playback Loop
  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return prev + 0.5; // speed
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Update position when progress changes
  useEffect(() => {
    setCurrentPos(getPositionAtProgress(polylinePositions, progress));
  }, [progress]);

  const handleStop = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div
      className="h-full flex flex-col gap-4 p-4 text-white"
      style={{ background: 'linear-gradient(180deg, #0b66d1 0%, #0752b0 45%, #053a85 100%)' }}
    >
      {/* Controls Bar - 蓝色风 */}
      <div className="bg-blue-900 border border-blue-800 rounded-lg p-3 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input 
                 type="text" 
                 placeholder="输入姓名或设备号" 
                 className="bg-blue-800 border border-blue-700 rounded px-3 py-1.5 text-sm text-blue-50 outline-none focus:border-blue-400 w-64"
              />
              <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded text-sm flex items-center gap-1 shadow-md">
                 <Search size={14} /> 搜索
              </button>
            </div>
            
            <div className="h-8 w-[1px] bg-blue-800/60 mx-2"></div>

            <div className="flex items-center gap-2">
               <span className="text-blue-200 text-sm">日期:</span>
               <input type="date" className="bg-blue-800 border border-blue-700 rounded px-2 py-1 text-sm text-blue-50" defaultValue="2024-08-07" />
               <span className="text-blue-400">-</span>
               <input type="date" className="bg-blue-800 border border-blue-700 rounded px-2 py-1 text-sm text-blue-50" defaultValue="2024-08-07" />
            </div>
         </div>

         <button className="text-blue-100 text-sm hover:text-white flex items-center gap-1">
            <Download size={16} /> 导出Excel
         </button>
      </div>

      {/* Main Map */}
      <div className="flex-1 border border-blue-800 rounded-lg relative overflow-hidden" style={{ background: '#041836' }}>
         <MapContainer center={[31.2324, 121.4757]} zoom={15} className="w-full h-full">
            <TileLayer
               attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
               url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <Polyline 
               positions={polylinePositions} 
               pathOptions={{ color: '#39b0ff', weight: 4 }} 
            />
            
            {/* Start Marker */}
            <Marker position={polylinePositions[0]}>
               <Popup>起点</Popup>
            </Marker>
            
            {/* End Marker */}
            <Marker position={polylinePositions[polylinePositions.length - 1]}>
               <Popup>终点</Popup>
            </Marker>

            {/* Moving Marker */}
            <Marker position={currentPos} zIndexOffset={100}>
               <Popup>
                  <div className="text-xs">
                    <div>用户: 王**</div>
                    <div>时间: {new Date().toLocaleTimeString()}</div>
                  </div>
               </Popup>
            </Marker>
         </MapContainer>

         {/* Playback Controls Overlay - 蓝色风 */}
         <div className="absolute bottom-6 left-6 right-6 bg-blue-900/70 backdrop-blur border border-blue-800 p-4 rounded-lg z-[400] flex flex-col gap-2 shadow-lg text-blue-100">
            <div className="flex justify-between text-xs text-blue-200">
               <span>2024-07-29 00:00:00</span>
               <span>2024-07-29 23:59:59</span>
            </div>
            <input 
               type="range" 
               min="0" 
               max="100" 
               value={progress} 
               onChange={(e) => setProgress(Number(e.target.value))}
               className="w-full h-1 bg-blue-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:rounded-full"
            />
            <div className="flex items-center justify-center gap-6 mt-2">
               <button 
                 onClick={handleStop}
                 className="text-blue-200 hover:text-white"
               >
                 <Square size={16} />
               </button>
               <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white hover:bg-blue-500 shadow-lg transition-all"
               >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
               </button>
               <select className="bg-blue-800 text-xs text-blue-100 border border-blue-700 rounded px-1 py-0.5 outline-none">
                  <option>1倍</option>
                  <option>2倍</option>
                  <option>4倍</option>
               </select>
            </div>
         </div>
      </div>
    </div>
  );
}
// ...existing code...