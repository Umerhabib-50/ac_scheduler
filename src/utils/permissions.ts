import {PermissionsAndroid, Platform, Alert} from 'react-native';
import notifee from '@notifee/react-native';

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
