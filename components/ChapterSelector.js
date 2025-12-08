// components/ChapterSelector.js
// Chapter Selector Component for Diary Editor
import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import useChapterStore from '../src/stores/useChapterStore';
import MediaService from '../services/MediaService';

const ChapterSelector = ({ selectedChapterId, onSelectChapter, themeStyles, headingFontFamily, suggestedChapterId }) => {
  const router = useRouter();
  const chapters = useChapterStore((state) => state.chapters);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [coverImageCache, setCoverImageCache] = useState({});

  // Filter only ongoing chapters
  const ongoingChapters = useMemo(() => {
    return chapters.filter((c) => c.status === 'ongoing').sort((a, b) => b.createdAt - a.createdAt);
  }, [chapters]);

  const selectedChapter = useMemo(() => {
    return ongoingChapters.find((c) => c.id === selectedChapterId);
  }, [ongoingChapters, selectedChapterId]);

  // Load cover image for a chapter
  const loadCoverImage = async (chapterId, filename) => {
    if (coverImageCache[chapterId]) {
      return coverImageCache[chapterId];
    }
    if (!filename) return null;
    try {
      const base64 = await MediaService.readImageAsBase64(filename);
      if (base64) {
        setCoverImageCache((prev) => ({ ...prev, [chapterId]: base64 }));
        return base64;
      }
    } catch (error) {
      console.error('[ChapterSelector] Failed to load cover image:', error);
    }
    return null;
  };

  // Preload cover images when modal opens
  useEffect(() => {
    if (isModalVisible) {
      ongoingChapters.forEach((chapter) => {
        if (chapter.coverImage && !coverImageCache[chapter.id]) {
          loadCoverImage(chapter.id, chapter.coverImage);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalVisible, ongoingChapters]);

  // Load selected chapter cover for main button
  useEffect(() => {
    if (selectedChapter?.coverImage && !coverImageCache[selectedChapter.id]) {
      loadCoverImage(selectedChapter.id, selectedChapter.coverImage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChapter]);

  const handleSelectChapter = (chapterId) => {
    onSelectChapter(chapterId);
    setIsModalVisible(false);
  };

  const handleRemoveChapter = () => {
    onSelectChapter(null);
    setIsModalVisible(false);
  };

  const handleCreateNew = () => {
    setIsModalVisible(false);
    // Small delay to ensure modal closes smoothly
    setTimeout(() => {
      router.push('/add-edit-chapter');
    }, 300);
  };

  const getTypeMeta = (type) => {
    switch (type) {
      case 'period':
        return { icon: 'calendar-outline', colors: ['#FF9A9E', '#FECFEF'] };
      case 'relationship':
        return { icon: 'heart-outline', colors: ['#a18cd1', '#fbc2eb'] };
      case 'theme':
      default:
        return { icon: 'bookmark-outline', colors: ['#84fab0', '#8fd3f4'] };
    }
  };

  const selectedMeta = selectedChapter ? getTypeMeta(selectedChapter.type) : null;
  const selectedCoverImage = selectedChapter?.coverImage && coverImageCache[selectedChapter.id]
    ? coverImageCache[selectedChapter.id]
    : null;

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={[
            styles.selectorButton,
            {
              borderColor: selectedChapter ? themeStyles.primary : themeStyles.border,
              backgroundColor: selectedChapter ? (themeStyles.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)') : themeStyles.card,
              borderWidth: selectedChapter ? 2 : 1,
            },
          ]}
          onPress={() => setIsModalVisible(true)}
          activeOpacity={0.7}
        >
          {/* Cover image or icon */}
          {selectedChapter ? (
            selectedCoverImage ? (
              <Image
                source={{ uri: selectedCoverImage }}
                style={styles.selectorCover}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient colors={selectedMeta.colors} style={styles.selectorCover}>
                <Ionicons name={selectedMeta.icon} size={18} color="#fff" />
              </LinearGradient>
            )
          ) : (
            <Ionicons name="book-outline" size={20} color={themeStyles.text} />
          )}
          <View style={styles.selectorContent}>
            {selectedChapter ? (
              <Text style={[styles.selectorValue, { color: themeStyles.text, fontFamily: headingFontFamily }]} numberOfLines={1}>
                {selectedChapter.title}
              </Text>
            ) : (
              <>
                <Text style={[styles.selectorLabel, { color: themeStyles.text, fontFamily: headingFontFamily }]}>
                  Add to Chapter
                </Text>
                <Text style={[styles.selectorPlaceholder, { color: themeStyles.text }]}>
                  Select a chapter (optional)
                </Text>
              </>
            )}
          </View>
          {selectedChapter && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleRemoveChapter();
              }}
              style={styles.removeButton}
            >
              <Ionicons name="close-circle" size={20} color={themeStyles.text} />
            </TouchableOpacity>
          )}
          <Ionicons name="chevron-forward" size={20} color={themeStyles.text} style={{ opacity: 0.5 }} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeStyles.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeStyles.text, fontFamily: headingFontFamily }]}>
                Select Chapter
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeStyles.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={ongoingChapters}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const meta = getTypeMeta(item.type);
                const isSelected = selectedChapterId === item.id;
                const coverImage = item.coverImage && coverImageCache[item.id] ? coverImageCache[item.id] : null;
                return (
                  <TouchableOpacity
                    style={[
                      styles.chapterItem,
                      isSelected && { 
                        borderLeftColor: themeStyles.primary, 
                        borderLeftWidth: 4,
                        backgroundColor: themeStyles.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                      },
                    ]}
                    onPress={() => handleSelectChapter(item.id)}
                    activeOpacity={0.7}
                  >
                    {/* Cover image or icon */}
                    {coverImage ? (
                      <Image
                        source={{ uri: coverImage }}
                        style={styles.chapterCover}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient colors={meta.colors} style={styles.chapterCover}>
                        <Ionicons name={meta.icon} size={28} color="#fff" />
                      </LinearGradient>
                    )}
                    <View style={styles.chapterInfo}>
                      <View style={styles.chapterTitleRow}>
                        <Text style={[styles.chapterTitle, { color: themeStyles.text }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        {suggestedChapterId === item.id && !isSelected && (
                          <View style={[styles.suggestedBadge, { backgroundColor: themeStyles.primary + '20' }]}>
                            <Ionicons name="sparkles" size={12} color={themeStyles.primary} />
                            <Text style={[styles.suggestedText, { color: themeStyles.primary }]}>Suggested</Text>
                          </View>
                        )}
                      </View>
                      {item.description && (
                        <Text style={[styles.chapterDescription, { color: themeStyles.text }]} numberOfLines={1}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={26} color={themeStyles.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="book-outline" size={48} color={themeStyles.text} style={{ opacity: 0.3 }} />
                  <Text style={[styles.emptyText, { color: themeStyles.text }]}>
                    No ongoing chapters available.{'\n'}Create a chapter first!
                  </Text>
                </View>
              }
              ListFooterComponent={
                <TouchableOpacity
                  style={[styles.createNewButton, { backgroundColor: themeStyles.primary }]}
                  onPress={handleCreateNew}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[themeStyles.primary, themeStyles.primary]}
                    style={styles.createNewGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="add-circle" size={24} color="#fff" />
                    <Text style={styles.createNewText}>Create New Chapter</Text>
                  </LinearGradient>
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    minHeight: 56,
  },
  selectorCover: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorContent: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  selectorValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectorPlaceholder: {
    fontSize: 13,
    opacity: 0.6,
  },
  removeButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 72,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  chapterCover: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  chapterInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chapterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  chapterTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  suggestedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  suggestedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chapterDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.7,
  },
  createNewButton: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createNewGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  createNewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ChapterSelector;

