import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  PanResponder,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  FlatList,
  Image
} from 'react-native';
import { Appbar, FAB, Card, Button, IconButton, Menu, Provider } from 'react-native-paper';
import { getDatabase, ref, onValue, set, push, update, remove } from 'firebase/database';
import { getAuth } from 'firebase/auth';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const NoteView = ({ note, onPress, onLongPress, onDrag, onResize, isSelected }) => {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onPress(note.id);
      },
      onPanResponderMove: (e, gestureState) => {
        onDrag(note.id, gestureState.dx, gestureState.dy);
      },
    })
  ).current;

  const colors = ['#FFEB3B', '#FF9800', '#F44336', '#9C27B0', '#2196F3', '#4CAF50'];
  
  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.noteContainer,
        {
          left: note.position.x,
          top: note.position.y,
          width: note.size.width,
          height: note.size.height,
          backgroundColor: note.color || '#FFEB3B',
          zIndex: note.zIndex || 1,
          borderWidth: isSelected ? 2 : 0,
          borderColor: isSelected ? '#2196F3' : 'transparent',
        },
      ]}
      onLongPress={() => onLongPress(note.id)}
    >
      <ScrollView style={styles.noteContent}>
        <Text style={styles.noteText}>{note.content}</Text>
        
        {note.checklist && note.checklist.length > 0 && (
          <View style={styles.checklistContainer}>
            {note.checklist.map((item, index) => (
              <View key={index} style={styles.checklistItem}>
                <TouchableOpacity
                  onPress={() => {}}
                  style={[
                    styles.checkbox,
                    item.checked && styles.checkedBox,
                  ]}
                >
                  {item.checked && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text style={[styles.checklistText, item.checked && styles.checkedText]}>
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {note.tags && note.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {note.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        
        {note.linkedTaskId && (
          <View style={styles.linkedTaskIndicator}>
            <Text style={styles.linkedTaskText}>مربوط بمهمة</Text>
          </View>
        )}
      </ScrollView>
      
      <TouchableOpacity
        style={styles.resizeHandle}
        onPressIn={() => onResize(note.id)}
      />
      
      <Text style={styles.noteDate}>
        {new Date(note.createdAt).toLocaleDateString('ar-SA')}
      </Text>
    </View>
  );
};

const NotesBoardScreen = ({ navigation, route }) => {
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteColor, setNewNoteColor] = useState('#FFEB3B');
  const [newNoteTags, setNewNoteTags] = useState('');
  
  const auth = getAuth();
  const database = getDatabase();
  const userId = route.params?.userId || auth.currentUser?.uid;

  const colors = ['#FFEB3B', '#FF9800', '#F44336', '#9C27B0', '#2196F3', '#4CAF50'];

  useEffect(() => {
    if (!userId) return;
    
    const notesRef = ref(database, `users/${userId}/notesBoard/notes`);
    const unsubscribe = onValue(notesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notesArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setNotes(notesArray);
      } else {
        setNotes([]);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const createNewNote = async () => {
    if (!newNoteContent.trim()) return;

    const newNote = {
      content: newNoteContent,
      color: newNoteColor,
      position: { x: Math.random() * 200, y: Math.random() * 200 },
      size: { width: 200, height: 150 },
      zIndex: notes.length + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: newNoteTags.split(',').map(tag => tag.trim()).filter(tag => tag),
      checklist: [],
      linkedTaskId: null,
      isArchived: false,
    };

    try {
      const notesRef = ref(database, `users/${userId}/notesBoard/notes`);
      const newNoteRef = push(notesRef);
      await set(newNoteRef, newNote);
      
      setShowNewNoteModal(false);
      setNewNoteContent('');
      setNewNoteTags('');
    } catch (error) {
      Alert.alert('خطأ', 'فشل في إنشاء الملاحظة');
    }
  };

  const updateNotePosition = (noteId, dx, dy) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const newPosition = {
      x: Math.max(0, Math.min(screenWidth - note.size.width, note.position.x + dx)),
      y: Math.max(0, Math.min(screenHeight - 200, note.position.y + dy)),
    };

    const noteRef = ref(database, `users/${userId}/notesBoard/notes/${noteId}`);
    update(noteRef, {
      position: newPosition,
      updatedAt: new Date().toISOString(),
    });
  };

  const deleteNote = (noteId) => {
    Alert.alert(
      'حذف الملاحظة',
      'هل أنت متأكد من حذف هذه الملاحظة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            const noteRef = ref(database, `users/${userId}/notesBoard/notes/${noteId}`);
            await remove(noteRef);
          },
        },
      ]
    );
  };

  const archiveNote = (noteId) => {
    const noteRef = ref(database, `users/${userId}/notesBoard/notes/${noteId}`);
    update(noteRef, {
      isArchived: true,
      updatedAt: new Date().toISOString(),
    });
  };

  const shareNoteWithSupervisor = (noteId) => {
    // Implementation for sharing with supervisor
    Alert.alert('مشاركة مع المراقب', 'تم إرسال الملاحظة للمراقب');
  };

  const filteredNotes = notes.filter(note => 
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Provider>
      <View style={styles.container}>
        <Appbar.Header style={styles.header}>
          <Appbar.Action icon="menu" onPress={() => setShowMenu(true)} />
          <Appbar.Content title="لوحة الملاحظات" />
          <Appbar.Action icon="magnify" onPress={() => {}} />
          <Menu
            visible={showMenu}
            onDismiss={() => setShowMenu(false)}
            anchor={<Appbar.Action icon="dots-vertical" onPress={() => setShowMenu(true)} />}
          >
            <Menu.Item onPress={() => {}} title="تغيير الخلفية" />
            <Menu.Item onPress={() => {}} title="عرض الأرشيف" />
            <Menu.Item onPress={() => {}} title="إعدادات اللوحة" />
          </Menu>
        </Appbar.Header>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="بحث في الملاحظات..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.boardContainer}>
          {filteredNotes.map(note => (
            <NoteView
              key={note.id}
              note={note}
              onPress={setSelectedNoteId}
              onLongPress={deleteNote}
              onDrag={updateNotePosition}
              onResize={() => {}}
              isSelected={selectedNoteId === note.id}
            />
          ))}
        </View>

        <FAB
          style={styles.fab}
          icon="plus"
          onPress={() => setShowNewNoteModal(true)}
        />

        <Modal
          visible={showNewNoteModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowNewNoteModal(false)}
        >
          <View style={styles.modalContainer}>
            <Card style={styles.modalCard}>
              <Card.Title title="ملاحظة جديدة" />
              <Card.Content>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="اكتب ملاحظتك هنا..."
                  value={newNoteContent}
                  onChangeText={setNewNoteContent}
                  multiline
                  numberOfLines={4}
                />
                
                <TextInput
                  style={styles.input}
                  placeholder="علامات (مفصولة بفواصل)"
                  value={newNoteTags}
                  onChangeText={setNewNoteTags}
                />

                <View style={styles.colorPicker}>
                  {colors.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        newNoteColor === color && styles.selectedColor,
                      ]}
                      onPress={() => setNewNoteColor(color)}
                    />
                  ))}
                </View>

                <View style={styles.modalButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowNewNoteModal(false)}
                    style={styles.modalButton}
                  >
                    إلغاء
                  </Button>
                  <Button
                    mode="contained"
                    onPress={createNewNote}
                    style={styles.modalButton}
                  >
                    إنشاء
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>
        </Modal>
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2196F3',
  },
  searchContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  boardContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#fafafa',
  },
  noteContainer: {
    position: 'absolute',
    borderRadius: 8,
    padding: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noteContent: {
    flex: 1,
  },
  noteText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  checklistContainer: {
    marginTop: 10,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 3,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
  },
  checklistText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 5,
    marginBottom: 5,
  },
  tagText: {
    fontSize: 10,
    color: '#666',
  },
  linkedTaskIndicator: {
    backgroundColor: '#2196F3',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  linkedTaskText: {
    color: '#fff',
    fontSize: 10,
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    backgroundColor: 'transparent',
  },
  noteDate: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    fontSize: 10,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    width: '90%',
    maxHeight: '80%',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 15,
  },
  colorOption: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#333',
    borderWidth: 3,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});

export default NotesBoardScreen;