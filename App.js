import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, update } from 'firebase/database';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

// Import Screens
import LoginScreen from './screens/LoginScreen';
import UserDashboardScreen from './screens/UserDashboardScreen';
import SupervisorDashboardScreen from './screens/SupervisorDashboardScreen';
import NotesBoardScreen from './screens/NotesBoardScreen';
import FullScreenAlarmScreen from './screens/FullScreenAlarmScreen';

// Import Services
import { setupNotificationListeners } from './services/notifications';
import AlarmService from './services/alarms';

// Firebase configuration
import firebaseConfig from './config/firebase';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error, executionInfo }) => {
  console.log('Received a notification in the background!');
  // Handle background notification
});

const Stack = createStackNavigator();

const App = () => {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });

    return subscriber;
  }, []);

  useEffect(() => {
    registerForPushNotificationsAsync();
    setupNotificationListeners();
  }, []);

  const registerForPushNotificationsAsync = async () => {
    let token;
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alarm-channel', {
        name: 'Alarm Channel',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Push token:', token);

    // Save token to database
    if (user) {
      const userRef = ref(database, `users/${user.uid}`);
      await update(userRef, {
        pushToken: token,
      });
    }
  };

  if (initializing) return null;

  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={user ? 'UserDashboard' : 'Login'}
          screenOptions={{
            headerStyle: {
              backgroundColor: '#2196F3',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="UserDashboard"
            component={UserDashboardScreen}
            options={{ title: 'لوحة المستخدم' }}
          />
          <Stack.Screen
            name="SupervisorDashboard"
            component={SupervisorDashboardScreen}
            options={{ title: 'لوحة المراقب' }}
          />
          <Stack.Screen
            name="NotesBoard"
            component={NotesBoardScreen}
            options={{ title: 'لوحة الملاحظات' }}
          />
          <Stack.Screen
            name="FullScreenAlarm"
            component={FullScreenAlarmScreen}
            options={{
              headerShown: false,
              presentation: 'modal',
              animationTypeForReplace: 'pop',
              gestureEnabled: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
};

export default App;