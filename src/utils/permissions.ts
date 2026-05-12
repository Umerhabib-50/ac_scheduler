import {PermissionsAndroid, Platform, Alert} from 'react-native';
import notifee from '@notifee/react-native';

export async function requestBatteryOptimizationExemption(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const optimizationEnabled = await notifee.isBatteryOptimizationEnabled();
  if (!optimizationEnabled) return;
  Alert.alert(
    'Disable Battery Optimization',
    'AC Scheduler needs to be excluded from battery optimization so schedules fire when the app is closed. Tap "Open Settings" and select "Don\'t optimize" for this app.',
    [
      {text: 'Not Now', style: 'cancel'},
      {text: 'Open Settings', onPress: () => notifee.openBatteryOptimizationSettings()},
    ],
  );
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const result = await notifee.requestPermission();
  return result.authorizationStatus >= 1;
}

export async function requestExactAlarmPermission(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version < 31) return;

  const granted = await PermissionsAndroid.check(
    'android.permission.SCHEDULE_EXACT_ALARM' as any,
  );

  if (!granted) {
    Alert.alert(
      'Allow Exact Alarms',
      'AC Scheduler needs permission to fire at exact times. Tap Open Settings, find "AC Scheduler", and enable it.',
      [
        {text: 'Not Now', style: 'cancel'},
        {text: 'Open Settings', onPress: () => notifee.openAlarmPermissionSettings()},
      ],
    );
  }
}
