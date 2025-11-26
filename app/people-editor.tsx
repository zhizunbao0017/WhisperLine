// app/people-editor.tsx
import React, { useState, useEffect, useContext } from 'react';
import { View, TextInput, StyleSheet, Pressable, ScrollView, Alert, Image, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Directory, File, Paths } from 'expo-file-system';
import { useUserState } from '../context/UserStateContext';
import { Companion } from '../models/PIE';
import { ThemeContext } from '../context/ThemeContext';
import { ThemedText as Text } from '../components/ThemedText';

export default function PeopleEditorScreen() {
  const router = useRouter();
  const themeContext = useContext(ThemeContext);
  const { userState, addCompanion, updateCompanion } = useUserState();
  const params = useLocalSearchParams<{ companionId?: string }>();

  if (!themeContext) {
    return null;
  }

  const { colors } = themeContext;
  const isEditing = !!params.companionId;

  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing companion data if editing
  useEffect(() => {
    if (isEditing && params.companionId && userState?.companions) {
      const companion = userState.companions[params.companionId];
      if (companion) {
        setName(companion.name);
        // Load existing avatar
        const existingAvatarUri = companion.avatar?.source || companion.avatarUri || null;
        setAvatarUri(existingAvatarUri);
      }
    }
  }, [params.companionId, userState?.companions, isEditing]);

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Sorry, we need camera roll permissions to select an avatar image.'
      );
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Square aspect ratio for avatars
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const sourceUri = result.assets[0].uri;
      
      // CRITICAL: Copy image from temporary cache to permanent storage
      // This prevents the "temporary ImagePicker cache path" error
      try {
        // Check if the URI is a temporary cache path
        if (sourceUri.includes('Caches/ImagePicker')) {
          console.log('[PeopleEditor] Copying image from temporary cache to permanent storage...');
          
          // Create avatars directory if it doesn't exist
          const avatarsDir = new Directory(Paths.document, 'avatars');
          if (!avatarsDir.exists) {
            await avatarsDir.create({ intermediates: true });
          }

          // Generate a unique filename
          const timeStamp = Date.now();
          const random = Math.random().toString(36).slice(2, 8);
          const extension = sourceUri.split('.').pop()?.split('?')[0] || 'jpg';
          const fileName = `avatar_${timeStamp}_${random}.${extension}`;
          
          // Copy the file to permanent storage
          const sourceFile = new File(sourceUri);
          const destinationFile = new File(avatarsDir, fileName);
          await sourceFile.copy(destinationFile);
          
          // Get the final URI (handle platform differences)
          let finalUri = destinationFile.uri;
          if (Platform.OS === 'android') {
            const canMakeContentUri = typeof FileSystem.makeContentUriAsync === 'function';
            if (canMakeContentUri) {
              try {
                finalUri = await FileSystem.makeContentUriAsync(destinationFile.uri);
              } catch (androidUriError) {
                console.warn('[PeopleEditor] makeContentUriAsync failed, falling back to file URI', androidUriError);
                finalUri = destinationFile.uri.startsWith('file://')
                  ? destinationFile.uri
                  : `file://${destinationFile.uri}`;
              }
            } else {
              finalUri = destinationFile.uri.startsWith('file://')
                ? destinationFile.uri
                : `file://${destinationFile.uri}`;
            }
          } else {
            const clean = destinationFile.uri.replace(/^file:\/\//, '');
            finalUri = `file://${clean}`;
          }
          
          console.log('[PeopleEditor] Image copied to permanent storage:', finalUri);
          setAvatarUri(finalUri);
        } else {
          // If it's already a permanent path, use it directly
          console.log('[PeopleEditor] Using existing permanent path:', sourceUri);
          setAvatarUri(sourceUri);
        }
      } catch (error) {
        console.error('[PeopleEditor] Error copying image to permanent storage:', error);
        Alert.alert('Error', 'Failed to save image. Please try again.');
        // Fallback: use the original URI (might be temporary, but better than nothing)
        setAvatarUri(sourceUri);
      }
    }
  };

  const handleSave = async () => {
    if (name.trim().length === 0) {
      Alert.alert('Validation Error', 'Please enter a name.');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing && params.companionId) {
        // Update existing companion
        const existingCompanion = userState?.companions?.[params.companionId];
        if (existingCompanion) {
          const updatedCompanion: Companion = {
            ...existingCompanion,
            name: name.trim(),
            avatarUri: avatarUri || undefined,
            avatar: avatarUri
              ? {
                  type: 'image',
                  source: avatarUri,
                }
              : undefined,
          };
          await updateCompanion(updatedCompanion);
        }
      } else {
        // Create new companion with avatar
        // Note: addCompanion might need to be updated to accept avatarUri
        // For now, we'll create the companion and then update it with avatar
        const newCompanion = await addCompanion(name.trim());
        if (avatarUri && newCompanion) {
          const companionWithAvatar: Companion = {
            ...newCompanion,
            avatarUri: avatarUri,
            avatar: {
              type: 'image',
              source: avatarUri,
            },
          };
          await updateCompanion(companionWithAvatar);
        }
      }
      router.back(); // Go back to the manage screen
    } catch (error) {
      console.error('Failed to save companion:', error);
      Alert.alert('Error', 'Failed to save companion. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={handleCancel} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? 'Edit Companion' : 'Add New Companion'}
        </Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.content}>
        {/* Avatar Section */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Avatar</Text>
          <Pressable
            onPress={pickImage}
            style={[
              styles.avatarContainer,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            disabled={isLoading}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="camera-outline" size={32} color={colors.primary} />
                <Text style={[styles.avatarPlaceholderText, { color: colors.primary }]}>
                  Add Photo
                </Text>
              </View>
            )}
            <View style={[styles.avatarOverlay, { backgroundColor: colors.background + '80' }]}>
              <Ionicons name="pencil" size={20} color={colors.text} />
            </View>
          </Pressable>
        </View>

        {/* Name Section */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter companion name"
            placeholderTextColor={colors.secondaryText}
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            autoFocus={!isEditing}
            editable={!isLoading}
          />
        </View>
        <View style={styles.buttonContainer}>
          <Pressable
            onPress={handleCancel}
            style={[
              styles.cancelButton,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            disabled={isLoading}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            style={[
              styles.saveButton,
              {
                backgroundColor: colors.primary,
                opacity: isLoading ? 0.6 : 1,
              },
            ]}
            disabled={isLoading || name.trim().length === 0}
          >
            <Text style={[styles.saveButtonText, { color: colors.primaryText || '#ffffff' }]}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

