import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useContext, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CompanionContext } from '../context/CompanionContext';
import { ThemeContext } from '../context/ThemeContext';

const PALETTE = [
  '#6C5CE7',
  '#E17055',
  '#00CEC9',
  '#0984E3',
  '#FF7675',
  '#00B894',
  '#FAB1A0',
  '#74B9FF',
  '#D63031',
  '#636EFA',
];

const getColorForName = (name = '') => {
  if (!name) {
    return PALETTE[0];
  }
  const code = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PALETTE[code % PALETTE.length];
};

const AvatarPlaceholder = ({ name, size = 52, colors, backgroundColor }) => {
  const initials = useMemo(() => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [name]);

  return (
    <View
      style={[
        styles.placeholderAvatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor || colors?.border || '#ccc',
        },
      ]}
    >
      <Text style={[styles.placeholderInitials, { fontSize: size / 2 }]}>{initials}</Text>
    </View>
  );
};

const CompanionRow = ({ companion, onPress, onEdit, onDelete, colors }) => {
  const placeholderColor = getColorForName(companion.name);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.rowContainer,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {companion.avatarIdentifier ? (
        <Image source={{ uri: companion.avatarIdentifier }} style={styles.avatarImage} />
      ) : (
        <AvatarPlaceholder name={companion.name} colors={colors} backgroundColor={placeholderColor} />
      )}
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
          {companion.name}
        </Text>
        <Text style={[styles.rowSubtitle, { color: colors.text }]}>
          Created {new Date(companion.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.rowActions}>
        <TouchableOpacity
          onPress={(event) => {
            event?.stopPropagation?.();
            onEdit && onEdit();
          }}
          style={styles.actionButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={(event) => {
            event?.stopPropagation?.();
            onDelete && onDelete();
          }}
          style={styles.actionButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error || '#E23'} />
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

const CompanionListView = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const themeContext = useContext(ThemeContext);
  const colors = themeContext?.colors ?? {
    background: '#fff',
    card: '#f5f5f5',
    border: '#ddd',
    text: '#111',
    primary: '#4a6cf7',
    error: '#E24444',
  };
  const companionContext = useContext(CompanionContext);

  const [isModalVisible, setModalVisible] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAvatarIdentifier, setFormAvatarIdentifier] = useState('');
  const [editingCompanion, setEditingCompanion] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setFormName('');
    setFormAvatarIdentifier('');
    setEditingCompanion(null);
    setModalVisible(true);
  };

  const openEditModal = (companion) => {
    setFormName(companion.name);
    setFormAvatarIdentifier(companion.avatarIdentifier);
    setEditingCompanion(companion);
    setModalVisible(true);
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={openCreateModal} style={styles.headerButton}>
          <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors]);

  if (!companionContext) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const { companions, isLoading, addCompanion, updateCompanion, deleteCompanion } = companionContext;

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Photo library access is needed to choose an avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length) {
      setFormAvatarIdentifier(result.assets[0].uri);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setFormName('');
    setFormAvatarIdentifier('');
    setEditingCompanion(null);
    setIsSaving(false);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Missing name', 'Please enter a companion name.');
      return;
    }
    try {
      setIsSaving(true);
      if (editingCompanion) {
        await updateCompanion(editingCompanion.id, {
          name: formName.trim(),
          avatarIdentifier: formAvatarIdentifier,
        });
      } else {
        await addCompanion({
          name: formName.trim(),
          avatarIdentifier: formAvatarIdentifier,
        });
      }
      closeModal();
    } catch (error) {
      console.error('Failed to save companion', error);
      Alert.alert('Error', 'Unable to save companion. Please try again.');
      setIsSaving(false);
    }
  };

  const confirmDelete = (companion) => {
    Alert.alert(
      'Delete Companion',
      `Are you sure you want to remove "${companion.name}"? Related diary entries will keep the content but lose this companion link.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCompanion(companion.id);
            } catch (error) {
              Alert.alert('删除失败', '暂时无法删除该陪伴者，请稍后重试。');
            }
          },
        },
      ]
    );
  };

  const handleNavigateToTimeline = (companion) => {
    router.push({
      pathname: '/companion-timeline',
      params: {
        id: companion.id,
        name: companion.name || '',
      },
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {companions.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyStateContainer}>
          <View style={styles.emptyStateBubble}>
            <Ionicons name="people-circle-outline" size={64} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              你还没有添加任何陪伴者
            </Text>
            <Text style={[styles.emptyDescription, { color: colors.text }]}>
              点击右上角 “+” ，为生活中的重要人物、项目或宠物创建一个专属的陪伴对象吧！
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={openCreateModal}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryButtonText}>Create Companion</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={companions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <CompanionRow
              companion={item}
              colors={colors}
              onPress={() => handleNavigateToTimeline(item)}
              onEdit={() => openEditModal(item)}
              onDelete={() => confirmDelete(item)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingCompanion ? 'Edit Companion' : 'New Companion'}
            </Text>
            <TouchableOpacity
              style={[
                styles.avatarPicker,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              onPress={handlePickAvatar}
              activeOpacity={0.85}
            >
              {formAvatarIdentifier ? (
                <Image source={{ uri: formAvatarIdentifier }} style={styles.avatarPreview} />
              ) : (
                <View style={styles.avatarPlaceholderInner}>
                  <Ionicons name="image-outline" size={28} color={colors.primary} />
                  <Text style={[styles.pickAvatarText, { color: colors.text }]}>
                    Choose Avatar
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              value={formName}
              onChangeText={setFormName}
              placeholder="Companion name"
              placeholderTextColor={colors.border}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={closeModal}
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                disabled={isSaving}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: isSaving ? 0.6 : 1,
                  },
                ]}
                disabled={isSaving}
              >
                <Text style={styles.primaryButtonText}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButton: {
    marginRight: 16,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  placeholderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  placeholderInitials: {
    color: '#fff',
    fontWeight: '600',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  rowSubtitle: {
    marginTop: 4,
    fontSize: 13,
    opacity: 0.7,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionButton: {
    padding: 6,
    marginLeft: 6,
  },
  emptyStateContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateBubble: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  avatarPicker: {
    width: '100%',
    height: 120,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  avatarPlaceholderInner: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  pickAvatarText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default CompanionListView;

