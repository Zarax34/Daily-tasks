import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  IconButton,
  Badge,
  Button,
} from 'react-native-paper';

const TaskCard = ({ 
  task, 
  onPress, 
  onLongPress, 
  onMarkDone, 
  onAddNote,
  showActions = true 
}) => {
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

  const formatTime = (time) => {
    return time;
  };

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(task)}
      onLongPress={() => onLongPress && onLongPress(task)}
      activeOpacity={0.8}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View 
                style={[
                  styles.priorityIndicator, 
                  { backgroundColor: getPriorityColor(task.priority) }
                ]} 
              />
              <Title style={styles.title} numberOfLines={1}>
                {task.title}
              </Title>
            </View>
            
            <Badge 
              style={[
                styles.statusBadge, 
                { backgroundColor: getStatusColor(task.status) }
              ]}
            >
              {getStatusText(task.status)}
            </Badge>
          </View>

          <View style={styles.timeContainer}>
            <View style={styles.timeRow}>
              <IconButton
                icon="clock"
                size={16}
                style={styles.timeIcon}
              />
              <Paragraph style={styles.timeText}>
                {formatTime(task.time)}
              </Paragraph>
            </View>
            
            <Paragraph style={styles.priorityText}>
              الأولوية: {
                task.priority === 'high' ? 'عالية' :
                task.priority === 'medium' ? 'متوسطة' : 'منخفضة'
              }
            </Paragraph>
          </View>

          {task.description && (
            <Paragraph style={styles.description} numberOfLines={2}>
              {task.description}
            </Paragraph>
          )}

          {task.linkedNotes && task.linkedNotes.length > 0 && (
            <View style={styles.notesIndicator}>
              <IconButton
                icon="note"
                size={16}
                style={styles.notesIcon}
              />
              <Paragraph style={styles.notesText}>
                {task.linkedNotes.length} ملاحظات مرتبطة
              </Paragraph>
            </View>
          )}

          {task.doneAt && (
            <Paragraph style={styles.doneAtText}>
              تم الإنجاز في: {new Date(task.doneAt).toLocaleString('ar-SA')}
            </Paragraph>
          )}

          {task.confirmedAt && (
            <Paragraph style={styles.confirmedAtText}>
              تم التأكيد في: {new Date(task.confirmedAt).toLocaleString('ar-SA')}
            </Paragraph>
          )}

          {showActions && (
            <View style={styles.actions}>
              {task.status === 'pending' && (
                <Button
                  mode="contained"
                  onPress={(e) => {
                    e.stopPropagation();
                    onMarkDone && onMarkDone(task);
                  }}
                  style={styles.doneButton}
                  labelStyle={styles.doneButtonLabel}
                >
                  تم التنفيذ
                </Button>
              )}

              <IconButton
                icon="note-plus"
                size={20}
                onPress={(e) => {
                  e.stopPropagation();
                  onAddNote && onAddNote(task);
                }}
                style={styles.addNoteButton}
              />
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
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
  title: {
    fontSize: 16,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    margin: 0,
    padding: 0,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  priorityText: {
    fontSize: 12,
    color: '#666',
  },
  description: {
    color: '#666',
    marginBottom: 8,
  },
  notesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesIcon: {
    margin: 0,
    padding: 0,
    marginRight: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#2196F3',
  },
  doneAtText: {
    fontSize: 12,
    color: '#4CAF50',
    marginBottom: 4,
  },
  confirmedAtText: {
    fontSize: 12,
    color: '#2196F3',
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  doneButton: {
    flex: 1,
    marginRight: 8,
  },
  doneButtonLabel: {
    fontSize: 14,
  },
  addNoteButton: {
    margin: 0,
  },
});

export default TaskCard;