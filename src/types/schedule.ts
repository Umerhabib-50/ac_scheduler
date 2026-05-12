export type FanSpeed = 'auto' | 'low' | 'medLow' | 'medium' | 'medHigh' | 'high';
export type AcMode = 'auto' | 'cool' | 'dry' | 'fan' | 'heat';

export type Slot = {
  id: string;
  label: string;
  onTime: string;        // "HH:mm" 24h
  offTime: string;       // "HH:mm" 24h
  overnightOff: boolean; // true when offTime is next day (offTime < onTime)
  temperature: number;   // 16–30
  fanSpeed: FanSpeed;
  mode: AcMode;
  enabled: boolean;
};

export type DisplayTemp = 'set' | 'indoor' | 'outdoor';

export type SwingVPosition = 'off' | 'auto' | 'up' | 'midUp' | 'middle' | 'midDown' | 'down';
export type SwingHPosition = 'off' | 'auto' | 'fullLeft' | 'left' | 'center' | 'right' | 'fullRight';

export type AcOnParams = {
  temp: number;
  fanSpeed: FanSpeed;
  mode: AcMode;
  turbo?: boolean;
  sleep?: boolean;
  swingH?: SwingHPosition;
  swingV?: SwingVPosition;
  xFan?: boolean;
  light?: boolean;
  displayTemp?: DisplayTemp;
  healthy?: boolean;
  scavenging?: boolean;
};
