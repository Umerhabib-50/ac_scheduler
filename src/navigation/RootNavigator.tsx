import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {RootStackParamList} from './types';
import ControlScreen from '../screens/Control';
import SchedulesScreen from '../screens/Schedules';
import AddSlotScreen from '../screens/AddSlot';
import {colors} from '../constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.primary},
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight: '700'},
        contentStyle: {backgroundColor: colors.background},
      }}>
      <Stack.Screen
        name="Home"
        component={ControlScreen}
        options={{title: 'AC Scheduler'}}
      />
      <Stack.Screen
        name="Schedules"
        component={SchedulesScreen}
        options={{title: 'Schedules'}}
      />
      <Stack.Screen
        name="AddSlot"
        component={AddSlotScreen}
        options={({route}) => ({
          title: route.params?.editSlot ? 'Edit Slot' : 'Add Slot',
        })}
      />
    </Stack.Navigator>
  );
}
