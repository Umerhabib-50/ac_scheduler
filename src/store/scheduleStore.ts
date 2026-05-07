import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Slot, FanSpeed, AcMode} from '../types/schedule';
import 'react-native-get-random-values';
import {v4 as uuidv4} from 'uuid';

type AcState = {
  power: boolean;
  temperature: number;
  fanSpeed: FanSpeed;
  mode: AcMode;
};

type ScheduleStore = {
  slots: Slot[];
  acState: AcState;
  addSlot: (slot: Omit<Slot, 'id'>) => void;
  updateSlot: (id: string, updates: Partial<Omit<Slot, 'id'>>) => void;
  removeSlot: (id: string) => void;
  toggleSlot: (id: string) => void;
  setAcState: (updates: Partial<AcState>) => void;
};

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    set => ({
      slots: [],
      acState: {power: false, temperature: 24, fanSpeed: 'auto', mode: 'cool'},

      setAcState: updates =>
        set(state => ({acState: {...state.acState, ...updates}})),

      addSlot: slot =>
        set(state => ({
          slots: [...state.slots, {id: uuidv4(), ...slot}],
        })),

      updateSlot: (id, updates) =>
        set(state => ({
          slots: state.slots.map(s => (s.id === id ? {...s, ...updates} : s)),
        })),

      removeSlot: id =>
        set(state => ({
          slots: state.slots.filter(s => s.id !== id),
        })),

      toggleSlot: id =>
        set(state => ({
          slots: state.slots.map(s =>
            s.id === id ? {...s, enabled: !s.enabled} : s,
          ),
        })),
    }),
    {
      name: 'schedule-store',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
