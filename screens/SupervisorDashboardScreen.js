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
} from 'react-native';
import {
  Appbar,
  Card,
  Button,
  IconButton,
  Provider,
  Portal,
  Dialog,
  Paragraph,
  Title,
  Avatar,
  Badge,
} from 'react-native-paper';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { getDatabase, ref, onValue, update, set, push } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const SupervisorDashboardScreen = ({ navigation, route }) => {
  const [linkedUsers, setLinkedUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTasks, setUserTasks] = useState([]);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const auth = getAuth();
  const database = getDatabase();
  const supervisorId = route.params?.supervisorId || auth.currentUser?.uid;

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (!supervisorId) return;

    // Listen for linked users
    const supervisorRef = ref(database, `supervisors/${supervisorId}`);
    const unsubscribeSupervisor = onValue(supervisorRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.linkedUsers) {
        const userIds = Object.keys(data.linkedUsers);
        fetchUsersData(userIds);
      }
    });

    return () => unsubscribeSupervisor();
  }, [supervisorId]);

  const fetchUsersData = async (userIds) => {
    const users = [];
    for (const userId of userIds) {
      const userRef = ref(database, `users/${userId}`);
      onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
          users.push({ id: userId, ...userData });
          setLinkedUsers([...users]);
        }
      });
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    
    try {
      const qrData = JSON.parse(data);
      
      if (qrData.type === 'user_link' && qrData.userId) {
        // Link supervisor to user
        const supervisorRef = ref(database, `supervisors/${supervisorId}/linkedUsers/${qrData.userId}`);
        await set(supervisorRef, {
          linkedAt: new Date().toISOString(),
          userId: qrData.userId,
        });

        // Also update user side
        const userRef = ref(database, `users/${qrData.userId}/supervisor`);
        await set(userRef, {
          supervisorId: supervisorId,
          linkedAt: new Date().toISOString(),
        });

        Alert.alert('نجاح', 'تم الربط بنجاح');
        setShowQRScanner(false);
        setScanned(false);
      }
    } catch (error) {
      Alert.alert('خطأ', 'كود QR غير صالح');
    }
  };

  const selectUser = (user) => {
    setSelectedUser(user);
    
    // Listen for user's tasks
    const tasksRef = ref(database, `users/${user.id}/tasks`);
    onValue(tasksRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tasksArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
        }));
        setUserTasks(tasksArray);
      } else {
        setUserTasks([]);
      }
    });
  };

  const confirmTaskCompletion = async (taskId, confirmed) => {
    try {
      const taskRef = ref(database, `users/${selectedUser.id}/tasks/${taskId}`);
      
      if (confirmed) {
        await update(taskRef, {
          status: 'confirmed',
          confirmedAt: new Date().toISOString(),
          confirmedBy: supervisorId,
        });
        
        // Create notification for user
        const notificationRef = ref(database, `users/${selectedUser.id}/notifications`);
        const newNotification = push(notificationRef);
        await set(newNotification, {
          type: 'task_confirmed',
          taskId: taskId,
          message: 'تم تأكيد إنجاز المهمة من قبل المراقب',
          createdAt: new Date().toISOString(),
        });
        
        Alert.alert('تم', 'تم تأكيد إنجاز المهمة');
      } else {
        // Reject task - set back to pending
        await update(taskRef, {
          status: 'pending',
          rejectedAt: new Date().toISOString(),
          rejectedBy: supervisorId,
          rejectionMessage: 'لم يتم التأكد من إنجاز المهمة',
        });
        
        // Trigger alarm again
        const notificationRef = ref(database, `users/${selectedUser.id}/notifications`);
        const newNotification = push(notificationRef);
        await set(newNotification, {
          type: 'task_rejected',
          taskId: taskId,
          message: 'لم يتم تأكيد المهمة، سيتم إعادة التنبيه',
          createdAt: new Date().toISOString(),
        });
        
        Alert.alert('تم', 'تم رفض التأكيد وسيتم إعادة التنبيه');
      }
      
      setShowTaskDialog(false);
      setSelectedTask(null);
    } catch (error) {
      Alert.alert('خطأ', 'فشل في تحديث حالة المهمة');
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

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      case 'low': return 'منخفض';
      default: return 'غير محدد';
    }
  };

  if (hasPermission === null) {
    return <Text>طلب إذن الكاميرا</Text>;
  }
  if (hasPermission === false) {
    return <Text>لا يوجد إذن للوصول للكاميرا</Text>;
  }

  return (
    <Provider>
      <View style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.Content 
            title="لوحة المراقب" 
            subtitle="متابعة مهام المستخدمين"
          />
          <Appbar.Action 
            icon="qrcode-scan" 
            onPress={() => setShowQRScanner(true)} 
          />
        </Appbar.Header>

        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.statsCard}>
            <Card.Content>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{linkedUsers.length}</Text>
                  <Text style={styles.statLabel">مستخدمين مربوطين</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {userTasks.filter(t => t.status === 'done').length}
                  </Text>
                  <Text style={styles.statLabel">مهام منتهية</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {userTasks.filter(t => t.status === 'pending').length}
                  </Text>
                  <Text style={styles.statLabel">قيد الانتظار</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>المستخدمين المربوطين</Title>
            <Button 
              mode="text" 
              onPress={() => setShowQRScanner(true)}
            >
              ربط مستخدم جديد
            </Button>
          </View>

          {linkedUsers.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content>
                <Paragraph style={styles.emptyText}>
                  لم يتم ربط أي مستخدمين بعد. اضغط على زر ربط مستخدم جديد.
                </Paragraph>
                <Button 
                  mode="contained" 
                  onPress={() => setShowQRScanner(true)}
                  style={styles.linkButton}
                >
                  ربط مستخدم جديد
                </Button>
              </Card.Content>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {linkedUsers.map(user => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => selectUser(user)}
                  style={[
                    styles.userCard,
                    selectedUser?.id === user.id && styles.selectedUserCard,
                  ]}
                >
                  <Avatar.Text 
                    size={48} 
                    label={user.email?.charAt(0).toUpperCase() || 'U'} 
                  />
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {user.email}
                  </Text>
                  <Badge 
                    style={[
                      styles.userBadge,
                      { backgroundColor: userTasks.filter(t => t.status === 'done').length > 0 ? '#4CAF50' : '#FF9800' }
                    ]}
                  >
                    {userTasks.filter(t => t.status === 'done').length}
                  </Badge>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {selectedUser && (
            <View style={styles.tasksSection}>
              <Title style={styles.sectionTitle}>
                مهام {selectedUser.email}
              </Title>
              
              {userTasks.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <Card.Content>
                    <Paragraph style={styles.emptyText}>
                      لا توجد مهام لدى هذا المستخدم.
                    </Paragraph>
                  </Card.Content>
                </Card>
              ) : (
                userTasks.map(task => (
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
                        <Text style={styles.priorityText}>
                          الأولوية: {getPriorityText(task.priority)}
                        </Text>
                      </View>

                      {task.description && (
                        <Paragraph style={styles.taskDescription}>
                          {task.description}
                        </Paragraph>
                      )}

                      {task.status === 'done' && (
                        <View style={styles.taskActions}>
                          <Button
                            mode="contained"
                            onPress={() => {
                              setSelectedTask(task);
                              setShowTaskDialog(true);
                            }}
                            style={styles.confirmButton}
                          >
                            مراجعة المهمة
                          </Button>
                        </View>
                      )}
                      
                      {task.status === 'confirmed' && task.confirmedAt && (
                        <Text style={styles.confirmationText}>
                          تم التأكيد في: {new Date(task.confirmedAt).toLocaleString('ar-SA')}
                        </Text>
                      )}
                    </Card.Content>
                  </Card>
                ))
              )}
            </View>
          )}
        </ScrollView>

        {/* QR Scanner Modal */}
        <Portal>
          <Dialog visible={showQRScanner} onDismiss={() => setShowQRScanner(false)}>
            <Dialog.Title>مسح QR Code</Dialog.Title>
            <Dialog.Content style={styles.qrScannerContainer}>
              <BarCodeScanner
                onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                style={styles.qrScanner}
              />
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => {
                setShowQRScanner(false);
                setScanned(false);
              }}>
                إلغاء
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        {/* Task Confirmation Dialog */}
        <Portal>
          <Dialog visible={showTaskDialog} onDismiss={() => setShowTaskDialog(false)}>
            <Dialog.Title>تأكيد إنجاز المهمة</Dialog.Title>
            <Dialog.Content>
              <Paragraph>
                هل تم تنفيذ المهمة "{selectedTask?.title}" بالفعل؟
              </Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => confirmTaskCompletion(selectedTask?.id, false)}>
                لا، لم يتم
              </Button>
              <Button onPress={() => confirmTaskCompletion(selectedTask?.id, true)}>
                نعم، تم التنفيذ
              </Button>
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
    backgroundColor: '#4CAF50',
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
    color: '#4CAF50',
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
    marginBottom: 20,
  },
  linkButton: {
    marginTop: 10,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginRight: 10,
    alignItems: 'center',
    width: 120,
    elevation: 2,
  },
  selectedUserCard: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  userBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  tasksSection: {
    marginTop: 30,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  priorityText: {
    fontSize: 12,
    color: '#666',
  },
  taskDescription: {
    color: '#666',
    marginBottom: 10,
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  confirmationText: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
  },
  qrScannerContainer: {
    height: 300,
    width: '100%',
  },
  qrScanner: {
    flex: 1,
  },
});

export default SupervisorDashboardScreen;