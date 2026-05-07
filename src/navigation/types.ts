import {Slot} from '../types/schedule';

// Add new screens here — one line per screen
export type RootStackParamList = {
  Home: undefined;
  Schedules: undefined;
  AddSlot: {editSlot?: Slot} | undefined;
};
