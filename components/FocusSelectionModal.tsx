// components/FocusSelectionModal.tsx
import React from 'react';
import { Modal, View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyPeopleList } from './KeyPeopleList';
import { ThemedText as Text } from './ThemedText';

interface FocusSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onFocusSelect?: (id: string) => void; // Callback when a focus is selected
  colors: {
    text: string;
    secondaryText: string;
    primary: string;
    card: string;
    border: string;
    background: string;
  };
}

export function FocusSelectionModal({ isVisible, onClose, onFocusSelect, colors }: FocusSelectionModalProps) {
  return (
    <Modal
      visible={isVisible}
      onRequestClose={onClose}
      animationType="slide"
      transparent={false}
    >
      <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <View style={{ width: 40 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Your Focus</Text>
          </View>
          <Pressable
            onPress={onClose}
            style={styles.modalCloseButton}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.modalBody}>
          <KeyPeopleList
            colors={colors}
            onSelect={(id) => {
              // Call onFocusSelect if provided, otherwise just close
              if (onFocusSelect) {
                onFocusSelect(id);
              } else {
                onClose();
              }
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCloseButton: {
    padding: 8,
    width: 40,
    alignItems: 'flex-end',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
});

