import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {useScheduleStore} from '../../store/scheduleStore';
import Button from '../../components/common/Button';
import {colors, spacing, fontSize, radius} from '../../constants/theme';
import {FanSpeed} from '../../types/schedule';
import {scheduleSlot, cancelSlot, hasOnTimeConflict} from '../../services/scheduler/SchedulerService';
import {GREE_TEMP_MIN, GREE_TEMP_MAX} from '../../constants/ir';

type Props = NativeStackScreenProps<RootStackParamList, 'AddSlot'>;

const FAN_OPTIONS: FanSpeed[] = ['auto', 'low', 'medium', 'high'];

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

  const handleSave = async () => {
    if (!validateTime(onTime) || !validateTime(offTime)) {
      Alert.alert('Invalid time', 'Use HH:MM format (e.g. 22:00)');
      return;
    }

    if (onTime === offTime) {
      Alert.alert('Invalid slot', 'ON time and OFF time cannot be the same.');
      return;
    }

    if (toMinutes(onTime) > toMinutes(offTime)) {
      Alert.alert('Invalid slot', 'ON time must be before OFF time.');
      return;
    }

    const otherSlots = slots.filter(s => s.id !== editSlot?.id);
    const duplicateOn = otherSlots.find(s => s.onTime === onTime);
    const duplicateOff = otherSlots.find(s => s.offTime === offTime);
    if (duplicateOn) {
      Alert.alert('Duplicate time', `Another slot already starts at ${onTime}.`);
      return;
    }
    if (duplicateOff) {
      Alert.alert('Duplicate time', `Another slot already ends at ${offTime}.`);
      return;
    }

    const overlapping = otherSlots.find(
      s => toMinutes(onTime) < toMinutes(s.offTime) && toMinutes(offTime) > toMinutes(s.onTime),
    );
    if (overlapping) {
      Alert.alert('Overlap', `This slot overlaps with "${overlapping.label || overlapping.onTime + '–' + overlapping.offTime}".`);
      return;
    }

    const slotData = {
      label: label.trim() || `Slot ${onTime}–${offTime}`,
      onTime,
      offTime,
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
      <Text style={styles.fieldLabel}>ON Time (HH:MM)</Text>
      <TextInput
        style={styles.input}
        value={onTime}
        onChangeText={setOnTime}
        placeholder="22:00"
        placeholderTextColor={colors.textSecondary}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />

      {/* OFF Time */}
      <Text style={styles.fieldLabel}>OFF Time (HH:MM)</Text>
      <TextInput
        style={styles.input}
        value={offTime}
        onChangeText={setOffTime}
        placeholder="06:00"
        placeholderTextColor={colors.textSecondary}
        keyboardType="numbers-and-punctuation"
        maxLength={5}
      />

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
            <Text
              style={[styles.fanBtnText, fanSpeed === f && styles.fanBtnTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button label={editSlot ? 'Save Changes' : 'Add Slot'} onPress={handleSave} style={styles.saveBtn} />
    </ScrollView>
  );
}

function validateTime(t: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
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
