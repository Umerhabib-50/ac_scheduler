import React, {useEffect} from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SchedulesStackParamList} from '../../navigation/types';
import {useScheduleStore} from '../../store/scheduleStore';
import SlotCard from '../../components/slots/SlotCard';
import {colors, spacing, fontSize} from '../../constants/theme';
import {scheduleSlot, cancelSlot, hasOnTimeConflict} from '../../services/scheduler/SchedulerService';
import {requestNotificationPermission, requestExactAlarmPermission, requestBatteryOptimizationExemption} from '../../utils/permissions';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<SchedulesStackParamList, 'Schedules'>;

export default function SchedulesScreen({navigation}: Props) {
  const {slots, toggleSlot, removeSlot} = useScheduleStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    requestNotificationPermission();
    requestExactAlarmPermission();
    requestBatteryOptimizationExemption();
  }, []);

  const handleToggle = async (id: string) => {
    const slot = slots.find(s => s.id === id);
    if (!slot) return;
    toggleSlot(id);
    if (!slot.enabled) {
      const enabled = {...slot, enabled: true};
      const offset = hasOnTimeConflict(slots, enabled) ? 5 : 0;
      await scheduleSlot(enabled, offset);
    } else {
      await cancelSlot(id);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Slot', 'Are you sure?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await cancelSlot(id);
          removeSlot(id);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={slots}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No schedules yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap + to add your first AC schedule
            </Text>
          </View>
        }
        renderItem={({item}) => (
          <SlotCard
            slot={item}
            onToggle={() => handleToggle(item.id)}
            onEdit={() => navigation.navigate('AddSlot', {editSlot: item})}
            onDelete={() => handleDelete(item.id)}
          />
        )}
      />
      <TouchableOpacity
        style={[styles.fab, {bottom: spacing.xl + insets.bottom}]}
        onPress={() => navigation.navigate('AddSlot')}
        activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  list: {padding: spacing.md, paddingBottom: 100},
  empty: {alignItems: 'center', marginTop: 80},
  emptyTitle: {fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary},
  emptySubtitle: {fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs},
  fab: {
    position: 'absolute',
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
  },
  fabText: {fontSize: 28, color: '#fff', lineHeight: 32},
});
