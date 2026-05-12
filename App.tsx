import React, {useEffect} from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import notifee from '@notifee/react-native';
import RootNavigator from './src/navigation/RootNavigator';
import {colors} from './src/constants/theme';
import {handleNotifeeEvent} from './src/services/scheduler/backgroundHandler';

export default function App() {
  useEffect(() => {
    console.log("umer");
    
    return notifee.onForegroundEvent(handleNotifeeEvent);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor={colors.primaryDark} barStyle="light-content" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
