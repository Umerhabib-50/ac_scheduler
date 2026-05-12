import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Text} from 'react-native';
import {TabParamList, SchedulesStackParamList} from './types';
import ControlScreen from '../screens/Control';
import SchedulesScreen from '../screens/Schedules';
import AddSlotScreen from '../screens/AddSlot';
import {colors, fontSize} from '../constants/theme';

const Tab = createBottomTabNavigator<TabParamList>();
const SchedulesStack = createNativeStackNavigator<SchedulesStackParamList>();

const stackScreenOptions = {
  headerStyle: {backgroundColor: colors.primary},
  headerTintColor: '#fff',
  headerTitleStyle: {fontWeight: '700' as const},
  contentStyle: {backgroundColor: colors.background},
};

function SchedulesNavigator() {
  return (
    <SchedulesStack.Navigator screenOptions={stackScreenOptions}>
      <SchedulesStack.Screen name="Schedules" component={SchedulesScreen} options={{title: 'Schedules'}} />
      <SchedulesStack.Screen
        name="AddSlot"
        component={AddSlotScreen}
        options={({route}) => ({title: route.params?.editSlot ? 'Edit Slot' : 'Add Slot'})}
      />
    </SchedulesStack.Navigator>
  );
}

export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: {backgroundColor: colors.primary},
        headerTintColor: '#fff',
        headerTitleStyle: {fontWeight: '700'},
        tabBarStyle: {backgroundColor: colors.surface, borderTopColor: colors.border},
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {fontSize: fontSize.xs, fontWeight: '600'},
      }}>
      <Tab.Screen
        name="Remote"
        component={ControlScreen}
        options={{
          title: 'Remote',
          tabBarIcon: ({color}) => <Text style={{fontSize: 18, color}}>{'⚡'}</Text>,
        }}
      />
      <Tab.Screen
        name="SchedulesTab"
        component={SchedulesNavigator}
        options={{
          title: 'Schedules',
          headerShown: false,
          tabBarIcon: ({color}) => <Text style={{fontSize: 18, color}}>{'📅'}</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
