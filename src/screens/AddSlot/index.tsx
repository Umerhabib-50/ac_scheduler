import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker, {DateTimePickerEvent} from '@react-native-community/datetimepicker';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SchedulesStackParamList} from '../../navigation/types';
import {useScheduleStore} from '../../store/scheduleStore';
import Button from '../../components/common/Button';
import {colors, spacing, fontSize, radius} from '../../constants/theme';
import {FanSpeed} from '../../types/schedule';
import {scheduleSlot, cancelSlot, hasOnTimeConflict} from '../../services/scheduler/SchedulerService';
import {GREE_TEMP_MIN, GREE_TEMP_MAX} from '../../constants/ir';

type Props = NativeStackScreenProps<SchedulesStackParamList, 'AddSlot'>;

const FAN_OPTIONS: FanSpeed[] = ['auto', 'low', 'medLow', 'medium', 'medHigh', 'high'];
const FAN_LABELS: Record<FanSpeed, string> = {
  auto: 'Auto', low: '1', medLow: '2', medium: '3', medHigh: '4', high: '5',
};

function timeStringToDate(t: string): Date {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function dateToTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function slotRanges(onTime: string, offTime: string): Array<[number, number]> {
  const on = toMinutes(onTime);
  const off = toMinutes(offTime);
  if (off <= on) return [[on, 1440], [0, off]];
  return [[on, off]];
}

function rangesOverlap(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[1] && a[1] > b[0];
}

function slotsOverlap(
  a: {onTime: string; offTime: string},
  b: {onTime: string; offTime: string},
): boolean {
  const aR = slotRanges(a.onTime, a.offTime);
  const bR = slotRanges(b.onTime, b.offTime);
  return aR.some(ar => bR.some(br => rangesOverlap(ar, br)));
}

export default function AddSlotScreen({navigation, route}: Props) {
  const editSlot = route.params?.editSlot;
  const {addSlot, updateSlot, slots} = useScheduleStore();

  const defaultOnTime = editSlot?.onTime ?? (
    slots.length > 0
      ? slots.reduce((latest, s) => toMinutes(s.offTime) > toMinutes(latest) ? s.offTime : latest, slots[0].offTime)
      : '00:00'
  );

  const [label, setLabel] = useState(editSlot?.label ?? '');
  const [onTime, setOnTime] = useState(defaultOnTime);
  const [offTime, setOffTime] = useState(editSlot?.offTime ?? '06:00');
  const [temperature, setTemperature] = useState(editSlot?.temperature ?? 24);
  const [fanSpeed, setFanSpeed] = useState<FanSpeed>(editSlot?.fanSpeed ?? 'auto');
  const [showOnPicker, setShowOnPicker] = useState(false);
  const [showOffPicker, setShowOffPicker] = useState(false);

  const isOvernight = toMinutes(offTime) < toMinutes(onTime);

  const handleOnChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowOnPicker(false);
    if (date) setOnTime(dateToTimeString(date));
  };

  const handleOffChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowOffPicker(false);
    if (date) setOffTime(dateToTimeString(date));
  };

  const handleSave = async () => {
    if (onTime === offTime) {
      Alert.alert('Invalid slot', 'ON time and OFF time cannot be the same.');
      return;
    }

    const otherSlots = slots.filter(s => s.id !== editSlot?.id);
    const current = {onTime, offTime};

    const duplicateOn = otherSlots.find(s => s.onTime === onTime);
    if (duplicateOn) {
      Alert.alert('Duplicate time', `Another slot already starts at ${onTime}.`);
      return;
    }
    const duplicateOff = otherSlots.find(s => s.offTime === offTime);
    if (duplicateOff) {
      Alert.alert('Duplicate time', `Another slot already ends at ${offTime}.`);
      return;
    }

    const overlapping = otherSlots.find(s => slotsOverlap(current, s));
    if (overlapping) {
      Alert.alert('Overlap', `This slot overlaps with "${overlapping.label || overlapping.onTime + '–' + overlapping.offTime}".`);
      return;
    }

    const slotData = {
      label: label.trim() || `Slot ${onTime}–${offTime}`,
      onTime,
      offTime,
      overnightOff: isOvernight,
      temperature,
      fanSpeed,
      mode: 'cool' as const,
      enabled: true,
    };

    if (editSlot) {
      await cancelSlot(editSlot.id);
      updateSlot(editSlot.id, slotData);
      const updated = {id: editSlot.id, ...slotData};
      const offset = hasOnTimeConflict(slots, updated) ? 5 : 0;
      await scheduleSlot(updated, offset);
    } else {
      addSlot(slotData);
      const newSlot = useScheduleStore.getState().slots.at(-1);
      if (newSlot) {
        const offset = hasOnTimeConflict(slots, newSlot) ? 5 : 0;
        await scheduleSlot(newSlot, offset);
      }
    }

    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Label */}
      <Text style={styles.fieldLabel}>Label (optional)</Text>
      <TextInput
        style={styles.input}
        value={label}
        onChangeText={setLabel}
        placeholder="e.g. Night Cooling"
        placeholderTextColor={colors.textSecondary}
      />

      {/* ON Time */}
      <Text style={styles.fieldLabel}>ON Time</Text>
      <TouchableOpacity style={styles.timeButton} onPress={() => setShowOnPicker(true)}>
        <Text style={styles.timeButtonText}>{onTime}</Text>
      </TouchableOpacity>
      {showOnPicker && (
        <DateTimePicker
          value={timeStringToDate(onTime)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleOnChange}
        />
      )}

      {/* OFF Time */}
      <Text style={styles.fieldLabel}>OFF Time</Text>
      <TouchableOpacity style={styles.timeButton} onPress={() => setShowOffPicker(true)}>
        <Text style={styles.timeButtonText}>{offTime}</Text>
        {isOvernight && <Text style={styles.nextDayBadge}>next day</Text>}
      </TouchableOpacity>
      {showOffPicker && (
        <DateTimePicker
          value={timeStringToDate(offTime)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleOffChange}
        />
      )}

      {/* Temperature */}
      <Text style={styles.fieldLabel}>Temperature: {temperature}°C</Text>
      <View style={styles.tempRow}>
        <TouchableOpacity
          style={styles.tempBtn}
          onPress={() => setTemperature(t => Math.max(GREE_TEMP_MIN, t - 1))}>
          <Text style={styles.tempBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.tempValue}>{temperature}°C</Text>
        <TouchableOpacity
          style={styles.tempBtn}
          onPress={() => setTemperature(t => Math.min(GREE_TEMP_MAX, t + 1))}>
          <Text style={styles.tempBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Fan Speed */}
      <Text style={styles.fieldLabel}>Fan Speed</Text>
      <View style={styles.fanRow}>
        {FAN_OPTIONS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.fanBtn, fanSpeed === f && styles.fanBtnActive]}
            onPress={() => setFanSpeed(f)}>
            <Text style={[styles.fanBtnText, fanSpeed === f && styles.fanBtnTextActive]}>
              {FAN_LABELS[f]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button label={editSlot ? 'Save Changes' : 'Add Slot'} onPress={handleSave} style={styles.saveBtn} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: spacing.md, paddingBottom: spacing.xl * 2},
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  timeButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeButtonText: {fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary},
  nextDayBadge: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  tempBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempBtnText: {fontSize: 22, color: '#fff', lineHeight: 26},
  tempValue: {fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary, minWidth: 70, textAlign: 'center'},
  fanRow: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap'},
  fanBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  fanBtnActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  fanBtnText: {fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '600'},
  fanBtnTextActive: {color: '#fff'},
  saveBtn: {marginTop: spacing.xl},
});
