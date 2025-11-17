import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { Chapter } from '../models/Chapter';
import { DiaryContext } from '../context/DiaryContext';
import { CompanionContext } from '../context/CompanionContext';
import { useUserState } from '../context/UserStateContext';
import { getEmotionGradientForChapter } from '../services/ChapterService';
import { ThemedText as Text } from './ThemedText';
import { EmotionType } from '../models/PIE';

type ChapterCardProps = {
  chapter: Chapter;
  onPress?: () => void;
  isNew?: boolean;
  isFocus?: boolean;
};

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  companion: 'person-outline',
  theme: 'bulb-outline',
};

const FALLBACK_GRADIENT = ['#7f53ac', '#647dee'];

// Map emotions to a numerical value for charting (Y-axis)
const emotionToValue: Record<EmotionType, number> = {
  excited: 5,
  happy: 4,
  calm: 3,
  tired: 2,
  sad: 1,
  angry: 0,
};

const formatTimeSince = (isoString?: string) => {
  if (!isoString) {
    return 'just now';
  }
  const updatedAt = new Date(isoString).getTime();
  if (Number.isNaN(updatedAt)) {
    return 'recently';
  }
  const diffMs = Date.now() - updatedAt;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return 'just now';
  }
  if (diffMs < hour) {
    const mins = Math.max(1, Math.round(diffMs / minute));
    return `${mins} min${mins > 1 ? 's' : ''} ago`;
  }
  if (diffMs < day) {
    const hrs = Math.max(1, Math.round(diffMs / hour));
    return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  }
  const days = Math.max(1, Math.round(diffMs / day));
  if (days <= 7) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  return new Date(updatedAt).toLocaleDateString();
};

const ChapterCard: React.FC<ChapterCardProps> = ({ chapter, onPress, isNew = false, isFocus = false }) => {
  const diaryContext = useContext(DiaryContext);
  const diaries = diaryContext?.diaries;
  const companionContext = useContext(CompanionContext);
  const companions = companionContext?.companions;
  
  // Get UserState for rich entries (contains emotion data)
  // useUserState must be called unconditionally (React Hook rules)
  let allRichEntries: Record<string, any> = {};
  try {
    const userStateContext = useUserState();
    allRichEntries = userStateContext?.allRichEntries || {};
  } catch (error) {
    // UserStateProvider not available, sparkline will fallback to static line
    // This is acceptable - the sparkline will show a flat line when no data is available
    console.warn('ChapterCard: UserStateProvider not available, using fallback sparkline');
  }

  const gradientColors = useMemo(
    () => getEmotionGradientForChapter(chapter, diaries ?? []) ?? FALLBACK_GRADIENT,
    [chapter, diaries]
  );

  const summary = useMemo(() => {
    const count = chapter.entryIds?.length ?? 0;
    const countLabel = `${count} moment${count === 1 ? '' : 's'}`;
    const updatedAgo = formatTimeSince(chapter.lastUpdated);
    return `${countLabel} • Updated ${updatedAgo}`;
  }, [chapter.entryIds, chapter.lastUpdated]);

  const companionAvatarSource = useMemo(() => {
    if (chapter.type !== 'companion' || !chapter.sourceId || !companions?.length) {
      return null;
    }
    const companion = companions.find((item) => item?.id === chapter.sourceId);
    const uri = companion?.avatarIdentifier;
    if (uri) {
      return { uri };
    }
    return null;
  }, [chapter.sourceId, chapter.type, companions]);

  // Memoized calculation for the SVG path data for sparkline chart
  const sparklinePath = useMemo(() => {
    if (!chapter.entryIds || chapter.entryIds.length === 0 || Object.keys(allRichEntries).length === 0) {
      // Not enough data, return a flat line
      return 'M 0 15 L 120 15';
    }

    // Get the last 7 entries for the trend (most recent)
    const entryIds = chapter.entryIds.slice(-7);
    const lastEntries = entryIds
      .map((id) => allRichEntries[id])
      .filter((entry) => {
        // Filter out entries without emotion metadata
        return entry && entry.metadata && (entry.metadata.primaryEmotion || entry.metadata.detectedEmotion);
      })
      .sort((a, b) => {
        // Sort by creation date to ensure chronological order
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB; // Oldest first
      });

    if (lastEntries.length < 2) {
      // Not enough entries for a meaningful line, return a flat line
      return 'M 0 15 L 120 15';
    }

    const width = 120; // ViewBox width
    const height = 30;  // ViewBox height

    // Calculate points for the sparkline
      const points = lastEntries.map((entry, index) => {
        const x = (index / (lastEntries.length - 1)) * width;
        // Use primaryEmotion (authoritative) with fallback to detectedEmotion for legacy entries
        const emotion = entry.metadata.primaryEmotion || entry.metadata.detectedEmotion?.primary;
        const emotionValue = emotion ? (emotionToValue[emotion] ?? 3) : 3; // Default to 'calm' if emotion not found
      // Invert Y-axis for SVG (0 at bottom, 5 at top)
      const y = height - (emotionValue / 5) * height;
      return { x, y };
    });

    // Create the SVG path string
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }

    return path;
  }, [chapter.entryIds, allRichEntries]);

  const glowAnim = useRef(new Animated.Value(0)).current;
  const focusGlowAnim = useRef(new Animated.Value(0)).current;

  // Animation for "new" indicator
  useEffect(() => {
    if (!isNew) {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glowAnim, isNew]);

  // Animation for "focus" indicator (subtle pulsing glow)
  useEffect(() => {
    if (!isFocus) {
      focusGlowAnim.stopAnimation();
      focusGlowAnim.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(focusGlowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(focusGlowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [focusGlowAnim, isFocus]);

  const animatedWrapperStyle = useMemo(() => {
    const baseStyle = [styles.card];
    
    // Apply focus style first (it has stronger visual presence)
    if (isFocus) {
      // For focus cards, use cyan border with glow
      const borderColor = isNew
        ? glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(0, 255, 200, 0.6)', 'rgba(0, 255, 200, 0.9)'],
          })
        : 'rgba(0, 255, 200, 0.6)';
      baseStyle.push(styles.focusCard, { borderColor });
    } else if (isNew) {
      // Only apply new style if not focus
      const borderColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.75)'],
      });
      baseStyle.push(styles.cardNew, { borderColor });
    }
    
    return baseStyle;
  }, [glowAnim, isNew, isFocus]);

  const focusGlowOpacity = useMemo(() => {
    if (!isFocus) return 0;
    return focusGlowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.15, 0.3],
    });
  }, [focusGlowAnim, isFocus]);

  return (
    <Animated.View style={animatedWrapperStyle}>
      <Pressable
        style={styles.pressable}
        onPress={onPress}
        android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
      >
        <LinearGradient
          colors={gradientColors}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.overlay} />
          {/* Focus glow effect */}
          {isFocus && (
            <Animated.View
              style={[
                styles.focusGlow,
                {
                  opacity: focusGlowOpacity,
                },
              ]}
            />
          )}
          {isNew ? <View style={styles.newDot} /> : null}
          {isFocus && !isNew && (
            <View style={styles.focusBadge}>
              <Ionicons name="star" size={12} color="#fff" />
            </View>
          )}
          <View style={styles.topRow}>
            <View style={styles.iconPill}>
              {companionAvatarSource ? (
                <Image source={companionAvatarSource} style={styles.iconAvatar} />
              ) : (
                <Ionicons
                  name={ICON_MAP[chapter.type] ?? 'book-outline'}
                  color="#fff"
                  size={18}
                />
              )}
            </View>
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {chapter.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {summary}
            </Text>
          </View>
          <View style={styles.sparklineContainer}>
            <Text style={styles.sparklineLabel}>Mood Trend</Text>
            <Svg height={30} width="100%" viewBox="0 0 120 30">
              <Path
                d={sparklinePath}
                stroke="rgba(255,255,255,0.85)"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    borderWidth: 0,
  },
  cardNew: {
    borderWidth: 2,
  },
  focusCard: {
    borderWidth: 2,
    shadowColor: 'rgba(0, 255, 200, 0.8)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  pressable: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
    minHeight: 160,
    justifyContent: 'space-between',
    borderRadius: 18,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  focusGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 255, 200, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 200, 0.4)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  newDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  focusBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 200, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0, 255, 200, 1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  titleContainer: {
    flexGrow: 1,
  },
  sparklineContainer: {
    marginTop: 24,
  },
  sparklineLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
});

export default ChapterCard;

