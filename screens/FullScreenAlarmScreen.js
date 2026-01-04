import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  BackHandler,
  Modal,
  TextInput,
} from 'react-native';
import {
  Appbar,
  Card,
  Button,
  Title,
  Paragraph,
  Provider,
  Portal,
  Dialog,
} from 'react-native-paper';
import { Audio } from 'expo-av';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const FullScreenAlarmScreen = ({ navigation, route }) => {
  const [task, setTask] = useState(null);
  const [sound, setSound] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(true);
  
  const auth = getAuth();
  const database = getDatabase();
  const userId = route.params?.userId || auth.currentUser?.uid;
  const taskId = route.params?.taskId;

  useEffect(() => {
    // Prevent back button
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true
    );

    // Keep screen awake
    // This would require additional native modules

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (!userId || !taskId) return;

    // Load task data
    const taskRef = ref(database, `users/${userId}/tasks/${taskId}`);
    const unsubscribe = onValue(taskRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTask(data);
        
        // If task is confirmed, stop alarm
        if (data.status === 'confirmed') {
          stopAlarm();
        }
      }
    });

    // Play alarm sound
    playAlarmSound();
    
    // Start vibration
    startVibration();

    return () => {
      unsubscribe();
      stopAlarm();
    };
  }, [userId, taskId]);

  const playAlarmSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/alarm-sound.mp3'), // You need to add this file
        {
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
        }
      );
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.log('Error playing sound:', error);
      // Fallback to system alarm
    }
  };

  const stopAlarmSound = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
  };

  const startVibration = () => {
    // Vibrate with pattern
    Vibration.vibrate([1000, 1000, 1000], true);
  };

  const stopVibration = () => {
    Vibration.cancel();
  };

  const stopAlarm = () => {
    setIsAlarmActive(false);
    stopAlarmSound();
    stopVibration();
  };

  const markTaskAsDone = async () => {
    if (!task) return;

    try {
      const taskRef = ref(database, `users/${userId}/tasks/${taskId}`);
      await update(taskRef, {
        status: 'done',
        doneAt: new Date().toISOString(),
      });

      stopAlarm();
      
      // Notify supervisor
      notifySupervisor();
      
      Alert.alert(
        'تم',
        'تم إرسال طلب التأكيد للمراقب',
        [{ text: 'حسناً', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحديث حالة المهمة');
    }
  };

  const notifySupervisor = async () => {
    // Send FCM notification to supervisor
    try {
      const notificationsRef = ref(database, `notifications`);
      const newNotification = push(notificationsRef);
      
      await set(newNotification, {
        type: 'task_completed',
        userId: userId,
        taskId: taskId,
        taskTitle: task?.title,
        message: `قام المستخدم بإنهاء المهمة: ${task?.title}`,
        createdAt: new Date().toISOString(),
        status: 'pending',
      });
    } catch (error) {
      console.log('Error notifying supervisor:', error);
    }
  };

  const snoozeAlarm = () => {
    // Snooze for 5 minutes
    Alert.alert(
      'تأجيل التنبيه',
      'سيتم إعادة التنبيه بعد 5 دقائق',
      [
        { 
          text: 'حسناً', 
          onPress: () => {
            stopAlarm();
            // Schedule alarm after 5 minutes
            setTimeout(() => {
              playAlarmSound();
              startVibration();
              setIsAlarmActive(true);
            }, 5 * 60 * 1000);
            navigation.goBack();
          } 
        }
      ]
    );
  };

  if (!task) {
    return (
      <View style={styles.loadingContainer}>
        <Text>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <Provider>
      <View style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.Content title="تنبيه المهمة" />
        </Appbar.Header>

        <View style={styles.alarmContainer}>
          <View style={styles.alarmHeader}>
            <Text style={styles.alarmTime}>
              {new Date().toLocaleTimeString('ar-SA')}
            </Text>
            <Text style={styles.alarmDate}>
              {new Date().toLocaleDateString('ar-SA')}
            </Text>
          </View>

          <Card style={styles.taskCard}>
            <Card.Content>
              <Title style={styles.taskTitle}>{task.title}</Title>
              
              <View style={styles.taskInfo}>
                <Text style={styles.taskTime}>⏰ {task.time}</Text>
                <View style={[
                  styles.priorityBadge, 
                  { backgroundColor: 
                    task.priority === 'high' ? '#F44336' :
                    task.priority === 'medium' ? '#FF9800' : '#4CAF50'
                  }
                ]}>
                  <Text style={styles.priorityText}>
                    {task.priority === 'high' ? 'عالي' :
                     task.priority === 'medium' ? 'متوسط' : 'منخفض'}
                  </Text>
                </View>
              </View>

              {task.description && (
                <Paragraph style={styles.taskDescription}>
                  {task.description}
                </Paragraph>
              )}

              <View style={styles.taskMeta}>
                <Text style={styles.taskStatus}>
                  الحالة: {
                    task.status === 'pending' ? 'قيد الانتظار' :
                    task.status === 'done' ? 'منتهية' :
                    task.status === 'confirmed' ? 'مؤكدة' : 'غير معروف'
                  }
                </Text>
              </View>
            </Card.Content>
          </Card>

          {task.status === 'pending' ? (
            <View style={styles.actionsContainer}>
              <Button
                mode="contained"
                onPress={markTaskAsDone}
                style={[styles.actionButton, styles.doneButton]}
                labelStyle={styles.actionButtonText}
              >
                ✅ تم تنفيذ المهمة
              </Button>
              
              <Button
                mode="outlined"
                onPress={snoozeAlarm}
                style={[styles.actionButton, styles.snoozeButton]}
                labelStyle={styles.actionButtonText}
              >
                ⏰ تأجيل 5 دقائق
              </Button>
            </View>
          ) : task.status === 'done' ? (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingText}>
                ⏳ جاري انتظار تأكيد المراقب...
              </Text>
              <Text style={styles.waitingSubtext}>
                سيتم إيقاف التنبيه فور تأكيد المراقب
              </Text>
            </View>
          ) : task.status === 'confirmed' ? (
            <View style={styles.confirmedContainer}>
              <Text style={styles.confirmedText}>
                ✅ تم تأكيد المهمة من المراقب
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                العودة
              </Button>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            التطبيق يعمل في الخلفية للحفاظ على التنبيه
          </Text>
        </View>
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#F44336',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  alarmHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  alarmTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#F44336',
  },
  alarmDate: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
  },
  taskCard: {
    borderRadius: 15,
    elevation: 5,
    marginBottom: 30,
    backgroundColor: '#fff',
  },
  taskTitle: {
    fontSize: 24,
    marginBottom: 15,
    textAlign: 'center',
  },
  taskInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  taskTime: {
    fontSize: 20,
    color: '#666',
  },
  priorityBadge: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  priorityText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  taskDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  taskMeta: {
    alignItems: 'center',
  },
  taskStatus: {
    fontSize: 16,
    color: '#666',
  },
  actionsContainer: {
    marginTop: 30,
  },
  actionButton: {
    marginBottom: 15,
    paddingVertical: 15,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
  },
  snoozeButton: {
    borderColor: '#FF9800',
  },
  waitingContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  waitingText: {
    fontSize: 20,
    color: '#FF9800',
    marginBottom: 10,
  },
  waitingSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  confirmedContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  confirmedText: {
    fontSize: 24,
    color: '#4CAF50',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#2196F3',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default FullScreenAlarmScreen;