import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import EmployeesScreen from '../screens/EmployeesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LoadingScreen from '../screens/LoadingScreen';
import AttendanceReportsScreen from '../screens/AttendanceReportsScreen';
import TodayAttendanceScreen from '../screens/TodayAttendanceScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import QuickActionsScreen from '../screens/QuickActionsScreen';
import FaceGalleryScreen from '../screens/FaceGalleryScreen';
import AttendanceImageScreen from '../screens/AttendanceImageScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminSupervisorsScreen from '../screens/admin/AdminSupervisorsScreen';
import AdminEmployeesScreen from '../screens/admin/AdminEmployeesScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import SupervisorDetailsScreen from '../screens/admin/SupervisorDetailsScreen';
import AttendanceManagementScreen from '../screens/admin/AttendanceManagementScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

const SupervisorTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Dashboard') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Employees') {
          iconName = focused ? 'people' : 'people-outline';
        } else if (route.name === 'QuickActions') {
          iconName = focused ? 'grid' : 'grid-outline';
        } else if (route.name === 'Settings') {
          iconName = focused ? 'settings' : 'settings-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#007bff',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} />
    <Tab.Screen name="Employees" component={EmployeesScreen} />
    <Tab.Screen
      name="QuickActions"
      component={QuickActionsScreen}
      options={{ tabBarLabel: 'Actions' }}
    />
    <Tab.Screen name="Settings" component={SettingsScreen} />
  </Tab.Navigator>
);

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'AdminDashboard') {
          iconName = focused ? 'speedometer' : 'speedometer-outline';
        } else if (route.name === 'AdminSupervisors') {
          iconName = focused ? 'people' : 'people-outline';
        } else if (route.name === 'AdminEmployees') {
          iconName = focused ? 'person' : 'person-outline';
        } else if (route.name === 'AdminAnalytics') {
          iconName = focused ? 'analytics' : 'analytics-outline';
        } else if (route.name === 'AdminSettings') {
          iconName = focused ? 'settings' : 'settings-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#dc3545',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
    })}
  >
    <Tab.Screen
      name="AdminDashboard"
      component={AdminDashboardScreen}
      options={{ tabBarLabel: 'Dashboard' }}
    />
    <Tab.Screen
      name="AdminSupervisors"
      component={AdminSupervisorsScreen}
      options={{ tabBarLabel: 'Supervisors' }}
    />
    <Tab.Screen
      name="AdminEmployees"
      component={AdminEmployeesScreen}
      options={{ tabBarLabel: 'Employees' }}
    />
    <Tab.Screen
      name="AdminAnalytics"
      component={AdminAnalyticsScreen}
      options={{ tabBarLabel: 'Analytics' }}
    />
    <Tab.Screen
      name="AdminSettings"
      component={AdminSettingsScreen}
      options={{ tabBarLabel: 'Settings' }}
    />
  </Tab.Navigator>
);

const SupervisorStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="SupervisorTabs" component={SupervisorTabs} />
    <Stack.Screen name="AttendanceReports" component={AttendanceReportsScreen} />
    <Stack.Screen name="TodayAttendance" component={TodayAttendanceScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="FaceGallery" component={FaceGalleryScreen} />
    <Stack.Screen name="AttendanceImages" component={AttendanceImageScreen} />
  </Stack.Navigator>
);

const AdminStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminTabs" component={AdminTabs} />
    <Stack.Screen name="SupervisorDetails" component={SupervisorDetailsScreen} />
    <Stack.Screen name="AttendanceManagement" component={AttendanceManagementScreen} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  const getMainStack = () => {
    if (!isAuthenticated) return <AuthStack />;

    // Route based on user role
    if (user?.role === 'admin') {
      return <AdminStack />;
    } else {
      return <SupervisorStack />;
    }
  };

  return (
    <NavigationContainer>
      {getMainStack()}
    </NavigationContainer>
  );
};

export default AppNavigator;
