export interface AlarmRecord {
  id: string;
  rawId: number;
  user: string;
  device: string;
  type: string;
  time: string;
  timestamp: string;
  location: string;
  status: 'pending' | 'resolved';
  level: 'high' | 'medium' | 'low';
  description?: string;
}

export type AlarmStatusFilter = 'all' | 'pending' | 'resolved';
export type AlarmLevelFilter = 'all' | 'high' | 'medium' | 'low';
