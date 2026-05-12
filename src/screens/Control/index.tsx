import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import {useScheduleStore} from '../../store/scheduleStore';
import {colors, spacing, fontSize, radius} from '../../constants/theme';
import {FanSpeed, AcMode, SwingVPosition, SwingHPosition, DisplayTemp} from '../../types/schedule';
import {sendAcOn, sendAcOff, isIrSupported} from '../../services/ir/IrBlaster';
import {GREE_TEMP_MIN, GREE_TEMP_MAX} from '../../constants/ir';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const FAN_OPTIONS: FanSpeed[] = ['auto', 'low', 'medLow', 'medium', 'medHigh', 'high'];
const FAN_LABELS: Record<FanSpeed, string> = {
  auto: 'Auto', low: '1', medLow: '2', medium: '3', medHigh: '4', high: '5',
};
const MODE_OPTIONS: AcMode[] = ['auto', 'cool', 'dry', 'fan', 'heat'];
const SWING_V_OPTIONS: SwingVPosition[] = ['off', 'auto', 'up', 'midUp', 'middle', 'midDown', 'down'];
const SWING_V_LABELS: Record<SwingVPosition, string> = {
  off: 'Off', auto: 'Auto', up: '↑↑', midUp: '↑', middle: '—', midDown: '↓', down: '↓↓',
};

const SWING_H_OPTIONS: SwingHPosition[] = ['off', 'auto', 'fullLeft', 'left', 'center', 'right', 'fullRight'];
const SWING_H_LABELS: Record<SwingHPosition, string> = {
  off: 'Off', auto: 'Auto', fullLeft: '◀◀', left: '◀', center: '●', right: '▶', fullRight: '▶▶',
};

const MODE_LABELS: Record<AcMode, string> = {
  auto: 'Auto',
  cool: 'Cool',
  dry: 'Dry',
  fan: 'Fan',
  heat: 'Heat',
};

export default function ControlScreen() {
  const {acState, setAcState} = useScheduleStore();
  const insets = useSafeAreaInsets();
  const {power, temperature, fanSpeed, mode, turbo, sleep, swingH, swingV, xFan, light, displayTemp, healthy, scavenging} = acState;

  const DISPLAY_CYCLE: DisplayTemp[] = ['set', 'indoor', 'outdoor'];
  const DISPLAY_LABELS: Record<DisplayTemp, string> = {set: 'Set Temp', indoor: 'Indoor', outdoor: 'Outdoor'};
  const nextDisplay = DISPLAY_CYCLE[(DISPLAY_CYCLE.indexOf(displayTemp) + 1) % 3];

  const ir = (fn: () => Promise<void>) => async () => {
    if (!isIrSupported()) {
      Alert.alert('IR Not Supported', 'This device does not have an IR blaster.');
      return;
    }
    try { await fn(); } catch { Alert.alert('IR Error', 'Failed to send command.'); }
  };

  const buildParams = (overrides = {}) => ({
    temp: temperature, fanSpeed, mode, turbo, sleep, swingH, swingV, xFan, light, healthy, scavenging,
    ...overrides,
  });

  const handlePower = ir(async () => {
    if (power) {
      await sendAcOff(temperature, fanSpeed);
      setAcState({power: false});
    } else {
      await sendAcOn(buildParams());
      setAcState({power: true});
    }
  });

  const handleMode = (m: AcMode) => ir(async () => {
    setAcState({mode: m});
    if (power) await sendAcOn(buildParams({mode: m}));
  })();

  const handleTemp = (delta: number) => ir(async () => {
    const next = Math.min(GREE_TEMP_MAX, Math.max(GREE_TEMP_MIN, temperature + delta));
    setAcState({temperature: next});
    if (power) await sendAcOn(buildParams({temp: next}));
  })();

  const handleFan = (speed: FanSpeed) => ir(async () => {
    setAcState({fanSpeed: speed});
    if (power) await sendAcOn(buildParams({fanSpeed: speed}));
  })();

  const handleToggle = (key: keyof typeof acState, value: boolean) => ir(async () => {
    const updates: Partial<typeof acState> = {[key]: value};
    // turbo and sleep are mutually exclusive
    if (key === 'turbo' && value) updates.sleep = false;
    if (key === 'sleep' && value) updates.turbo = false;
    setAcState(updates);
    if (power) await sendAcOn(buildParams({[key]: value, ...(key === 'turbo' && value ? {sleep: false} : {}), ...(key === 'sleep' && value ? {turbo: false} : {})}));
  })();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + spacing.xl}]}>

      {/* Power */}
      <View style={styles.powerSection}>
        <TouchableOpacity
          style={[styles.powerBtn, power ? styles.powerBtnOn : styles.powerBtnOff]}
          onPress={handlePower}
          activeOpacity={0.8}>
          <Text style={styles.powerIcon}>⏻</Text>
          <Text style={styles.powerLabel}>{power ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
        <Text style={[styles.statusText, {color: power ? colors.acOn : colors.textSecondary}]}>
          AC is {power ? 'running' : 'off'}
        </Text>
      </View>

      {/* Mode */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>MODE</Text>
        <View style={styles.optionRow}>
          {MODE_OPTIONS.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.optionBtn, mode === m && styles.optionBtnActive]}
              onPress={() => handleMode(m)}>
              <Text style={[styles.optionBtnText, mode === m && styles.optionBtnTextActive]}>
                {MODE_LABELS[m]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Temperature */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>TEMPERATURE</Text>
        <View style={styles.tempRow}>
          <TouchableOpacity style={styles.tempBtn} onPress={() => handleTemp(-1)} activeOpacity={0.7}>
            <Text style={styles.tempBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.tempValue}>{temperature}°C</Text>
          <TouchableOpacity style={styles.tempBtn} onPress={() => handleTemp(1)} activeOpacity={0.7}>
            <Text style={styles.tempBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Fan Speed */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>FAN SPEED</Text>
        <View style={styles.optionRow}>
          {FAN_OPTIONS.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.optionBtn, fanSpeed === f && styles.optionBtnActive]}
              onPress={() => handleFan(f)}>
              <Text style={[styles.optionBtnText, fanSpeed === f && styles.optionBtnTextActive]}>
                {FAN_LABELS[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Swing */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>SWING — VERTICAL</Text>
        <View style={styles.optionRow}>
          {SWING_V_OPTIONS.map(pos => (
            <TouchableOpacity
              key={pos}
              style={[styles.swingBtn, swingV === pos && styles.optionBtnActive]}
              onPress={() => ir(async () => {
                setAcState({swingV: pos});
                if (power) await sendAcOn(buildParams({swingV: pos}));
              })()}>
              <Text style={[styles.swingBtnText, swingV === pos && styles.optionBtnTextActive]}>
                {SWING_V_LABELS[pos]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.cardTitle, {marginTop: spacing.md}]}>SWING — HORIZONTAL</Text>
        <View style={styles.optionRow}>
          {SWING_H_OPTIONS.map(pos => (
            <TouchableOpacity
              key={pos}
              style={[styles.swingBtn, swingH === pos && styles.optionBtnActive]}
              onPress={() => ir(async () => {
                setAcState({swingH: pos});
                if (power) await sendAcOn(buildParams({swingH: pos}));
              })()}>
              <Text style={[styles.swingBtnText, swingH === pos && styles.optionBtnTextActive]}>
                {SWING_H_LABELS[pos]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Quick Toggles */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>QUICK SETTINGS</Text>
        <View style={styles.optionRow}>
          {([
            ['turbo', 'Turbo', turbo],
            ['sleep', 'Sleep', sleep],
            ['xFan', 'X-FAN', xFan],
          ] as [keyof typeof acState, string, boolean][]).map(([key, label, active]) => (
            <TouchableOpacity
              key={key}
              style={[styles.toggleBtn, active && styles.toggleBtnActive]}
              onPress={() => handleToggle(key, !active)}>
              <Text style={[styles.toggleBtnText, active && styles.toggleBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Features */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>FEATURES</Text>
        <View style={styles.optionRow}>
          {([
            ['healthy', 'Healthy', healthy],
            ['scavenging', 'Scavenging', scavenging],
            ['light', 'Light', light],
          ] as [keyof typeof acState, string, boolean][]).map(([key, label, active]) => (
            <TouchableOpacity
              key={key}
              style={[styles.toggleBtn, active && styles.toggleBtnActive]}
              onPress={() => handleToggle(key, !active)}>
              <Text style={[styles.toggleBtnText, active && styles.toggleBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.optionRow, {marginTop: spacing.sm}]}>
          <TouchableOpacity
            style={styles.displayTempBtn}
            onPress={() => ir(async () => {
              setAcState({displayTemp: nextDisplay});
              await sendAcOn(buildParams({displayTemp: nextDisplay}));
            })()}>
            <Text style={styles.displayTempLabel}>Display: {DISPLAY_LABELS[displayTemp]}</Text>
            <Text style={styles.displayTempHint}>tap to show {DISPLAY_LABELS[nextDisplay]}</Text>
          </TouchableOpacity>
        </View>
      </View>

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
  optionRow: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
  optionBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    minWidth: 56,
  },
  optionBtnActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  optionBtnText: {fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '600'},
  optionBtnTextActive: {color: '#fff'},
  displayTempBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '12',
  },
  displayTempLabel: {fontSize: fontSize.sm, fontWeight: '700', color: colors.primary},
  displayTempHint: {fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2},
  swingBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    minWidth: 36,
  },
  swingBtnText: {fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '600'},
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    minWidth: 72,
  },
  toggleBtnActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  toggleBtnText: {fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '600'},
  toggleBtnTextActive: {color: '#fff'},
});
