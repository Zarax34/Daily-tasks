import { Platform } from 'react-native';
import { scheduleTaskNotification, cancelTaskNotification } from './notifications';
import { getDatabase, ref, onValue, update, set, push } from 'firebase/database';
import { getAuth } from 'firebase/auth';

class AlarmService {
  constructor() {
    this.alarms = new Map();
    this.auth = getAuth();
    this.database = getDatabase();
    this.userId = null;
    
    // Initialize user ID
    if (this.auth.currentUser) {
      this.userId = this.auth.currentUser.uid;
      this.initializeAlarms();
    }
    
    // Listen for auth changes
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.userId = user.uid;
        this.initializeAlarms();
      } else {
        this.userId = null;
        this.clearAllAlarms();
      }
    });
  }

  initializeAlarms() {
    if (!this.userId) return;

    // Listen for tasks changes
    const tasksRef = ref(this.database, `users/${this.userId}/tasks`);
    onValue(tasksRef, (snapshot) => {
      const tasks = snapshot.val();
      if (tasks) {
        this.syncAlarmsWithTasks(tasks);
      }
    });
  }

  syncAlarmsWithTasks(tasks) {
    const taskIds = Object.keys(tasks);
    const currentAlarmIds = Array.from(this.alarms.keys());

    // Add new alarms
    taskIds.forEach(taskId => {
      const task = tasks[taskId];
      if (task.status === 'pending' && !this.alarms.has(taskId)) {
        this.scheduleAlarm(taskId, task);
      }
    });

    // Remove completed/cancelled alarms
    currentAlarmIds.forEach(alarmId => {
      if (!taskIds.includes(alarmId) || tasks[alarmId].status !== 'pending') {
        this.cancelAlarm(alarmId);
      }
    });
  }

  async scheduleAlarm(taskId, task) {
    try {
      // Schedule notification
      const notificationId = await scheduleTaskNotification(task, this.userId);
      
      // Store alarm info
      this.alarms.set(taskId, {
        notificationId: notificationId,
        task: task,
        scheduledAt: new Date().toISOString(),
        status: 'scheduled',
      });

      // Save to database
      const alarmRef = ref(this.database, `users/${this.userId}/alarms/${taskId}`);
      await set(alarmRef, {
        notificationId: notificationId,
        taskId: taskId,
        scheduledAt: new Date().toISOString(),
        status: 'scheduled',
        taskTitle: task.title,
        taskTime: task.time,
      });

      console.log(`Alarm scheduled for task: ${task.title} at ${task.time}`);
      
    } catch (error) {
      console.error('Error scheduling alarm:', error);
      throw error;
    }
  }

  async cancelAlarm(taskId) {
    try {
      const alarm = this.alarms.get(taskId);
      if (alarm) {
        // Cancel notification
        await cancelTaskNotification(taskId, this.userId);
        
        // Remove from memory
        this.alarms.delete(taskId);
        
        // Update database
        const alarmRef = ref(this.database, `users/${this.userId}/alarms/${taskId}`);
        await update(alarmRef, {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
        });
        
        console.log(`Alarm cancelled for task: ${taskId}`);
      }
    } catch (error) {
      console.error('Error cancelling alarm:', error);
      throw error;
    }
  }

  async triggerAlarm(taskId, task) {
    try {
      // Update alarm status
      const alarm = this.alarms.get(taskId);
      if (alarm) {
        alarm.status = 'triggered';
        alarm.triggeredAt = new Date().toISOString();
      }

      // Update database
      const alarmRef = ref(this.database, `users/${this.userId}/alarms/${taskId}`);
      await update(alarmRef, {
        status: 'triggered',
        triggeredAt: new Date().toISOString(),
      });

      // Create alarm event
      const alarmEventRef = push(ref(this.database, `users/${this.userId}/alarmEvents`));
      await set(alarmEventRef, {
        taskId: taskId,
        taskTitle: task.title,
        triggeredAt: new Date().toISOString(),
        type: 'task_alarm',
        status: 'active',
      });

      // Start persistent alarm
      this.startPersistentAlarm(task);
      
      console.log(`Alarm triggered for task: ${task.title}`);
      
    } catch (error) {
      console.error('Error triggering alarm:', error);
      throw error;
    }
  }

  startPersistentAlarm(task) {
    // This would integrate with native modules for persistent alarms
    // For now, we'll use local notifications and background tasks
    
    if (Platform.OS === 'android') {
      // Use native module for persistent alarm
      this.startAndroidForegroundService(task);
    }
  }

  startAndroidForegroundService(task) {
    // This would require a native module implementation
    // The service would:
    // 1. Show persistent notification
    // 2. Play alarm sound in loop
    // 3. Vibrate with pattern
    // 4. Keep screen awake
    // 5. Listen for user confirmation
    
    console.log('Starting foreground service for alarm:', task.title);
  }

  async confirmTaskCompletion(taskId) {
    try {
      // Stop the alarm
      await this.stopAlarm(taskId);
      
      // Update task status
      const taskRef = ref(this.database, `users/${this.userId}/tasks/${taskId}`);
      await update(taskRef, {
        status: 'done',
        doneAt: new Date().toISOString(),
      });

      // Notify supervisor
      await this.notifySupervisor(taskId);
      
      console.log(`Task completion confirmed: ${taskId}`);
      
    } catch (error) {
      console.error('Error confirming task completion:', error);
      throw error;
    }
  }

  async stopAlarm(taskId) {
    try {
      const alarm = this.alarms.get(taskId);
      if (alarm && alarm.status === 'triggered') {
        // Update status
        alarm.status = 'completed';
        alarm.completedAt = new Date().toISOString();
        
        // Update database
        const alarmRef = ref(this.database, `users/${this.userId}/alarms/${taskId}`);
        await update(alarmRef, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });

        // Stop foreground service
        this.stopForegroundService();
        
        console.log(`Alarm stopped for task: ${taskId}`);
      }
    } catch (error) {
      console.error('Error stopping alarm:', error);
      throw error;
    }
  }

  stopForegroundService() {
    // Stop native foreground service
    console.log('Stopping foreground service');
  }

  async notifySupervisor(taskId) {
    try {
      // Get supervisor
      const supervisorRef = ref(this.database, `users/${this.userId}/supervisor`);
      const supervisorSnapshot = await supervisorRef.get();
      
      if (supervisorSnapshot.exists()) {
        const supervisor = supervisorSnapshot.val();
        
        // Create notification for supervisor
        const notificationRef = push(ref(this.database, `supervisors/${supervisor.supervisorId}/notifications`));
        await set(notificationRef, {
          type: 'task_completed',
          userId: this.userId,
          taskId: taskId,
          message: `قام المستخدم بإنهاء المهمة`,
          createdAt: new Date().toISOString(),
          status: 'pending',
        });
        
        console.log('Supervisor notified about task completion');
      }
    } catch (error) {
      console.error('Error notifying supervisor:', error);
    }
  }

  clearAllAlarms() {
    this.alarms.clear();
    console.log('All alarms cleared');
  }

  async snoozeAlarm(taskId, minutes = 5) {
    try {
      // Cancel current alarm
      await this.cancelAlarm(taskId);
      
      // Reschedule after snooze time
      const task = this.alarms.get(taskId)?.task;
      if (task) {
        const snoozeTime = new Date();
        snoozeTime.setMinutes(snoozeTime.getMinutes() + minutes);
        
        // Update task time temporarily
        const tempTask = { ...task };
        tempTask.time = `${snoozeTime.getHours().toString().padStart(2, '0')}:${snoozeTime.getMinutes().toString().padStart(2, '0')}`;
        
        // Schedule new alarm
        await this.scheduleAlarm(`${taskId}_snooze`, tempTask);
        
        console.log(`Alarm snoozed for ${minutes} minutes`);
      }
    } catch (error) {
      console.error('Error snoozing alarm:', error);
      throw error;
    }
  }

  // Background task handler
  async handleBackgroundTask(taskId, taskData) {
    console.log('Handling background task:', taskId, taskData);
    
    // This would be called by the background task manager
    // when it's time to trigger an alarm
    
    if (taskData.type === 'task_alarm') {
      await this.triggerAlarm(taskData.taskId, taskData.task);
    }
  }
}

// Export singleton instance
export default new AlarmService();