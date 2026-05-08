import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {useScheduleStore} from '../../store/scheduleStore';
import {colors, spacing, fontSize, radius} from '../../constants/theme';
import {FanSpeed} from '../../types/schedule';
import {sendAcOn, sendAcOff, isIrSupported, sendRawDebug} from '../../services/ir/IrBlaster';
import {encodeRawGreeBytes} from '../../services/ir/greeEncoder';
import {GREE_TEMP_MIN, GREE_TEMP_MAX} from '../../constants/ir';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// IRremoteESP8266 NormalRealExample — 139 pulses, YAW1F Cool ON 26°C Low fan
// bytes: {0x19, 0x0A, 0x60, 0x50, 0x02, 0x23, 0x00, 0xF0}
// Used to verify transmission layer independent of our encoder
const GREE_RAW_TEST: number[] = [
  9008, 4496, 644, 1660, 676, 530, 648, 558, 672, 1636, 646, 1660,
  644, 556, 650, 584, 626, 560, 644, 580, 628, 1680, 624, 560,
  648, 1662, 644, 582, 648, 536, 674, 530, 646, 580, 628, 560,
  670, 532, 646, 562, 644, 556, 672, 536, 648, 1662, 646, 1660,
  652, 554, 644, 558, 672, 538, 644, 560, 668, 560, 648, 1638,
  668, 536, 644, 1660, 668, 532, 648, 560, 648, 1660, 674, 554,
  622, 19990, 646, 580, 624, 1660, 648, 556, 648, 558, 674, 556,
  622, 560, 644, 564, 668, 536, 646, 1662, 646, 1658, 672, 534,
  648, 558, 644, 562, 648, 1662, 644, 584, 622, 558, 648, 562,
  668, 534, 670, 536, 670, 532, 672, 536, 646, 560, 646, 558,
  648, 558, 670, 534, 650, 558, 646, 560, 646, 560, 668, 1638,
  646, 1662, 646, 1660, 646, 1660, 648,
];

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const FAN_OPTIONS: FanSpeed[] = ['auto', 'low', 'medium', 'high'];

export default function ControlScreen({navigation}: Props) {
  const {acState, setAcState} = useScheduleStore();
  const insets = useSafeAreaInsets();
  const {power, temperature, fanSpeed} = acState;

  const handlePowerToggle = async () => {
    if (!isIrSupported()) {
      Alert.alert('IR Not Supported', 'This device does not have an IR blaster.');
      return;
    }
    try {
      if (power) {
        await sendAcOff(temperature, fanSpeed);
        setAcState({power: false});
      } else {
        await sendAcOn(temperature, fanSpeed, 'cool');
        setAcState({power: true});
      }
    } catch {
      Alert.alert('IR Error', 'Failed to send command. Check IR blaster.');
    }
  };

  const handleTempChange = async (delta: number) => {
    const next = Math.min(GREE_TEMP_MAX, Math.max(GREE_TEMP_MIN, temperature + delta));
    setAcState({temperature: next});
    if (power) {
      try {
        await sendAcOn(next, fanSpeed, 'cool');
      } catch {
        Alert.alert('IR Error', 'Failed to send command.');
      }
    }
  };

  const handleFanChange = async (speed: FanSpeed) => {
    setAcState({fanSpeed: speed});
    if (power) {
      try {
        await sendAcOn(temperature, speed, 'cool');
      } catch {
        Alert.alert('IR Error', 'Failed to send command.');
      }
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing.xl}]}>

      {/* Power button */}
      <View style={styles.powerSection}>
        <TouchableOpacity
          style={[styles.powerBtn, power ? styles.powerBtnOn : styles.powerBtnOff]}
          onPress={handlePowerToggle}
          activeOpacity={0.8}>
          <Text style={styles.powerIcon}>⏻</Text>
          <Text style={styles.powerLabel}>{power ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
        <Text style={[styles.statusText, {color: power ? colors.acOn : colors.textSecondary}]}>
          AC is {power ? 'running' : 'off'}
        </Text>
      </View>

      {/* Temperature */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>TEMPERATURE</Text>
        <View style={styles.tempRow}>
          <TouchableOpacity
            style={styles.tempBtn}
            onPress={() => handleTempChange(-1)}
            activeOpacity={0.7}>
            <Text style={styles.tempBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.tempValue}>{temperature}°C</Text>
          <TouchableOpacity
            style={styles.tempBtn}
            onPress={() => handleTempChange(1)}
            activeOpacity={0.7}>
            <Text style={styles.tempBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Fan Speed */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>FAN SPEED</Text>
        <View style={styles.fanRow}>
          {FAN_OPTIONS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.fanBtn, fanSpeed === f && styles.fanBtnActive]}
              onPress={() => handleFanChange(f)}
              activeOpacity={0.7}>
              <Text style={[styles.fanBtnText, fanSpeed === f && styles.fanBtnTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Schedules button */}
      <TouchableOpacity
        style={styles.schedulesBtn}
        onPress={() => navigation.navigate('Schedules')}
        activeOpacity={0.85}>
        <Text style={styles.schedulesBtnText}>📅  View Schedules</Text>
      </TouchableOpacity>

      {/* DEBUG A — raw replay (reference bytes + reference timings) */}
      <TouchableOpacity
        style={styles.debugBtn}
        onPress={async () => {
          if (!isIrSupported()) { Alert.alert('IR Not Supported', 'No IR blaster.'); return; }
          try {
            await sendRawDebug(GREE_RAW_TEST);
            Alert.alert('[A] Sent', 'Ref bytes + ref timings');
          } catch (e: unknown) { Alert.alert('[A] Error', String(e)); }
        }}
        activeOpacity={0.85}>
        <Text style={styles.debugBtnText}>[A] Ref bytes + ref timings (known-good)</Text>
      </TouchableOpacity>

      {/* DEBUG B — reference bytes encoded with our timing constants — isolates timing vs bytes */}
      <TouchableOpacity
        style={styles.debugBtn}
        onPress={async () => {
          if (!isIrSupported()) { Alert.alert('IR Not Supported', 'No IR blaster.'); return; }
          try {
            const refBytes = [0x19, 0x0A, 0x60, 0x50, 0x02, 0x23, 0x00, 0xF0];
            await sendRawDebug(encodeRawGreeBytes(refBytes));
            Alert.alert('[B] Sent', 'Ref bytes + OUR timings');
          } catch (e: unknown) { Alert.alert('[B] Error', String(e)); }
        }}
        activeOpacity={0.85}>
        <Text style={styles.debugBtnText}>[B] Ref bytes + OUR timings (confirmed good)</Text>
      </TouchableOpacity>

      {/* DEBUG C — ref byte[0]+byte[1], our byte[4]+byte[5] — bisect upper half */}
      <TouchableOpacity
        style={styles.debugBtn}
        onPress={async () => {
          if (!isIrSupported()) { Alert.alert('IR Not Supported', 'No IR blaster.'); return; }
          try {
            // ref fan(low)+temp(26) | our swing(0)+display(0x21)
            // bytes: {0x19, 0x0A, 0x60, 0x50, 0x00, 0x21, 0x00, 0xF0}
            await sendRawDebug(encodeRawGreeBytes([0x19, 0x0A, 0x60, 0x50, 0x00, 0x21, 0x00, 0xF0]));
            Alert.alert('[C] Sent', 'Ref b0+b1, our b4+b5');
          } catch (e: unknown) { Alert.alert('[C] Error', String(e)); }
        }}
        activeOpacity={0.85}>
        <Text style={styles.debugBtnText}>[C] Ref fan+temp, our swing+display</Text>
      </TouchableOpacity>

      {/* DEBUG D — our byte[0]+byte[1], ref byte[4]+byte[5] — bisect lower half */}
      <TouchableOpacity
        style={styles.debugBtn}
        onPress={async () => {
          if (!isIrSupported()) { Alert.alert('IR Not Supported', 'No IR blaster.'); return; }
          try {
            // our fan(medium)+temp(25) | ref swing(0x02)+display(0x23)
            // bytes: {0x29, 0x09, 0x60, 0x50, 0x02, 0x23, 0x00, 0xE0}
            await sendRawDebug(encodeRawGreeBytes([0x29, 0x09, 0x60, 0x50, 0x02, 0x23, 0x00, 0xE0]));
            Alert.alert('[D] Sent', 'Our b0+b1, ref b4+b5');
          } catch (e: unknown) { Alert.alert('[D] Error', String(e)); }
        }}
        activeOpacity={0.85}>
        <Text style={styles.debugBtnText}>[D] Our fan+temp, ref swing+display</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  content: {padding: spacing.md, alignItems: 'center'},
  powerSection: {alignItems: 'center', marginVertical: spacing.xl},
  powerBtn: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 4},
  },
  powerBtnOn: {backgroundColor: colors.primary},
  powerBtnOff: {backgroundColor: colors.surface, borderWidth: 3, borderColor: colors.border},
  powerIcon: {fontSize: 36, color: colors.textPrimary},
  powerLabel: {fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: 4},
  statusText: {marginTop: spacing.sm, fontSize: fontSize.sm, fontWeight: '600'},
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    width: '100%',
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
  },
  cardTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  tempRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl},
  tempBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tempBtnText: {fontSize: 24, color: '#fff', lineHeight: 28},
  tempValue: {fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary, minWidth: 80, textAlign: 'center'},
  fanRow: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
  fanBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  fanBtnActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  fanBtnText: {fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '600'},
  fanBtnTextActive: {color: '#fff'},
  schedulesBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  schedulesBtnText: {fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary},
  debugBtn: {
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: '#3a1a1a',
    borderWidth: 1,
    borderColor: '#cc4444',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  debugBtnText: {fontSize: fontSize.sm, fontWeight: '600', color: '#ff6666'},
});
