import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import {
  Appbar,
  Card,
  Button,
  FAB,
  IconButton,
  Provider,
  Portal,
  Dialog,
  Paragraph,
  Title,
} from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { getDatabase, ref, onValue, set, push, update } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import * as Notifications from 'expo-notifications';

const { width: screenWidth } = Dimensions.get('window');

const UserDashboardScreen = ({ navigation, route }) => {
  const [tasks, setTasks] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [userData, setUserData] = useState(null);
  
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [startTime, setStartTime] = useState('06:00');

  const auth = getAuth();
  const database = getDatabase();
  const userId = route.params?.userId || auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;

    // Listen for user data
    const userRef = ref(database, `users/${userId}`);
    const unsubscribeUser = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setUserData(data);
        if (data.startTime) {
          setStartTime(data.startTime);
        }
      }
    });

    // Listen for tasks
    const tasksRef = ref(database, `users/${userId}/tasks`);
    const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tasksArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
        }));
        setTasks(tasksArray);
      } else {
        setTasks([]);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribeTasks();
    };
  }, [userId]);

  const addTask = async () => {
    if (!taskTitle.trim() || !taskTime) {
      Alert.alert('خطأ', 'يرجى إدخال عنوان المهمة ووقتها');
      return;
    }

    const newTask = {
      title: taskTitle,
      time: taskTime,
      description: taskDescription,
      priority: taskPriority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      userId: userId,
    };

    try {
      const tasksRef = ref(database, `users/${userId}/tasks`);
      const newTaskRef = push(tasksRef);
      await set(newTaskRef, newTask);

      // Schedule notification
      await scheduleTaskNotification(newTask);

      setShowTaskModal(false);
      setTaskTitle('');
      setTaskTime('');
      setTaskDescription('');
      setTaskPriority('medium');
      
      Alert.alert('نجاح', 'تم إضافة المهمة بنجاح');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إضافة المهمة');
    }
  };

  const scheduleTaskNotification = async (task) => {
    // Schedule exact alarm for task
    const taskDateTime = new Date();
    const [hours, minutes] = task.time.split(':');
    taskDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (taskDateTime <= new Date()) {
      taskDateTime.setDate(taskDateTime.getDate() + 1);
    }

    // This would integrate with the alarm system
    // For now, we'll use local notifications
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `مهمة: ${task.title}`,
        body: task.description || 'حان وقت تنفيذ المهمة',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        seconds: Math.floor((taskDateTime - new Date()) / 1000),
      },
    });
  };

  const markTaskAsDone = async (taskId) => {
    try {
      const taskRef = ref(database, `users/${userId}/tasks/${taskId}`);
      await update(taskRef, {
        status: 'done',
        doneAt: new Date().toISOString(),
      });

      // Notify supervisor
      notifySupervisor(taskId, 'task_completed');
      
      Alert.alert('تم', 'تم إرسال طلب التأكيد للمراقب');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحديث حالة المهمة');
    }
  };

  const notifySupervisor = async (taskId, type) => {
    // Implementation for FCM notification to supervisor
    const supervisorRef = ref(database, `supervisors`);
    // Find linked supervisor and send notification
  };

  const updateStartTime = async () => {
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        startTime: startTime,
      });
      setShowSettingsModal(false);
      Alert.alert('نجاح', 'تم تحديث وقت بداية اليوم');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحديث الوقت');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'done': return '#4CAF50';
      case 'confirmed': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'done': return 'منتهية';
      case 'confirmed': return 'مؤكدة';
      default: return 'غير معروف';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#F44336';
      case 'medium': return '#FF9800';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  return (
    <Provider>
      <View style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.Content 
            title="DailyTask Monitor" 
            subtitle={`مرحباً ${userData?.email || ''}`}
          />
          <Appbar.Action 
            icon="cog" 
            onPress={() => setShowSettingsModal(true)} 
          />
        </Appbar.Header>

        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.statsCard}>
            <Card.Content>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{tasks.length}</Text>
                  <Text style={styles.statLabel}>إجمالي المهام</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {tasks.filter(t => t.status === 'done').length}
                  </Text>
                  <Text style={styles.statLabel">منتهية</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {tasks.filter(t => t.status === 'pending').length}
                  </Text>
                  <Text style={styles.statLabel">قيد الانتظار</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>مهام اليوم</Title>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('NotesBoard', { userId })}
            >
              عرض الملاحظات
            </Button>
          </View>

          {tasks.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Paragraph style={styles.emptyText}>
                  لا توجد مهام حالياً. أضف مهمة جديدة للبدء.
                </Paragraph>
              </Card.Content>
            </Card>
          ) : (
            tasks.map(task => (
              <Card key={task.id} style={styles.taskCard}>
                <Card.Content>
                  <View style={styles.taskHeader}>
                    <View style={styles.taskTitleRow}>
                      <View 
                        style={[
                          styles.priorityIndicator, 
                          { backgroundColor: getPriorityColor(task.priority) }
                        ]} 
                      />
                      <Title style={styles.taskTitle}>{task.title}</Title>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(task.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.taskTime}>
                    <Text style={styles.timeText}>⏰ {task.time}</Text>
                  </View>

                  {task.description && (
                    <Paragraph style={styles.taskDescription}>
                      {task.description}
                    </Paragraph>
                  )}

                  <View style={styles.taskActions}>
                    {task.status === 'pending' && (
                      <Button
                        mode="contained"
                        onPress={() => markTaskAsDone(task.id)}
                        style={styles.doneButton}
                        labelStyle={styles.doneButtonText}
                      >
                        تم التنفيذ
                      </Button>
                    )}
                    
                    <IconButton
                      icon="note-plus"
                      size={20}
                      onPress={() => navigation.navigate('NotesBoard', { 
                        userId, 
                        taskId: task.id 
                      })}
                    />
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </ScrollView>

        <FAB
          style={styles.fab}
          icon="plus"
          onPress={() => setShowTaskModal(true)}
        />

        {/* Add Task Modal */}
        <Portal>
          <Dialog visible={showTaskModal} onDismiss={() => setShowTaskModal(false)}>
            <Dialog.Title>إضافة مهمة جديدة</Dialog.Title>
            <Dialog.Content>
              <TextInput
                style={styles.input}
                placeholder="عنوان المهمة"
                value={taskTitle}
                onChangeText={setTaskTitle}
              />
              <TextInput
                style={styles.input}
                placeholder="الوقت (مثال: 14:30)"
                value={taskTime}
                onChangeText={setTaskTime}
                keyboardType="numbers-and-punctuation"
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="الوصف (اختياري)"
                value={taskDescription}
                onChangeText={setTaskDescription}
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.priorityContainer}>
                <Text style={styles.priorityLabel}>مستوى الأهمية:</Text>
                <View style={styles.priorityButtons}>
                  {['low', 'medium', 'high'].map(priority => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityButton,
                        taskPriority === priority && styles.selectedPriority,
                      ]}
                      onPress={() => setTaskPriority(priority)}
                    >
                      <Text style={[
                        styles.priorityButtonText,
                        taskPriority === priority && styles.selectedPriorityText,
                      ]}>
                        {priority === 'high' ? 'عالي' : 
                         priority === 'medium' ? 'متوسط' : 'منخفض'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowTaskModal(false)}>إلغاء</Button>
              <Button onPress={addTask}>إضافة</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* QR Code Modal */}
        <Portal>
          <Dialog visible={showQRModal} onDismiss={() => setShowQRModal(false)}>
            <Dialog.Title>QR Code الخاص بك</Dialog-title>
            <Dialog.Content>
              <View style={styles.qrContainer}>
                {userId && (
                  <QRCode
                    value={JSON.stringify({ userId, type: 'user_link' })}
                    size={200}
                  />
                )}
                <Paragraph style={styles.qrText}>
                  امسح هذا الكود للربط مع مراقب
                </Paragraph>
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowQRModal(false)}>إغلاق</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Settings Modal */}
        <Portal>
          <Dialog visible={showSettingsModal} onDismiss={() => setShowSettingsModal(false)}>
            <Dialog.Title>الإعدادات</Dialog.Title>
            <Dialog.Content>
              <Text style={styles.settingLabel}>وقت بداية اليوم:</Text>
              <TextInput
                style={styles.input}
                placeholder="مثال: 06:00"
                value={startTime}
                onChangeText={setStartTime}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowSettingsModal(false)}>إلغاء</Button>
              <Button onPress={updateStartTime}>حفظ</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
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
    backgroundColor: '#2196F3',
  },
  content: {
    padding: 16,
  },
  statsCard: {
    marginBottom: 20,
    borderRadius: 12,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyCard: {
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  taskCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 16,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskTime: {
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  taskDescription: {
    color: '#666',
    marginBottom: 10,
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doneButton: {
    flex: 1,
    marginRight: 10,
  },
  doneButtonText: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    marginTop: 10,
  },
  priorityLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  selectedPriority: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#666',
  },
  selectedPriorityText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
  },
  qrText: {
    textAlign: 'center',
    marginTop: 15,
    color: '#666',
  },
  settingLabel: {
    fontSize: 16,
    marginBottom: 10,
  },
});

export default UserDashboardScreen;