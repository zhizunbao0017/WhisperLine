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
  Switch,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserState } from '../context/UserStateContext';
import { Companion } from '../models/PIE';
import { ThemeContext } from '../context/ThemeContext';
import { ThemedText } from '../components/ThemedText';
import MediaService from '../services/MediaService';

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
  const [editingAvatarUri, setEditingAvatarUri] = useState<string | null>(null);
  const [pickingAvatarForId, setPickingAvatarForId] = useState<string | null>(null);

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
    
    // If there's a temporary avatar URI, we need to move it to the final companion ID
    let finalAvatar: Companion['avatar'] = undefined;
    let finalAvatarUri = editingAvatarUri && editingAvatarUri.trim() ? editingAvatarUri.trim() : undefined;
    
    // CRITICAL: Check if path is temporary (ImagePicker cache) and copy to permanent storage
    if (finalAvatarUri) {
      // Check if it's a temporary path (ImagePicker cache or temp directory)
      const isTemporary = finalAvatarUri.includes('Caches/ImagePicker') || 
                         finalAvatarUri.includes('cache/ImagePicker') ||
                         finalAvatarUri.includes('ImagePicker') ||
                         finalAvatarUri.includes('temp-');
      
      if (isTemporary) {
        console.warn('[ManageCompanionsScreen] ⚠️ CRITICAL: Found temporary path in editingAvatarUri, copying to permanent storage:', finalAvatarUri);
        try {
          // Use MediaService to copy the temporary image to the final companion location
          const fileInfo = await MediaService.getMediaAssetInfo(finalAvatarUri);
          if (fileInfo.exists) {
            const mediaAsset = await MediaService.importExternalImage(
              finalAvatarUri,
              'companion',
              newId
            );
            finalAvatarUri = mediaAsset.localPath;
            
            // Verify the new path is permanent
            if (finalAvatarUri.includes('Caches/ImagePicker') || finalAvatarUri.includes('ImagePicker')) {
              throw new Error('Failed to copy to permanent storage - path still temporary');
            }
            
            console.log('[ManageCompanionsScreen] ✅ Successfully copied to permanent path:', finalAvatarUri);
            
            // Delete the temporary file
            try {
              await MediaService.deleteMediaAsset(editingAvatarUri);
            } catch (error) {
              console.warn('[ManageCompanionsScreen] Failed to delete temporary avatar:', error);
            }
          } else {
            console.error('[ManageCompanionsScreen] Temporary file does not exist:', finalAvatarUri);
            finalAvatarUri = undefined; // Don't use non-existent file
          }
        } catch (error) {
          console.error('[ManageCompanionsScreen] ⚠️ CRITICAL: Failed to copy temporary avatar to permanent storage:', error);
          // Don't save with temporary path - it will cause infinite loops
          finalAvatarUri = undefined;
          Alert.alert('Error', 'Failed to save avatar. Please try selecting the image again.');
        }
      } else {
        // Path is already permanent, verify it exists
        try {
          const fileInfo = await MediaService.getMediaAssetInfo(finalAvatarUri);
          if (!fileInfo.exists) {
            console.warn('[ManageCompanionsScreen] Permanent path does not exist:', finalAvatarUri);
            finalAvatarUri = undefined;
          }
        } catch (error) {
          console.warn('[ManageCompanionsScreen] Failed to verify permanent path:', error);
          finalAvatarUri = undefined;
        }
      }
    }
    
    // Convert avatarUri to new avatar format (only if we have a valid permanent path)
    if (finalAvatarUri && !finalAvatarUri.includes('Caches/ImagePicker') && !finalAvatarUri.includes('ImagePicker')) {
      finalAvatar = {
        type: 'image',
        source: finalAvatarUri,
      };
    } else if (finalAvatarUri) {
      // Path is still temporary - don't save it
      console.error('[ManageCompanionsScreen] ⚠️ CRITICAL: Refusing to save temporary path to companion:', finalAvatarUri);
      finalAvatar = undefined;
    }
    
    const newCompanion: Companion = {
      id: newId,
      name: name.trim(),
      isInteractionEnabled: false, // Default to disabled
      avatar: finalAvatar,
    };
    
    // Debug: Log new companion creation
    console.log('[ManageCompanionsScreen] Creating new companion:', {
      id: newId,
      name: name.trim(),
      editingAvatarUri,
      finalAvatar: newCompanion.avatar,
    });

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
    setEditingAvatarUri(null); // Clear avatar preview
  };

  const handleStartEdit = (companion: Companion) => {
    setEditingId(companion.id);
    setEditingName(companion.name);
    // Extract source from avatar object, or fallback to legacy avatarUri
    const avatarSource = companion.avatar?.source || companion.avatarUri || null;
    setEditingAvatarUri(avatarSource);
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

    // Handle avatar update: if editingAvatarUri changed, delete old avatar
    const oldCompanion = userState.companions[editingId];
    const oldAvatarSource = oldCompanion?.avatar?.source || oldCompanion?.avatarUri;
    let newAvatarSource = editingAvatarUri !== null 
      ? (editingAvatarUri && editingAvatarUri.trim() ? editingAvatarUri.trim() : undefined)
      : oldAvatarSource;
    
    // CRITICAL: Validate that new avatar source is NOT a temporary path
    if (newAvatarSource) {
      const isTemporary = newAvatarSource.includes('Caches/ImagePicker') || 
                         newAvatarSource.includes('cache/ImagePicker') ||
                         newAvatarSource.includes('ImagePicker');
      
      if (isTemporary) {
        console.error('[ManageCompanionsScreen] ⚠️ CRITICAL: Attempted to save temporary path! This should never happen.');
        console.error('[ManageCompanionsScreen] Temporary path:', newAvatarSource);
        Alert.alert('Error', 'Invalid avatar path. Please select the image again.');
        return; // Don't save with temporary path
      }
    }
    
    // If avatar changed, delete the old one
    if (oldAvatarSource && oldAvatarSource !== newAvatarSource && oldAvatarSource.startsWith('file://')) {
      // Only delete if old path is permanent (not temporary)
      const oldIsTemporary = oldAvatarSource.includes('Caches/ImagePicker') || oldAvatarSource.includes('ImagePicker');
      if (!oldIsTemporary) {
        try {
          await MediaService.deleteMediaAsset(oldAvatarSource);
        } catch (error) {
          console.warn('[ManageCompanionsScreen] Failed to delete old avatar:', error);
          // Continue with update even if deletion fails
        }
      }
    }
    
    // Convert to new avatar format (only if we have a valid permanent path)
    const newAvatar: Companion['avatar'] = newAvatarSource && 
                                           !newAvatarSource.includes('Caches/ImagePicker') && 
                                           !newAvatarSource.includes('ImagePicker')
      ? { type: 'image', source: newAvatarSource }
      : undefined;
    
    const updatedCompanions = {
      ...(userState.companions || {}),
      [editingId]: {
        ...userState.companions[editingId],
        name: editingName.trim(),
        // Preserve isInteractionEnabled if it exists, otherwise default to false
        isInteractionEnabled: userState.companions[editingId]?.isInteractionEnabled !== false,
        // Update avatar with new format
        avatar: newAvatar,
      },
    };
    
    // Debug: Log avatar URI update
    console.log('[ManageCompanionsScreen] Saving companion:', {
      id: editingId,
      name: editingName.trim(),
      editingAvatarUri,
      finalAvatarUri: updatedCompanions[editingId].avatarUri,
    });

    const updatedState = {
      ...userState,
      companions: updatedCompanions,
      lastUpdatedAt: new Date().toISOString(),
    };

    await updateUserState(updatedState);
    setEditingId(null);
    setEditingName('');
    setEditingAvatarUri(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingAvatarUri(null);
  };

  const handlePickAvatar = async (companionId: string | null) => {
    try {
      setPickingAvatarForId(companionId);
      
      // Use MediaService to handle image selection and storage
      // If companionId is null, we're adding a new companion, so use a temporary ID
      const tempId = companionId || `temp-${Date.now()}`;
      const avatar = await MediaService.assignCompanionImage(tempId);
      
      if (!avatar) {
        // User cancelled
        return;
      }

      // MediaService now returns { type: 'image', source: 'file://...' }
      // Store the avatar object temporarily in state (as string for compatibility)
      const avatarUri = avatar.source; // For temporary storage, we use source
      
      if (companionId === null) {
        // Adding new companion - store temporarily in state
        setEditingAvatarUri(avatarUri);
      } else {
        // Updating existing companion
        if (editingId === companionId) {
          // Update editing state
          setEditingAvatarUri(avatarUri);
        } else {
          // Update directly in userState with new avatar format
          const updatedCompanion = {
            ...userState.companions[companionId],
            avatar: avatar, // Use new avatar format
          };
          const updatedCompanions = {
            ...userState.companions,
            [companionId]: updatedCompanion,
          };
          const updatedState = {
            ...userState,
            companions: updatedCompanions,
            lastUpdatedAt: new Date().toISOString(),
          };
          await updateUserState(updatedState);
        }
      }
    } catch (error) {
      console.error('[ManageCompanionsScreen] Failed to pick avatar:', error);
      Alert.alert(
        'Error',
        error.message === 'Permission to access media library was denied'
          ? 'Please grant photo library access to add an avatar.'
          : 'Failed to pick image. Please try again.'
      );
    } finally {
      setPickingAvatarForId(null);
    }
  };

  const handleRemoveAvatar = async (companionId: string) => {
    try {
      const companion = userState.companions[companionId];
      const avatarUri = companion?.avatarUri;

      // Delete the media asset from storage if it exists
      if (avatarUri && avatarUri.startsWith('file://')) {
        try {
          await MediaService.deleteMediaAsset(avatarUri);
        } catch (error) {
          console.warn('[ManageCompanionsScreen] Failed to delete media asset:', error);
          // Continue with removing from state even if file deletion fails
        }
      }

      if (editingId === companionId) {
        setEditingAvatarUri(null);
      } else {
        const updatedCompanion = {
          ...userState.companions[companionId],
          avatarUri: undefined,
        };
        const updatedCompanions = {
          ...userState.companions,
          [companionId]: updatedCompanion,
        };
        const updatedState = {
          ...userState,
          companions: updatedCompanions,
          lastUpdatedAt: new Date().toISOString(),
        };
        await updateUserState(updatedState);
      }
    } catch (error) {
      console.error('[ManageCompanionsScreen] Failed to remove avatar:', error);
      Alert.alert('Error', 'Failed to remove avatar. Please try again.');
    }
  };

  // Helper to get avatar source for display
  const getAvatarUri = (companion: Companion, isEditing: boolean): string | null => {
    if (isEditing && editingAvatarUri !== null) {
      return editingAvatarUri;
    }
    // Get from new avatar format or legacy format
    return companion.avatar?.source || companion.avatarUri || null;
  };

  // Helper to get initials for fallback avatar
  const getInitials = (name: string): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Helper to get fallback color
  const getFallbackColor = (name: string): string => {
    const colors = [
      '#6C5CE7', '#E17055', '#00CEC9', '#0984E3',
      '#FF7675', '#00B894', '#FAB1A0', '#74B9FF',
      '#D63031', '#636EFA',
    ];
    if (!name) return colors[0];
    const code = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[code % colors.length];
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
            try {
              // Delete companion's avatar from storage if it exists (only for image type)
              const avatarSource = companion.avatar?.source || companion.avatarUri;
              if (avatarSource && avatarSource.startsWith('file://') && companion.avatar?.type === 'image') {
                try {
                  await MediaService.deleteMediaAsset(avatarSource);
                } catch (error) {
                  console.warn('[ManageCompanionsScreen] Failed to delete companion avatar:', error);
                  // Continue with companion deletion even if avatar deletion fails
                }
              }

              const updatedCompanions = { ...(userState.companions || {}) };
              delete updatedCompanions[companion.id];

              const updatedState = {
                ...userState,
                companions: updatedCompanions,
                lastUpdatedAt: new Date().toISOString(),
              };

              await updateUserState(updatedState);
            } catch (error) {
              console.error('[ManageCompanionsScreen] Failed to delete companion:', error);
              Alert.alert('Error', 'Failed to delete companion. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderCompanionItem = ({ item }: { item: Companion }) => {
    const isEditing = editingId === item.id;
    const avatarUri = getAvatarUri(item, isEditing);
    const initials = getInitials(isEditing ? editingName : item.name);
    const fallbackColor = getFallbackColor(isEditing ? editingName : item.name);

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
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={() => handlePickAvatar(item.id)}
                style={styles.avatarButton}
                activeOpacity={0.8}
              >
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarPreview} />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: fallbackColor }]}>
                    <ThemedText style={styles.avatarInitials}>{initials}</ThemedText>
                  </View>
                )}
                <View style={styles.avatarOverlay}>
                  <Ionicons name="camera" size={20} color="#ffffff" />
                </View>
              </TouchableOpacity>
              {avatarUri && (
                <TouchableOpacity
                  onPress={() => handleRemoveAvatar(item.id)}
                  style={styles.removeAvatarButton}
                  hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
                >
                  <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                </TouchableOpacity>
              )}
            </View>
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
              placeholder="Companion Name"
              placeholderTextColor={colors.text + '80'}
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
            {/* Avatar Display */}
            <TouchableOpacity
              onPress={() => handlePickAvatar(item.id)}
              style={styles.avatarDisplayContainer}
              activeOpacity={0.8}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarDisplay} />
              ) : (
                <View style={[styles.avatarDisplayFallback, { backgroundColor: fallbackColor }]}>
                  <ThemedText style={styles.avatarDisplayInitials}>{initials}</ThemedText>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.companionInfo}>
              <ThemedText style={styles.companionName}>{item.name}</ThemedText>
              <ThemedText
                style={[
                  styles.interactionLabel,
                  { color: colors.secondaryText },
                ]}
              >
                AI Interaction: {item.isInteractionEnabled !== false ? 'Enabled' : 'Disabled'}
              </ThemedText>
            </View>
            <View style={styles.actionButtons}>
              <View style={styles.switchContainer}>
                <Switch
                  value={item.isInteractionEnabled !== false}
                  onValueChange={async (value) => {
                    // Ensure global setting is also enabled
                    if (value && !userState.settings?.isAIInteractionEnabled) {
                      Alert.alert(
                        'Global Setting Required',
                        'Please enable "AI Companion Interaction" in Settings first to use this feature.',
                        [{ text: 'OK' }]
                      );
                      return;
                    }
                    const updatedCompanion = {
                      ...item,
                      isInteractionEnabled: value,
                    };
                    const updatedCompanions = {
                      ...userState.companions,
                      [item.id]: updatedCompanion,
                    };
                    const updatedState = {
                      ...userState,
                      companions: updatedCompanions,
                      lastUpdatedAt: new Date().toISOString(),
                    };
                    await updateUserState(updatedState);
                  }}
                  thumbColor={
                    item.isInteractionEnabled !== false
                      ? colors.primary
                      : Platform.OS === 'android'
                      ? '#f4f3f4'
                      : undefined
                  }
                  trackColor={{
                    false: colors.border,
                    true: colors.primary + '87',
                  }}
                />
              </View>
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
          
          {/* Avatar Preview for New Companion */}
          {editingAvatarUri && (
            <View style={styles.newAvatarSection}>
              <Image source={{ uri: editingAvatarUri }} style={styles.newAvatarPreview} />
              <TouchableOpacity
                onPress={() => setEditingAvatarUri(null)}
                style={styles.removeNewAvatarButton}
              >
                <Ionicons name="close-circle" size={24} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          )}
          
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
              onPress={() => handlePickAvatar(null)}
              style={[
                styles.avatarPickerButton,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={20} color={colors.primary} />
            </TouchableOpacity>
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
  companionInfo: {
    flex: 1,
    marginRight: 12,
  },
  companionName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  interactionLabel: {
    fontSize: 13,
    opacity: 0.7,
  },
  switchContainer: {
    marginRight: 8,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatarButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 28,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  removeAvatarButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  avatarDisplayContainer: {
    marginRight: 12,
  },
  avatarDisplay: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarDisplayFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDisplayInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  newAvatarSection: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  newAvatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  removeNewAvatarButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  avatarPickerButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
});

export default ManageCompanionsScreen;

