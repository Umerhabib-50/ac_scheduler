import notifee, {
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native';
import {Slot} from '../../types/schedule';
import {sendAcOn, sendAcOff} from '../ir/IrBlaster';

const CHANNEL_ID = 'ac-scheduler';

async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'AC Scheduler',
    importance: AndroidImportance.HIGH,
  });
}

function nextTriggerTimestamp(timeStr: string, offsetMinutes = 0): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() + offsetMinutes * 60 * 1000;
}

export function hasOnTimeConflict(slots: Slot[], slot: Slot): boolean {
  return slots.some(s => s.id !== slot.id && s.offTime === slot.onTime);
}

export async function scheduleSlot(slot: Slot, onOffsetMinutes = 0): Promise<void> {
  await ensureChannel();

  const onTrigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: nextTriggerTimestamp(slot.onTime, onOffsetMinutes),
    repeatFrequency: 1,
  };

  const offTrigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: nextTriggerTimestamp(slot.offTime),
    repeatFrequency: 1,
  };

  await notifee.createTriggerNotification(
    {
      id: `on-${slot.id}`,
      title: 'AC Scheduler',
      body: `Turning AC ON — ${slot.temperature}°C`,
      android: {channelId: CHANNEL_ID, pressAction: {id: 'default'}},
      data: {action: 'ac-on', slotId: slot.id},
    },
    onTrigger,
  );

  await notifee.createTriggerNotification(
    {
      id: `off-${slot.id}`,
      title: 'AC Scheduler',
      body: 'Turning AC OFF',
      android: {channelId: CHANNEL_ID, pressAction: {id: 'default'}},
      data: {action: 'ac-off', slotId: slot.id},
    },
    offTrigger,
  );
}

export async function cancelSlot(slotId: string): Promise<void> {
  await notifee.cancelTriggerNotification(`on-${slotId}`);
  await notifee.cancelTriggerNotification(`off-${slotId}`);
}

export async function handleForegroundEvent(
  type: number,
  detail: {notification?: {data?: Record<string, string>}},
  slots: Slot[],
): Promise<void> {
  const data = detail.notification?.data;
  if (!data) return;

  if (data.action === 'ac-on') {
    const slot = slots.find(s => s.id === data.slotId);
    if (slot) await sendAcOn(slot.temperature, slot.fanSpeed, slot.mode);
  } else if (data.action === 'ac-off') {
    await sendAcOff();
  }
}
