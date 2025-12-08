// src/components/ChapterCard.tsx
// Netflix-style Chapter Card Component
import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Chapter, ChapterType, ChapterStatus } from '../types';
import MediaService from '../../services/MediaService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding
const CARD_HEIGHT_LARGE = CARD_WIDTH * 1.5; // 2:3 ratio for large cards
const CARD_HEIGHT_SMALL = CARD_WIDTH * 1.2; // Slightly smaller for archived cards

type ChapterCardProps = {
  chapter: Chapter;
  onPress?: () => void;
  size?: 'large' | 'small'; // Large for ongoing, small for archived
};

/**
 * Get type metadata (icon and gradient colors)
 */
const getTypeMeta = (type: ChapterType): { icon: keyof typeof Ionicons.glyphMap; color: string[] } => {
  switch (type) {
    case 'period':
      return { icon: 'calendar-outline', color: ['#FF9A9E', '#FECFEF', '#FAD0C4'] };
    case 'relationship':
      return { icon: 'heart-outline', color: ['#a18cd1', '#fbc2eb', '#fad0c4'] };
    case 'theme':
    default:
      return { icon: 'bookmark-outline', color: ['#84fab0', '#8fd3f4', '#a8edea'] };
  }
};

/**
 * Netflix-style Chapter Card Component
 */
export const ChapterCard: React.FC<ChapterCardProps> = ({ chapter, onPress, size = 'large' }) => {
  const [coverImageUri, setCoverImageUri] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const { icon, color } = getTypeMeta(chapter.type);
  const isOngoing = chapter.status === 'ongoing';
  const isArchived = chapter.status === 'archived';
  const cardHeight = size === 'large' ? CARD_HEIGHT_LARGE : CARD_HEIGHT_SMALL;

  // Load cover image if available
  useEffect(() => {
    const loadCoverImage = async () => {
      if (!chapter.coverImage) {
        return;
      }
      setIsLoadingImage(true);
      try {
        const base64 = await MediaService.readImageAsBase64(chapter.coverImage);
        if (base64) {
          setCoverImageUri(base64);
        }
      } catch (error) {
        console.error('[ChapterCard] Failed to load cover image:', error);
      } finally {
        setIsLoadingImage(false);
      }
    };
    loadCoverImage();
  }, [chapter.coverImage]);

  // Pulse animation for ongoing status indicator
  useEffect(() => {
    if (!isOngoing) {
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [isOngoing, pulseAnim]);

  const renderContent = () => {
    // For small cards (archived), show title below image
    if (size === 'small') {
      return (
        <View style={styles.smallCardContainer}>
          <View style={[styles.imageContainer, { height: cardHeight * 0.75 }]}>
            {coverImageUri ? (
              <Image source={{ uri: coverImageUri }} style={styles.coverImage} resizeMode="cover" />
            ) : (
              <LinearGradient colors={color} style={styles.gradientBackground} />
            )}
            {isArchived && <View style={styles.archiveOverlay} />}
            <View style={styles.badge}>
              <Ionicons name={icon} size={10} color="#fff" />
              <Text style={styles.badgeText}>{chapter.type.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.smallCardFooter}>
            <Text style={styles.smallCardTitle} numberOfLines={2}>
              {chapter.title}
            </Text>
            {chapter.description && (
              <Text style={styles.smallCardDescription} numberOfLines={1}>
                {chapter.description}
              </Text>
            )}
          </View>
        </View>
      );
    }

    // For large cards (ongoing), show title overlay on image
    return (
      <View style={[styles.largeCardContainer, { height: cardHeight }]}>
        {coverImageUri ? (
          <Image source={{ uri: coverImageUri }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <LinearGradient colors={color} style={styles.gradientBackground} />
        )}
        
        {/* Text overlay gradient */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
          style={styles.textOverlay}
        >
          {/* Badge */}
          <View style={styles.badge}>
            <Ionicons name={icon} size={12} color="#fff" />
            <Text style={styles.badgeText}>{chapter.type.toUpperCase()}</Text>
          </View>

          {/* Ongoing indicator */}
          {isOngoing && (
            <Animated.View
              style={[
                styles.ongoingIndicator,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <View style={styles.ongoingDot} />
              <Text style={styles.ongoingText}>ONGOING</Text>
            </Animated.View>
          )}

          {/* Title and description */}
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {chapter.title}
            </Text>
            {chapter.description && (
              <Text style={styles.description} numberOfLines={2}>
                {chapter.description}
              </Text>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[
        styles.card,
        {
          width: size === 'large' ? SCREEN_WIDTH - 32 : CARD_WIDTH,
          height: size === 'small' ? cardHeight + 60 : cardHeight, // Add footer height for small cards
        },
      ]}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  largeCardContainer: {
    width: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  smallCardContainer: {
    width: '100%',
  },
  imageContainer: {
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  gradientBackground: {
    width: '100%',
    height: '100%',
  },
  textOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ongoingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,255,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  ongoingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00ff00',
  },
  ongoingText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  titleContainer: {
    marginTop: 'auto',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  archiveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  smallCardFooter: {
    padding: 12,
    backgroundColor: '#1a1a1a',
  },
  smallCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  smallCardDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});

export default ChapterCard;

