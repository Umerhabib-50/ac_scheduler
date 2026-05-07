import {PermissionsAndroid, Platform} from 'react-native';
import notifee from '@notifee/react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const result = await notifee.requestPermission();
  return result.authorizationStatus >= 1;
}

export async function requestExactAlarmPermission(): Promise<void> {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    await PermissionsAndroid.request(
      'android.permission.SCHEDULE_EXACT_ALARM' as any,
    );
  }
}
