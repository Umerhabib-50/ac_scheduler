export type FanSpeed = 'auto' | 'low' | 'medium' | 'high';
export type AcMode = 'cool';

export type Slot = {
  id: string;
  label: string;
  onTime: string;   // "HH:mm" 24h
  offTime: string;  // "HH:mm" 24h
  temperature: number; // 16–30
  fanSpeed: FanSpeed;
  mode: AcMode;
  enabled: boolean;
};
