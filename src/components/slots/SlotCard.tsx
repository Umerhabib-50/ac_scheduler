import React from 'react';
import {View, Text, StyleSheet, Switch, TouchableOpacity} from 'react-native';
import {Slot} from '../../types/schedule';
import {colors, spacing, radius, fontSize} from '../../constants/theme';
import {formatTime} from '../../utils/time';

type Props = {
  slot: Slot;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export default function SlotCard({slot, onToggle, onEdit, onDelete}: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, !slot.enabled && styles.cardDisabled]}
      onPress={onEdit}
      activeOpacity={0.85}>
      <View style={styles.row}>
        <View style={styles.times}>
          <Text style={styles.label}>{slot.label}</Text>
          <View style={styles.timeRow}>
            <Text style={styles.time}>
              {formatTime(slot.onTime)} → {formatTime(slot.offTime)}
            </Text>
            {slot.overnightOff && (
              <Text style={styles.nextDayBadge}>next day</Text>
            )}
          </View>
          <Text style={styles.meta}>
            {slot.temperature}°C · Fan: {slot.fanSpeed}
          </Text>
        </View>
        <View style={styles.right}>
          <Switch
            value={slot.enabled}
            onValueChange={onToggle}
            trackColor={{false: colors.disabled, true: colors.primary}}
            thumbColor="#fff"
          />
        </View>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        style={styles.deleteBtn}
        activeOpacity={0.7}>
        <Text style={styles.deleteText}>✕ Delete</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  cardDisabled: {opacity: 0.5},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  times: {flex: 1},
  timeRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2},
  label: {fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 2},
  time: {fontSize: fontSize.lg, fontWeight: '600', color: colors.primary},
  nextDayBadge: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  meta: {fontSize: fontSize.sm, color: colors.textSecondary},
  right: {alignItems: 'center'},
  deleteBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  deleteText: {fontSize: fontSize.sm, color: colors.error, fontWeight: '600'},
});
