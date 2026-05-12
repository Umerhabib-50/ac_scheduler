import {Slot} from '../types/schedule';

export type TabParamList = {
  Remote: undefined;
  SchedulesTab: undefined;
};

export type SchedulesStackParamList = {
  Schedules: undefined;
  AddSlot: {editSlot?: Slot} | undefined;
};
