// app/add-edit-chapter.tsx
// Immersive Chapter Editor with Cover Upload and Type Selection
import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Chapter, ChapterType } from '../src/types';
import useChapterStore from '../src/stores/useChapterStore';
import MediaService from '../services/MediaService';
import { ThemeContext } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = (SCREEN_WIDTH - 32) * (9 / 16); // 16:9 aspect ratio

/**
 * Get type metadata (icon, colors, description)
 */
const getTypeMeta = (type: ChapterType) => {
  switch (type) {
    case 'period':
      return {
        icon: 'calendar-outline',
        colors: ['#FF9A9E', '#FECFEF', '#FAD0C4'],
        description: 'A specific time in life',
        example: 'e.g., College, 2024 Summer',
      };
    case 'relationship':
      return {
        icon: 'heart-outline',
        colors: ['#a18cd1', '#fbc2eb', '#fad0c4'],
        description: 'Connection with someone',
        example: '',
      };
    case 'theme':
    default:
      return {
        icon: 'bookmark-outline',
        colors: ['#84fab0', '#8fd3f4', '#a8edea'],
        description: 'Ongoing interest',
        example: 'e.g., Mental Health, Ideas',
      };
  }
};

const AddEditChapterScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useContext(ThemeContext);
  const chapterId = params.id as string | undefined;
  const isEditMode = !!chapterId;

  // Store hooks
  const chapters = useChapterStore((state) => state.chapters);
  const addChapter = useChapterStore((state) => state.addChapter);
  const updateChapter = useChapterStore((state) => state.updateChapter);
  const archiveChapter = useChapterStore((state) => state.archiveChapter);

  // State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ChapterType>('theme');
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [coverImageFilename, setCoverImageFilename] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing chapter data if in edit mode
  useEffect(() => {
    if (isEditMode && chapterId) {
      setIsLoading(true);
      const existingChapter = chapters.find((c) => c.id === chapterId);
      if (existingChapter) {
        setTitle(existingChapter.title);
        setDescription(existingChapter.description || '');
        setType(existingChapter.type);
        setCoverImageFilename(existingChapter.coverImage || null);
        
        // Load existing cover image
        if (existingChapter.coverImage) {
          MediaService.readImageAsBase64(existingChapter.coverImage)
            .then((base64) => {
              if (base64) {
                setCoverImageUri(base64);
              }
            })
            .catch((error) => {
              console.error('[AddEditChapter] Failed to load cover image:', error);
            });
        }
      }
      setIsLoading(false);
    }
  }, [isEditMode, chapterId, chapters]);

  // Handle cover image selection
  const handleSelectCover = useCallback(async () => {
    try {
      // Request permission
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Photo access is needed to select a cover image.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9], // 16:9 aspect ratio
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]) {
        // Temporarily store the URI, will be saved to sandbox on Save
        setCoverImageUri(result.assets[0].uri);
        setCoverImageFilename(null); // Reset filename until saved
      }
    } catch (error) {
      console.error('[AddEditChapter] Failed to select cover image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  }, []);

  // Handle cover image removal
  const handleRemoveCover = useCallback(() => {
    Alert.alert(
      'Remove Cover',
      'Are you sure you want to remove the cover image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setCoverImageUri(null);
            setCoverImageFilename(null);
          },
        },
      ]
    );
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a title for your chapter.');
      return;
    }

    setIsSaving(true);
    try {
      let finalCoverImageFilename = coverImageFilename;

      // If there's a new cover image URI, save it to sandbox
      if (coverImageUri && !coverImageFilename) {
        try {
          const filename = await MediaService.moveImageToDocumentDirectory(coverImageUri);
          finalCoverImageFilename = filename;
        } catch (error) {
          console.error('[AddEditChapter] Failed to save cover image:', error);
          Alert.alert('Error', 'Failed to save cover image. Please try again.');
          setIsSaving(false);
          return;
        }
      }

      const chapterData: Omit<Chapter, 'id' | 'createdAt'> = {
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        status: 'ongoing',
        coverImage: finalCoverImageFilename || undefined,
      };

      if (isEditMode && chapterId) {
        // Update existing chapter
        updateChapter(chapterId, chapterData);
      } else {
        // Create new chapter
        addChapter(chapterData);
      }

      // Success feedback
      Alert.alert('Success', isEditMode ? 'Chapter updated!' : 'Chapter created!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('[AddEditChapter] Failed to save chapter:', error);
      Alert.alert('Error', 'Failed to save chapter. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [title, description, type, coverImageUri, coverImageFilename, isEditMode, chapterId, addChapter, updateChapter, router]);

  // Handle archive
  const handleArchive = useCallback(() => {
    if (!chapterId) return;

    Alert.alert(
      'Archive Chapter',
      'Are you sure you want to end this chapter? It will be moved to Archives.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            archiveChapter(chapterId);
            Alert.alert('Archived', 'Chapter has been moved to Archives.', [
              {
                text: 'OK',
                onPress: () => router.back(),
              },
            ]);
          },
        },
      ]
    );
  }, [chapterId, archiveChapter, router]);

  const typeMeta = getTypeMeta(type);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isEditMode ? 'Edit Chapter' : 'New Chapter'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* A. Cover Design Area */}
          <View style={styles.coverSection}>
            <TouchableOpacity
              style={styles.coverContainer}
              onPress={handleSelectCover}
              activeOpacity={0.9}
            >
              {coverImageUri ? (
                <Image source={{ uri: coverImageUri }} style={styles.coverImage} resizeMode="cover" />
              ) : (
                <LinearGradient colors={typeMeta.colors} style={styles.coverGradient}>
                  <Ionicons name="image-outline" size={48} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.coverPlaceholderText}>Tap to Upload Cover</Text>
                </LinearGradient>
              )}
              <View style={styles.coverOverlay}>
                {coverImageUri ? (
                  <View style={styles.coverActions}>
                    <TouchableOpacity
                      style={styles.coverActionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleSelectCover();
                      }}
                    >
                      <Ionicons name="create-outline" size={20} color="#fff" />
                      <Text style={styles.coverActionText}>Change</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.coverActionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleRemoveCover();
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#fff" />
                      <Text style={styles.coverActionText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.coverHint}>Tap to select cover image</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* B. Type Selector */}
          <View style={styles.typeSection}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Chapter Type</Text>
            <View style={styles.typeGrid}>
              {(['period', 'theme', 'relationship'] as ChapterType[]).map((chapterType) => {
                const meta = getTypeMeta(chapterType);
                const isSelected = type === chapterType;
                return (
                  <TouchableOpacity
                    key={chapterType}
                    style={[
                      styles.typeCard,
                      isSelected && styles.typeCardSelected,
                      { borderColor: isSelected ? colors.primary : colors.border },
                    ]}
                    onPress={() => setType(chapterType)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={isSelected ? meta.colors : ['transparent', 'transparent']}
                      style={styles.typeCardGradient}
                    >
                      <Ionicons
                        name={meta.icon as any}
                        size={32}
                        color={isSelected ? '#fff' : colors.text}
                      />
                      <Text
                        style={[
                          styles.typeCardTitle,
                          { color: isSelected ? '#fff' : colors.text },
                        ]}
                      >
                        {chapterType.charAt(0).toUpperCase() + chapterType.slice(1)}
                      </Text>
                      <Text
                        style={[
                          styles.typeCardDescription,
                          { color: isSelected ? 'rgba(255,255,255,0.9)' : colors.text },
                        ]}
                      >
                        {meta.description}
                      </Text>
                      {meta.example && (
                        <Text
                          style={[
                            styles.typeCardExample,
                            { color: isSelected ? 'rgba(255,255,255,0.7)' : colors.text },
                          ]}
                        >
                          {meta.example}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* C. Information Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Title</Text>
            <TextInput
              style={[styles.titleInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter chapter title"
              placeholderTextColor={colors.text + '80'}
              value={title}
              onChangeText={setTitle}
              maxLength={60}
              autoFocus={!isEditMode}
            />

            <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 24 }]}>
              Description
            </Text>
            <TextInput
              style={[
                styles.descriptionInput,
                { color: colors.text, borderColor: colors.border },
              ]}
              placeholder="What is this chapter about?"
              placeholderTextColor={colors.text + '80'}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={200}
            />
          </View>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* D. Bottom Action Bar */}
        <View style={[styles.actionBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {isEditMode && (
            <TouchableOpacity
              style={[styles.archiveButton, { borderColor: colors.border }]}
              onPress={handleArchive}
            >
              <Ionicons name="archive-outline" size={20} color={colors.text} />
              <Text style={[styles.archiveButtonText, { color: colors.text }]}>Archive</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {isEditMode ? 'Save Changes' : 'Create Chapter'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  coverSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  coverContainer: {
    width: '100%',
    height: COVER_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverActions: {
    flexDirection: 'row',
    gap: 16,
  },
  coverActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  coverActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  coverHint: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  typeSection: {
    paddingHorizontal: 16,
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    minHeight: 140,
  },
  typeCardSelected: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  typeCardGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  typeCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  typeCardDescription: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  typeCardExample: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.6,
  },
  inputSection: {
    paddingHorizontal: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    borderBottomWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  descriptionInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 20,
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
    alignItems: 'center',
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  archiveButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AddEditChapterScreen;

