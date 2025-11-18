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
import * as ImagePicker from 'expo-image-picker';
import { useUserState } from '../context/UserStateContext';
import { Companion } from '../models/PIE';
import { ThemeContext } from '../context/ThemeContext';
import { ThemedText } from '../components/ThemedText';
import MediaService from '../services/MediaService';

const ManageCompanionsScreen = () => {
  const router = useRouter();
  // CRITICAL: Single source of truth - get companions directly from context
  const { userState, addCompanion, updateCompanion, deleteCompanion, isLoading } = useUserState();
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

  // CRITICAL: Convert the companions object to an array for rendering
  // This ensures any change to the global companions object will automatically trigger a re-render
  const companionsArray = Object.values(userState?.companions || {});
  
  // Debug: Log companions array and state for troubleshooting
  React.useEffect(() => {
    const companionCount = companionsArray.length;
    const companionIds = companionsArray.map(c => c.id);
    const companionNames = companionsArray.map(c => c.name);
    console.log(`[ManageCompanionsScreen] State check:`, {
      isLoading,
      userStateExists: !!userState,
      companionsObject: userState?.companions,
      companionCount,
      ids: companionIds,
      names: companionNames,
    });
  }, [companionsArray, isLoading, userState]);

  /**
   * Handle adding a new companion
   * CRITICAL: Uses the authoritative addCompanion factory function
   * Flow:
   * 1. Input Validation
   * 2. Create Companion Object (via addCompanion - atomic, with default avatar)
   * 3. Clear UI State
   * 
   * Note: Avatar changes are handled separately via handleAvatarChange after companion exists
   */
  const handleAddCompanion = async () => {
    try {
      // Step 1: Input Validation
      const trimmedName = name.trim();
      if (!trimmedName) {
        Alert.alert('Error', 'Please enter a companion name');
        return;
      }

      // Check for duplicate names
      const existingNames = companionsArray.map((c) => c.name.toLowerCase().trim());
      if (existingNames.includes(trimmedName.toLowerCase())) {
        Alert.alert('Error', 'A companion with this name already exists');
        return;
      }

      // Step 2: Create Companion Object using authoritative factory
      // CRITICAL: addCompanion creates the companion atomically with a default avatar
      // The companion MUST exist before its avatar can be changed
      const newCompanion = await addCompanion(trimmedName);
      console.log('[ManageCompanionsScreen] ✅ Created companion:', {
        id: newCompanion.id,
        name: newCompanion.name,
        hasDefaultAvatar: !!newCompanion.avatar,
      });

      // Step 3: Clear UI State
      // The companion is now created and persisted - user can change avatar by tapping camera icon
      setName('');
      setEditingAvatarUri(null); // Clear any temporary avatar selection
      
      console.log('[ManageCompanionsScreen] ✅ Companion creation completed successfully');
    } catch (error) {
      console.error('[ManageCompanionsScreen] ❌ Failed to add companion:', error);
      Alert.alert('Error', error.message || 'Failed to create companion. Please try again.');
    }
  };

  const handleStartEdit = (companion: Companion) => {
    setEditingId(companion.id);
    // CRITICAL: Ensure name is always a string, never undefined or null
    setEditingName(companion.name || '');
    // CRITICAL: Initialize editingAvatarUri to null (not the current avatar source)
    // This allows us to detect if user picked a new image during editing
    // null = no change, string = new image picked (temporary URI)
    setEditingAvatarUri(null);
  };

  /**
   * CRITICAL: Refactored handleSaveEdit to properly persist changes to global state
   * This closes the "State Island" bug in the edit modal
   * 
   * Flow:
   * 1. Validate input (name)
   * 2. Check for name change
   * 3. Check for avatar change (highest priority - must call MediaService)
   * 4. If avatar changed, call MediaService.assignCompanionImage with newAvatarUri
   * 5. Update name on the final companion object if needed
   * 6. Commit to global state via updateCompanion
   * 7. Close edit modal
   */
  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) {
      return;
    }

    // Check for duplicate names (excluding the current one being edited)
    const existingNames = companionsArray
      .filter((c) => c.id !== editingId)
      .map((c) => c.name.toLowerCase().trim());
    if (existingNames.includes(editingName.toLowerCase().trim())) {
      Alert.alert('Error', 'A companion with this name already exists');
      return;
    }

    try {
      // Get the current companion from state
      const currentCompanion = userState.companions[editingId];
      if (!currentCompanion) {
        Alert.alert('Error', 'Companion not found');
        return;
      }

      // Step 1: Check for name change
      const nameChanged = editingName.trim() !== currentCompanion.name;
      
      // Step 2: Check for avatar change (highest priority)
      // editingAvatarUri !== null means user picked a new image during editing
      const avatarChanged = editingAvatarUri !== null;
      
      let finalUpdatedCompanion: Companion = currentCompanion;

      // Step 3: Handle avatar change (highest priority - must call MediaService)
      if (avatarChanged) {
        if (editingAvatarUri && editingAvatarUri.trim()) {
          // User picked a new image - must process it through MediaService
          // CRITICAL: Pass editingAvatarUri as sourceUri to MediaService
          // MediaService will copy it to permanent storage and return complete updated companion
          console.log('[ManageCompanionsScreen] Processing new avatar through MediaService:', editingAvatarUri);
          
          const updatedCompanionFromMedia = await MediaService.assignCompanionImage(
            editingId,
            editingAvatarUri, // Pass the temporary URI from image picker
            currentCompanion
          );
          
          if (!updatedCompanionFromMedia) {
            // User cancelled or error occurred
            console.log('[ManageCompanionsScreen] Avatar processing cancelled or failed');
            return;
          }
          
          // MediaService returned complete updated companion object with new avatar
          finalUpdatedCompanion = updatedCompanionFromMedia;
          
          console.log('[ManageCompanionsScreen] ✅ Avatar processed successfully:', {
            id: finalUpdatedCompanion.id,
            hasAvatar: !!finalUpdatedCompanion.avatar,
          });
        } else {
          // User removed avatar (set to empty string)
          finalUpdatedCompanion = {
            ...currentCompanion,
            avatar: undefined,
          };
        }
      }

      // Step 4: Update name if it changed
      if (nameChanged) {
        finalUpdatedCompanion = {
          ...finalUpdatedCompanion,
          name: editingName.trim(),
        };
        console.log('[ManageCompanionsScreen] ✅ Name updated:', editingName.trim());
      }

      // Step 5: Commit to global state
      // This ensures perfect state synchronization and triggers UI re-render
      await updateCompanion(finalUpdatedCompanion);
      
      console.log('[ManageCompanionsScreen] ✅ Edit saved successfully:', {
        id: finalUpdatedCompanion.id,
        name: finalUpdatedCompanion.name,
        nameChanged,
        avatarChanged,
        hasAvatar: !!finalUpdatedCompanion.avatar,
      });

      // Step 6: Clear editing state and close modal
      setEditingId(null);
      setEditingName('');
      setEditingAvatarUri(null);
    } catch (error) {
      console.error('[ManageCompanionsScreen] ❌ Failed to save edit:', error);
      console.error('[ManageCompanionsScreen] Error details:', {
        message: error.message,
        stack: error.stack,
        editingId,
        editingName,
        editingAvatarUri,
        nameChanged,
        avatarChanged,
      });
      Alert.alert(
        'Error',
        error.message === 'Permission to access media library was denied'
          ? 'Please grant photo library access to update the avatar.'
          : `Failed to save changes: ${error.message || 'Unknown error'}. Please try again.`
      );
    }
  };

  /**
   * CRITICAL: Cancel button must be clean - only close modal, no state updates
   * This ensures no side effects when user cancels editing
   */
  const handleCancelEdit = () => {
    // Simply close the edit modal - do nothing else
    setEditingId(null);
    setEditingName('');
    setEditingAvatarUri(null);
  };

  /**
   * Handle avatar change for a companion
   * CRITICAL: Companion MUST exist before avatar can be changed
   * This function's only job is to call MediaService and then update the central state
   * @param companionId - ID of the companion (MUST NOT be null - companion must exist)
   */
  const handleAvatarChange = async (companionId: string) => {
    try {
      // CRITICAL: Validate companion exists
      if (!companionId) {
        console.warn('[ManageCompanionsScreen] ⚠️ Cannot change avatar: companionId is null');
        Alert.alert('Error', 'Please create the companion first before adding an avatar.');
        return;
      }

      setPickingAvatarForId(companionId);
      
      // Get the current companion from state
      const currentCompanion = userState.companions?.[companionId];
      if (!currentCompanion) {
        console.warn('[ManageCompanionsScreen] ⚠️ Companion not found:', companionId);
        Alert.alert('Error', 'Companion not found. Please try again.');
        return;
      }

      // Pass currentCompanion to MediaService so it can return the complete updated object
      // MediaService will launch picker, copy image, and return complete updated companion object
      const updatedCompanion = await MediaService.assignCompanionImage(
        companionId,
        null, // sourceUri = null means pick from library
        currentCompanion
      );
      
      // CRITICAL: If the service returns an updated companion object,
      // immediately update the central state with it
      // This ensures perfect state synchronization and triggers UI re-render
      if (updatedCompanion) {
        // The returned object is already a complete Companion object with updated avatar
        // No need to manually construct it - MediaService did that for us
        await updateCompanion(updatedCompanion);
        
        console.log('[ManageCompanionsScreen] ✅ Companion avatar updated successfully:', {
          id: updatedCompanion.id,
          name: updatedCompanion.name,
          hasAvatar: !!updatedCompanion.avatar,
        });
      } else {
        console.log('[ManageCompanionsScreen] Avatar selection cancelled');
      }
    } catch (error) {
      // Check if error is cancellation (user cancelled picker)
      if (error.code !== 'cancelled' && error.message !== 'User cancelled image selection') {
        console.error('[ManageCompanionsScreen] ❌ Failed to change avatar:', error);
        Alert.alert(
          'Error',
          error.message === 'Permission to access media library was denied'
            ? 'Please grant photo library access to add an avatar.'
            : 'Failed to pick image. Please try again.'
        );
      }
    } finally {
      setPickingAvatarForId(null);
    }
  };

  /**
   * Handle picking avatar for editing mode
   * CRITICAL: This function only updates local state (editingAvatarUri)
   * It does NOT call MediaService - MediaService is only called during handleSaveEdit
   * This ensures the edit modal is a proper "State Island" that only commits on save
   * @param companionId - ID of the companion being edited
   */
  const handlePickAvatarForEdit = async (companionId: string) => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted && permissionResult.status !== 'limited') {
        Alert.alert(
          'Permission Required',
          'Please grant photo library access to select an avatar.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for avatars
        quality: 0.8,
      });

      // Handle user cancellation
      if (result.canceled || !result.assets?.[0]?.uri) {
        console.log('[ManageCompanionsScreen] Avatar selection cancelled');
        return;
      }

      // CRITICAL: Only update local state - do NOT call MediaService here
      // MediaService will be called during handleSaveEdit to process the image
      const pickedImageUri = result.assets[0].uri;
      setEditingAvatarUri(pickedImageUri);
      
      console.log('[ManageCompanionsScreen] Avatar picked for editing (local state only):', pickedImageUri);
    } catch (error) {
      console.error('[ManageCompanionsScreen] Failed to pick avatar:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  /**
   * Handle picking avatar (legacy function name, redirects to handleAvatarChange)
   * @deprecated Use handleAvatarChange instead
   */
  const handlePickAvatar = handleAvatarChange;

  const handleRemoveAvatar = async (companionId: string) => {
    try {
      const companion = userState.companions[companionId];
      if (!companion) {
        console.warn('[ManageCompanionsScreen] Companion not found:', companionId);
        return;
      }

      // If editing this companion, just clear the editing avatar URI
      if (editingId === companionId) {
        setEditingAvatarUri(null);
        return;
      }

      // Get avatar source for deletion
      const avatarSource = companion.avatar?.source || companion.avatarUri;

      // Delete the media asset from storage if it exists
      if (avatarSource && avatarSource.startsWith('file://')) {
        try {
          await MediaService.deleteMediaAsset(avatarSource);
        } catch (error) {
          console.warn('[ManageCompanionsScreen] Failed to delete media asset:', error);
          // Continue with removing from state even if file deletion fails
        }
      }

      // Create updated companion without avatar
      const updatedCompanion: Companion = {
        ...companion,
        avatar: undefined,
      };

      // Use updateCompanion from context - this will trigger re-render
      await updateCompanion(updatedCompanion);
    } catch (error) {
      console.error('[ManageCompanionsScreen] Failed to remove avatar:', error);
      Alert.alert('Error', 'Failed to remove avatar. Please try again.');
    }
  };

  // Helper to get avatar source for display
  const getAvatarUri = (companion: Companion, isEditing: boolean): string | null => {
    // CRITICAL: In editing mode, if editingAvatarUri is set, show the picked image (even if temporary)
    // This gives user immediate feedback of their selection
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

  /**
   * Handle deleting a companion
   * Shows confirmation alert and calls deleteCompanion from context
   * The context is responsible for all deletion logic (including deleting media assets)
   * @param companionId - ID of the companion to delete
   */
  const handleDelete = (companionId: string) => {
    const companion = userState.companions[companionId];
    if (!companion) {
      console.warn('[ManageCompanionsScreen] Companion not found:', companionId);
      return;
    }

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
              // Simply call deleteCompanion from context
              // The context handles all deletion logic including media cleanup
              await deleteCompanion(companionId);
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
    // CRITICAL: Ensure name is always available for display
    const displayName = item.name || item.id || 'Unnamed Companion';
    const editingDisplayName = editingName || displayName;
    const initials = getInitials(isEditing ? editingDisplayName : displayName);
    const fallbackColor = getFallbackColor(isEditing ? editingDisplayName : displayName);

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
                onPress={() => handlePickAvatarForEdit(item.id)}
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
                  onPress={() => {
                    // CRITICAL: In edit mode, only update local state
                    // The actual removal will be handled in handleSaveEdit
                    setEditingAvatarUri('');
                  }}
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
              onPress={() => handleAvatarChange(item.id)}
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
              <ThemedText style={styles.companionName}>
                {item.name || item.id || 'Unnamed Companion'}
              </ThemedText>
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
                    try {
                      // Ensure global setting is also enabled
                      if (value && !userState.settings?.isAIInteractionEnabled) {
                        Alert.alert(
                          'Global Setting Required',
                          'Please enable "AI Companion Interaction" in Settings first to use this feature.',
                          [{ text: 'OK' }]
                        );
                        return;
                      }
                      
                      // Create updated companion object
                      const updatedCompanion: Companion = {
                        ...item,
                        isInteractionEnabled: value,
                      };
                      
                      // Use updateCompanion from context - this will trigger re-render
                      await updateCompanion(updatedCompanion);
                    } catch (error) {
                      console.error('[ManageCompanionsScreen] Failed to update interaction setting:', error);
                      Alert.alert('Error', 'Failed to update setting. Please try again.');
                    }
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
                onPress={() => handleDelete(item.id)}
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
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={[styles.emptyText, { color: colors.text, marginTop: 16 }]}>
              Loading companions...
            </ThemedText>
          </View>
        ) : companionsArray.length === 0 ? (
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
            data={companionsArray}
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
          
          {/* Avatar preview removed - user creates companion first, then changes avatar */}
          
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
            {/* Avatar picker removed - user must create companion first, then tap camera icon on the companion */}
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

