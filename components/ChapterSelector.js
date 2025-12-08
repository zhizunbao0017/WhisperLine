// components/ChapterSelector.js
// Chapter Selector Component for Diary Editor
import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useChapterStore from '../src/stores/useChapterStore';
import MediaService from '../services/MediaService';

const ChapterSelector = ({ selectedChapterId, onSelectChapter, themeStyles, headingFontFamily }) => {
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

  const handleSelectChapter = (chapterId) => {
    onSelectChapter(chapterId);
    setIsModalVisible(false);
  };

  const handleRemoveChapter = () => {
    onSelectChapter(null);
    setIsModalVisible(false);
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

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.selectorButton, { borderColor: themeStyles.border, backgroundColor: themeStyles.card }]}
          onPress={() => setIsModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="book-outline" size={20} color={themeStyles.text} />
          <View style={styles.selectorContent}>
            <Text style={[styles.selectorLabel, { color: themeStyles.text, fontFamily: headingFontFamily }]}>
              Add to Chapter
            </Text>
            {selectedChapter ? (
              <Text style={[styles.selectorValue, { color: themeStyles.primary }]} numberOfLines={1}>
                {selectedChapter.title}
              </Text>
            ) : (
              <Text style={[styles.selectorPlaceholder, { color: themeStyles.text }]}>
                Select a chapter (optional)
              </Text>
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
                return (
                  <TouchableOpacity
                    style={[
                      styles.chapterItem,
                      isSelected && { borderColor: themeStyles.primary, borderWidth: 2 },
                    ]}
                    onPress={() => handleSelectChapter(item.id)}
                    activeOpacity={0.7}
                  >
                    {item.coverImage && coverImageCache[item.id] ? (
                      <Image
                        source={{ uri: coverImageCache[item.id] }}
                        style={styles.chapterCover}
                        resizeMode="cover"
                      />
                    ) : (
                      <LinearGradient colors={meta.colors} style={styles.chapterCover}>
                        <Ionicons name={meta.icon} size={24} color="#fff" />
                      </LinearGradient>
                    )}
                    <View style={styles.chapterInfo}>
                      <Text style={[styles.chapterTitle, { color: themeStyles.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.description && (
                        <Text style={[styles.chapterDescription, { color: themeStyles.text }]} numberOfLines={1}>
                          {item.description}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Ionicons name="checkmark-circle" size={24} color={themeStyles.primary} />}
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
    fontSize: 13,
    fontWeight: '500',
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
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  chapterCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  chapterDescription: {
    fontSize: 13,
    opacity: 0.7,
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
});

export default ChapterSelector;

