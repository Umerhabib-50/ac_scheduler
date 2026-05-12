import notifee, {EventType, Event} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Slot} from '../../types/schedule';
import {sendAcOn, sendAcOff} from '../ir/IrBlaster';
import {useScheduleStore} from '../../store/scheduleStore';

async function getSlot(slotId: string): Promise<Slot | undefined> {
  const raw = await AsyncStorage.getItem('schedule-store');
  if (!raw) return undefined;
  const parsed = JSON.parse(raw);
  const slots: Slot[] = parsed?.state?.slots ?? [];
  return slots.find(s => s.id === slotId);
}

export async function handleNotifeeEvent({type, detail}: Event): Promise<void> {
  if (type !== EventType.DELIVERED && type !== EventType.PRESS) return;

  const data = detail.notification?.data as
    | {action?: string; slotId?: string}
    | undefined;
  if (!data?.action) return;

  const {setAcState} = useScheduleStore.getState();

  if (data.action === 'ac-on' && data.slotId) {
    const slot = await getSlot(data.slotId);
    if (slot?.enabled) {
      await sendAcOn({temp: slot.temperature, fanSpeed: slot.fanSpeed, mode: slot.mode});
      setAcState({power: true, temperature: slot.temperature, fanSpeed: slot.fanSpeed, mode: slot.mode});
    }
  } else if (data.action === 'ac-off' && data.slotId) {
    const slot = await getSlot(data.slotId);
    await sendAcOff(slot?.temperature, slot?.fanSpeed);
    setAcState({power: false});
  }
}

export function registerBackgroundHandler(): void {
  notifee.onBackgroundEvent(handleNotifeeEvent);
}
