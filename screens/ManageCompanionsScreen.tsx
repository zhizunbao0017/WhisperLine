// screens/ManageCompanionsScreen.tsx

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserState } from '../context/UserStateContext';
import { Companion } from '../models/PIE';
import { ThemeContext } from '../context/ThemeContext';
import { ThemedText } from '../components/ThemedText';

const ManageCompanionsScreen = () => {
  const router = useRouter();
  const { userState, updateUserState } = useUserState();
  const themeContext = React.useContext(ThemeContext);
  const colors = themeContext?.colors ?? {
    background: '#ffffff',
    card: '#ffffff',
    text: '#111111',
    border: '#e5e5e5',
    primary: '#4a6cf7',
  };

  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const companions = useMemo(() => {
    return Object.values(userState.companions || {});
  }, [userState.companions]);

  const handleAddCompanion = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a companion name');
      return;
    }

    // Check for duplicate names
    const existingNames = companions.map((c) => c.name.toLowerCase().trim());
    if (existingNames.includes(name.toLowerCase().trim())) {
      Alert.alert('Error', 'A companion with this name already exists');
      return;
    }

    const newId = `comp-${Date.now()}`;
    const newCompanion: Companion = { id: newId, name: name.trim() };

    const updatedCompanions = {
      ...(userState.companions || {}),
      [newId]: newCompanion,
    };

    const updatedState = {
      ...userState,
      companions: updatedCompanions,
      lastUpdatedAt: new Date().toISOString(),
    };

    await updateUserState(updatedState);
    setName('');
  };

  const handleStartEdit = (companion: Companion) => {
    setEditingId(companion.id);
    setEditingName(companion.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) {
      return;
    }

    // Check for duplicate names (excluding the current one being edited)
    const existingNames = companions
      .filter((c) => c.id !== editingId)
      .map((c) => c.name.toLowerCase().trim());
    if (existingNames.includes(editingName.toLowerCase().trim())) {
      Alert.alert('Error', 'A companion with this name already exists');
      return;
    }

    const updatedCompanions = {
      ...(userState.companions || {}),
      [editingId]: {
        ...userState.companions[editingId],
        name: editingName.trim(),
      },
    };

    const updatedState = {
      ...userState,
      companions: updatedCompanions,
      lastUpdatedAt: new Date().toISOString(),
    };

    await updateUserState(updatedState);
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDeleteCompanion = (companion: Companion) => {
    Alert.alert(
      'Delete Companion',
      `Are you sure you want to delete "${companion.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedCompanions = { ...(userState.companions || {}) };
            delete updatedCompanions[companion.id];

            const updatedState = {
              ...userState,
              companions: updatedCompanions,
              lastUpdatedAt: new Date().toISOString(),
            };

            await updateUserState(updatedState);
          },
        },
      ]
    );
  };

  const renderCompanionItem = ({ item }: { item: Companion }) => {
    const isEditing = editingId === item.id;

    return (
      <View
        style={[
          styles.companionItem,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput
              style={[
                styles.editInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={editingName}
              onChangeText={setEditingName}
              autoFocus
            />
            <View style={styles.editActions}>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={[styles.editButton, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="checkmark" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={[styles.editButton, { backgroundColor: colors.border }]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.companionContent}>
            <ThemedText style={styles.companionName}>{item.name}</ThemedText>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                onPress={() => handleStartEdit(item)}
                style={styles.actionButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil" size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteCompanion(item)}
                style={styles.actionButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Manage Companions</ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {companions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color={colors.border} />
            <ThemedText style={[styles.emptyText, { color: colors.text }]}>
              No companions yet
            </ThemedText>
            <ThemedText
              style={[styles.emptySubtext, { color: colors.text }]}
            >
              Add companions to track your relationships in your diary entries
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={companions}
            keyExtractor={(item) => item.id}
            renderItem={renderCompanionItem}
            scrollEnabled={false}
            style={styles.list}
          />
        )}

        {/* Add Companion Form */}
        <View
          style={[
            styles.addForm,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <ThemedText style={[styles.addFormTitle, { color: colors.text }]}>
            Add New Companion
          </ThemedText>
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Companion's Name"
              placeholderTextColor={colors.text + '80'}
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleAddCompanion}
            />
            <TouchableOpacity
              onPress={handleAddCompanion}
              style={[
                styles.addButton,
                {
                  backgroundColor: colors.primary,
                  opacity: name.trim() ? 1 : 0.5,
                },
              ]}
              disabled={!name.trim()}
            >
              <Ionicons name="add" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  list: {
    marginBottom: 24,
  },
  companionItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  companionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  companionName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  editContainer: {
    gap: 12,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addForm: {
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ManageCompanionsScreen;

