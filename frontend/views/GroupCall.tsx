import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Users, Radio, Signal, User, Plus, Activity } from 'lucide-react';

// Types
interface Channel {
  id: string;
  name: string;
  frequency: string;
  online: number;
  total: number;
}

interface Member {
  id: string;
  channelId: string;
  name: string;
  status: 'online' | 'offline' | 'speaking';
  role: 'admin' | 'user' | 'dispatcher';
}

interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'voice' | 'alert' | 'system';
}

// Initial Data
const initialChannels: Channel[] = [
    { id: '1', name: '工程一部 (主频道)', frequency: '462.125 兆赫', online: 3, total: 3 },
    { id: '2', name: '安保巡逻组', frequency: '467.550 兆赫', online: 2, total: 2 },
    { id: '3', name: '应急指挥中心', frequency: '468.900 兆赫', online: 0, total: 0 },
];

const initialMembers: Member[] = [
  { id: 'u1', channelId: '1', name: '王工 (队长)', status: 'online', role: 'admin' },
  { id: 'u2', channelId: '1', name: '张伟', status: 'online', role: 'user' },
  { id: 'u3', channelId: '1', name: '李强', status: 'online', role: 'user' },
  { id: 'u4', channelId: '2', name: '赵敏', status: 'online', role: 'user' },
  { id: 'u5', channelId: '2', name: '孙楠', status: 'offline', role: 'user' },
];

export default function GroupCall() {
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [activeChannelId, setActiveChannelId] = useState<string>('1');
  const [currentUserId, setCurrentUserId] = useState<string>('u1');
  
  // UI State
  const [isTalking, setIsTalking] = useState(false);
  const [volume, setVolume] = useState(80);
  const [waveHeight, setWaveHeight] = useState<number[]>(Array(20).fill(10));
  const [logs, setLogs] = useState<LogEntry[]>([
      { id: '0', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), message: '系统初始化完成', type: 'system'}
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  // Modal States
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  
  // Forms
  const [newChannelForm, setNewChannelForm] = useState({ name: '', frequency: '' });
  const [newMemberForm, setNewMemberForm] = useState({ name: '', role: 'user' as const });

  // Derived State
  const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];
  const activeMembers = members.filter(m => m.channelId === activeChannelId);
  const currentUser = members.find(m => m.id === currentUserId) || activeMembers[0] || members[0];

  // Helper to add logs
  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
      setLogs(prev => [...prev, {
          id: Date.now().toString() + Math.random(),
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'}),
          message,
          type
      }].slice(-50)); // Keep last 50 logs
  };

  // Auto scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Audio Wave Animation
  useEffect(() => {
    const interval = setInterval(() => {
        // Wave animates if the Current User (selected) is speaking
        if (currentUser?.status === 'speaking') {
            setWaveHeight(prev => prev.map(() => Math.random() * 80 + 10));
        } else {
             setWaveHeight(Array(20).fill(10));
        }
    }, 100);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Switch to first member when channel changes to prevent orphan selection
  useEffect(() => {
      const firstMember = members.find(m => m.channelId === activeChannelId);
      if (firstMember) {
          setCurrentUserId(firstMember.id);
      }
  }, [activeChannelId]);

  // Speaking Actions
  const startTalking = () => {
      if (!currentUser || currentUser.status === 'offline') return;
      
      setIsTalking(true);
      // Update the specific user's status
      setMembers(prev => prev.map(m => m.id === currentUser.id ? { ...m, status: 'speaking' } : m));
      addLog(`${currentUser.name} 开始发言`, 'voice');
  };

  const stopTalking = () => {
      if (!currentUser) return;

      setIsTalking(false);
      // Reset status
      setMembers(prev => prev.map(m => m.id === currentUser.id ? { ...m, status: 'online' } : m));
  };

  // Keyboard Hotkeys
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.code === 'Space' && !e.repeat && !showAddChannel && !showAddMember) {
              if (document.activeElement?.tagName !== 'INPUT') {
                 e.preventDefault();
                 startTalking();
              }
          }
      };
      
      const handleKeyUp = (e: KeyboardEvent) => {
          if (e.code === 'Space') {
              stopTalking();
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
      };
  }, [showAddChannel, showAddMember, currentUser]); // Depend on currentUser to capture latest ref


  // Actions
  const handleAddChannel = () => {
    if(!newChannelForm.name) return;
    const newChan: Channel = {
        id: Date.now().toString(),
        name: newChannelForm.name,
        frequency: newChannelForm.frequency || '460.000 MHz',
        online: 0,
        total: 0
    };
    setChannels([...channels, newChan]);
    addLog(`新增频段: ${newChan.name}`, 'system');
    setNewChannelForm({ name: '', frequency: '' });
    setShowAddChannel(false);
  };

  const handleAddMember = () => {
     if(!newMemberForm.name) return;
     const newMem: Member = {
         id: `u${Date.now()}`,
         channelId: activeChannelId,
         name: newMemberForm.name,
         role: newMemberForm.role as any,
         status: 'online'
     };
     setMembers([...members, newMem]);
     setCurrentUserId(newMem.id); // Auto-select new member
     addLog(`成员加入: ${newMem.name}`, 'system');
     
     // Update channel counts
     setChannels(prev => prev.map(c => {
         if(c.id === activeChannelId) {
             return { ...c, total: c.total + 1, online: c.online + 1 };
         }
         return c;
     }));

     setNewMemberForm({ name: '', role: 'user' });
     setShowAddMember(false);
  };

  return (
    <div className="h-full flex gap-4 relative">
      {/* Left Sidebar */}
      <div className="w-80 flex flex-col gap-4">
        
        {/* Channel List Panel */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 h-[35%] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-blue-600 font-bold flex items-center gap-2">
                    <Radio size={18} /> 通话频段
                </h3>
                <button onClick={() => setShowAddChannel(true)} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800 transition-colors">
                    <Plus size={16} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {channels.map(channel => (
                    <div 
                        key={channel.id}
                        onClick={() => {
                            setActiveChannelId(channel.id);
                            addLog(`切换至频道: ${channel.name}`, 'info');
                        }}
                        className={`p-3 rounded cursor-pointer border transition-all flex justify-between items-center group relative overflow-hidden
                            ${activeChannelId === channel.id 
                                ? 'bg-blue-50 border-blue-500 text-gray-800' 
                                : 'bg-gray-50 border-transparent hover:bg-gray-100 text-gray-600'
                            }`}
                    >
                        <div className="z-10 relative">
                            <div className="font-bold text-sm flex items-center gap-2">
                                {channel.name}
                            </div>
                            <div className="text-[10px] opacity-70 mt-1 flex items-center gap-2 font-mono">
                                <span>{channel.frequency}</span>
                                <span className="flex items-center gap-0.5"><Users size={8} /> {channel.online}/{channel.total}</span>
                            </div>
                        </div>
                        {activeChannelId === channel.id && <div className="w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px] bg-green-500 shadow-green-500"></div>}
                    </div>
                ))}
            </div>
        </div>

        {/* Member List Panel */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 h-[35%] flex flex-col">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-blue-600 font-bold flex items-center gap-2">
                    <Users size={18} /> 频道成员
                </h3>
                <button onClick={() => setShowAddMember(true)} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-800 transition-colors">
                    <Plus size={16} />
                </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {activeMembers.length === 0 ? (
                    <div className="text-center text-gray-500 text-xs py-10">
                        当前频道暂无成员<br/>请点击右上角添加
                    </div>
                ) : (
                    activeMembers.map(member => (
                        <div 
                            key={member.id} 
                            onClick={() => {
                                setCurrentUserId(member.id);
                                addLog(`切换控制: ${member.name}`, 'info');
                            }}
                            className={`flex items-center justify-between p-2 rounded group transition-all border cursor-pointer
                                ${currentUserId === member.id 
                                    ? 'bg-gray-100 border-blue-500/50 shadow-sm' 
                                    : 'border-transparent hover:bg-gray-100 hover:border-gray-200'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all
                                    ${member.status === 'speaking' ? 'border-green-400 bg-green-100 scale-110' : 'border-gray-300 bg-gray-100'}
                                `}>
                                    <User size={14} className={member.status === 'speaking' ? 'text-green-600' : 'text-gray-600'} />
                                </div>
                                <div>
                                    <div className={`text-sm ${member.status === 'speaking' ? 'text-green-600 font-bold' : 'text-gray-700'} ${currentUserId === member.id ? 'text-blue-600 font-semibold' : ''}`}>
                                        {member.name}
                                    </div>
                                    <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                        {member.role === 'admin' && <span className="text-yellow-600">管理员</span>}
                                        {member.role === 'dispatcher' && <span className="text-blue-600">调度</span>}
                                        {member.role === 'user' && <span>成员</span>}
                                    </div>
                                </div>
                            </div>
                            <div>
                                {member.status === 'speaking' && <Mic size={14} className="text-green-500 animate-pulse" />}
                                {member.status === 'offline' && <span className="w-2 h-2 rounded-full bg-gray-400 block"></span>}
                                {member.status === 'online' && <span className="w-2 h-2 rounded-full bg-green-500/50 block"></span>}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* System Logs Panel */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 flex-1 flex flex-col min-h-0">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-gray-500 font-bold text-xs flex items-center gap-2 uppercase tracking-wider">
                    <Activity size={14} /> 系统日志
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[10px] p-2 bg-gray-100 rounded">
                {logs.map(log => (
                    <div key={log.id} className={`flex gap-2 ${log.type === 'alert' ? 'text-red-600 font-bold' : log.type === 'voice' ? 'text-green-600' : log.type === 'system' ? 'text-blue-600' : 'text-gray-500'}`}>
                        <span className="opacity-50 select-none">[{log.time}]</span>
                        <span>{log.message}</span>
                    </div>
                ))}
                <div ref={logEndRef} />
            </div>
        </div>

      </div>

      {/* Main: Call Interface */}
      <div className="flex-1 bg-white border border-gray-200 rounded-lg p-6 flex flex-col relative overflow-hidden transition-colors duration-500">
         {/* Background decoration */}
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] pointer-events-none transition-colors duration-500 from-blue-100/30 via-white to-white"></div>

         {/* Header Info */}
         <div className="flex justify-between items-start z-10">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 tracking-wider flex items-center gap-3">
                    {activeChannel.name}
                </h2>
                <div className="text-blue-600 font-mono text-sm mt-1 flex items-center gap-2">
                    <span>频率: {activeChannel.frequency}</span>
                    <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                    <span>AES256 加密</span>
                </div>
            </div>
            <div className="flex gap-3">
                <div className="flex items-center gap-4 bg-gray-100 px-4 py-2 rounded-full border border-gray-200">
                    <Signal size={18} className="text-green-500" />
                    <span className="text-xs text-gray-700">信号: 良好</span>
                    <div className="h-4 w-[1px] bg-gray-300"></div>
                    <Volume2 size={18} className="text-gray-600" />
                    <input 
                        type="range" 
                        min="0" max="100" 
                        value={volume} 
                        onChange={(e) => setVolume(parseInt(e.target.value))}
                        className="w-24 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600"
                    />
                </div>
            </div>
         </div>

         {/* Central Visualization */}
         <div className="flex-1 flex flex-col items-center justify-center z-10 py-10">
            {/* Current User Avatar */}
            {currentUser ? (
                <>
                <div className="relative mb-8 transition-all duration-300">
                    <div className={`w-48 h-48 rounded-full border-4 flex items-center justify-center bg-white relative z-20 transition-all
                        ${currentUser.status === 'speaking' ? 'border-green-500/50 shadow-lg shadow-green-200' : 'border-gray-200'}
                    `}>
                        <img 
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.name}`} 
                            alt="Speaker" 
                            className={`w-40 h-40 rounded-full transition-opacity duration-300 ${currentUser.status === 'speaking' ? 'opacity-100' : 'opacity-80 grayscale-[50%]'}`}
                        />
                    </div>
                    {/* Ripple Effect */}
                    {currentUser.status === 'speaking' && (
                        <>
                            <div className="absolute inset-0 rounded-full border animate-ping opacity-20 z-10 border-green-500"></div>
                            <div className="absolute -inset-4 rounded-full border animate-pulse opacity-20 z-0 border-green-500/30"></div>
                        </>
                    )}
                </div>
                
                <div className="text-center mb-8 h-12">
                    <h3 className="text-xl text-gray-800 font-bold">{currentUser.name}</h3>
                    {currentUser.status === 'speaking' ? (
                        <p className="text-sm animate-pulse flex items-center justify-center gap-2 mt-2 text-green-600">
                            <Mic size={14} /> 正在发言...
                        </p>
                    ) : (
                        <p className="text-gray-500 text-sm mt-4 flex items-center justify-center gap-2">
                             <MicOff size={14} /> 等待通话...
                        </p>
                    )}
                </div>
                </>
            ) : (
                <div className="text-gray-500">请选择一个成员以查看界面</div>
            )}

            {/* Audio Waveform */}
            <div className="flex items-end justify-center gap-1 h-16 w-full max-w-lg">
                {waveHeight.map((h, i) => (
                    <div 
                        key={i} 
                        className={`w-2 rounded-t transition-all duration-75 ${(currentUser?.status === 'speaking') ? 'bg-green-500/80' : 'bg-gray-200'}`}
                        style={{ height: `${h}%` }}
                    ></div>
                ))}
            </div>
         </div>

         {/* PTT Button Area */}
         <div className="h-32 flex items-center justify-center border-t border-gray-200 bg-gray-50 z-10">
             <button
                onMouseDown={startTalking}
                onMouseUp={stopTalking}
                onMouseLeave={stopTalking}
                disabled={!currentUser || currentUser.status === 'offline'}
                className={`w-24 h-24 rounded-full border-4 flex items-center justify-center shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                    ${isTalking 
                        ? 'bg-blue-600 border-blue-400 shadow-blue-200 text-white'
                        : 'bg-white border-gray-300 hover:border-blue-500 hover:text-blue-500 text-gray-500'
                    }`}
             >
                <div className="flex flex-col items-center">
                    {isTalking ? <Mic size={32} /> : <MicOff size={32} />}
                    <span className="text-[10px] font-bold mt-1">按住说话</span>
                </div>
             </button>
                 <div className="absolute right-8 bottom-8 text-xs text-gray-400 flex items-center gap-2">
                     <span className="px-1.5 py-0.5 rounded bg-gray-200 border border-gray-300 font-mono">空格键</span> 通话
                 </div>
         </div>
      </div>

      {/* --- Modals --- */}
      {showAddChannel && (
          <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white border border-gray-200 p-6 rounded-lg w-96 shadow-2xl animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Radio size={20} className="text-blue-600"/> 新增频段</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-gray-600 block mb-1">频段名称</label>
                          <input 
                            className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-gray-800 outline-none focus:border-blue-500"
                            value={newChannelForm.name}
                            onChange={e => setNewChannelForm({...newChannelForm, name: e.target.value})}
                            placeholder="例如: 救援行动组"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-600 block mb-1">频率（兆赫）</label>
                          <input 
                            className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-gray-800 outline-none focus:border-blue-500"
                            value={newChannelForm.frequency}
                            onChange={e => setNewChannelForm({...newChannelForm, frequency: e.target.value})}
                            placeholder="460.000 兆赫"
                          />
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button onClick={handleAddChannel} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-sm">确认添加</button>
                          <button onClick={() => setShowAddChannel(false)} className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded text-sm">取消</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showAddMember && (
          <div className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
              <div className="bg-white border border-gray-200 p-6 rounded-lg w-96 shadow-2xl animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Users size={20} className="text-blue-600"/> 添加成员</h3>
                  <div className="text-xs text-gray-500 mb-4 pb-2 border-b border-gray-200">
                      添加到频道: <span className="text-blue-600">{activeChannel.name}</span>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-gray-600 block mb-1">成员姓名</label>
                          <input 
                            className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-gray-800 outline-none focus:border-blue-500"
                            value={newMemberForm.name}
                            onChange={e => setNewMemberForm({...newMemberForm, name: e.target.value})}
                            placeholder="输入姓名"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-600 block mb-1">角色权限</label>
                          <select 
                            className="w-full bg-gray-50 border border-gray-300 rounded p-2 text-gray-800 outline-none focus:border-blue-500"
                            value={newMemberForm.role}
                            onChange={e => setNewMemberForm({...newMemberForm, role: e.target.value as any})}
                          >
                              <option value="user">普通成员</option>
                              <option value="dispatcher">调度员</option>
                              <option value="admin">管理员</option>
                          </select>
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button onClick={handleAddMember} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded text-sm">确认添加</button>
                          <button onClick={() => setShowAddMember(false)} className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded text-sm">取消</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}