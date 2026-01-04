import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  Dialog,
  Portal,
  Title,
  Button,
} from 'react-native-paper';

const colors = [
  '#FFEB3B', // Yellow
  '#FF9800', // Orange
  '#F44336', // Red
  '#9C27B0', // Purple
  '#2196F3', // Blue
  '#4CAF50', // Green
  '#795548', // Brown
  '#607D8B', // Blue Grey
  '#FFC107', // Amber
  '#FF5722', // Deep Orange
];

const ColorPickerDialog = ({ visible, onDismiss, onColorSelected, selectedColor }) => {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>اختر اللون</Dialog.Title>
        <Dialog.Content>
          <View style={styles.colorGrid}>
            {colors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColor,
                ]}
                onPress={() => {
                  onColorSelected(color);
                  onDismiss();
                }}
              >
                {selectedColor === color && (
                  <View style={styles.checkmark}>
                    <View style={styles.checkmarkInner} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>إلغاء</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 10,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    margin: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: '#333',
    elevation: 6,
  },
  checkmark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkInner: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

export default ColorPickerDialog;