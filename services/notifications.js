import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getDatabase, ref, set, push } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPushNotificationsAsync = async () => {
  let token;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alarm-channel', {
      name: 'Alarm Channel',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });

    await Notifications.setNotificationChannelAsync('task-reminder', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 100, 250],
      lightColor: '#00FF00',
    });

    await Notifications.setNotificationChannelAsync('notes-updates', {
      name: 'Notes Updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#2196F3',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    alert('فشل الحصول على إذن الإشعارات!');
    return;
  }

  token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('Push Token:', token);

  // Save token to database
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (user) {
    const database = getDatabase();
    const userRef = ref(database, `users/${user.uid}`);
    await set(userRef, {
      pushToken: token,
      lastTokenUpdate: new Date().toISOString(),
    });
  }

  return token;
};

export const scheduleTaskNotification = async (task, userId) => {
  try {
    // Parse task time
    const now = new Date();
    const [hours, minutes] = task.time.split(':');
    const taskTime = new Date();
    taskTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (taskTime <= now) {
      taskTime.setDate(taskTime.getDate() + 1);
    }

    // Calculate trigger time in seconds
    const triggerSeconds = Math.floor((taskTime - now) / 1000);

    // Schedule the notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `مهمة: ${task.title}`,
        body: task.description || 'حان وقت تنفيذ المهمة',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        data: {
          type: 'task_reminder',
          taskId: task.id,
          userId: userId,
          title: task.title,
        },
      },
      trigger: {
        seconds: triggerSeconds,
      },
    });

    // Save scheduled notification to database
    const database = getDatabase();
    const notificationRef = ref(database, `users/${userId}/scheduledNotifications/${task.id}`);
    await set(notificationRef, {
      notificationId: notificationId,
      taskId: task.id,
      scheduledFor: taskTime.toISOString(),
      title: task.title,
      status: 'scheduled',
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
};

export const cancelTaskNotification = async (taskId, userId) => {
  try {
    const database = getDatabase();
    const notificationRef = ref(database, `users/${userId}/scheduledNotifications/${taskId}`);
    
    // Get notification ID
    const notificationSnapshot = await notificationRef.get();
    if (notificationSnapshot.exists()) {
      const notificationData = notificationSnapshot.val();
      
      // Cancel the notification
      await Notifications.cancelScheduledNotificationAsync(notificationData.notificationId);
      
      // Update status in database
      await set(notificationRef, {
        ...notificationData,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error cancelling notification:', error);
    throw error;
  }
};

export const sendPushNotification = async (token, title, body, data = {}) => {
  const message = {
    to: token,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Push notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

export const showLocalNotification = async (title, body, data = {}) => {
  await Notifications.presentNotificationAsync({
    title: title,
    body: body,
    data: data,
    sound: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  });
};

export const scheduleDailyReminder = async (userId, hour, minute) => {
  try {
    // Schedule daily notification at specified time
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'DailyTask Monitor',
        body: 'حان وقت إعداد مهام اليوم',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'daily_reminder',
          userId: userId,
        },
      },
      trigger: {
        hour: hour,
        minute: minute,
        repeats: true,
      },
    });

    // Save to database
    const database = getDatabase();
    const reminderRef = ref(database, `users/${userId}/dailyReminder`);
    await set(reminderRef, {
      notificationId: notificationId,
      hour: hour,
      minute: minute,
      enabled: true,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
    throw error;
  }
};

// Notification listeners
export const setupNotificationListeners = () => {
  // Handle notification received
  Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received:', notification);
  });

  // Handle notification response
  Notifications.addNotificationResponseReceivedListener(response => {
    console.log('Notification response:', response);
    
    const { data } = response.notification.request.content;
    
    // Handle different notification types
    if (data.type === 'task_reminder') {
      // Navigate to full screen alarm
      // This would be handled in the main app component
    } else if (data.type === 'daily_reminder') {
      // Navigate to task creation screen
    }
  });
};