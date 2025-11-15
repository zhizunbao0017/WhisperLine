import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { Chapter } from '../models/Chapter';
import { DiaryContext } from '../context/DiaryContext';
import { CompanionContext } from '../context/CompanionContext';
import { getEmotionGradientForChapter } from '../services/ChapterService';
import { ThemedText as Text } from './ThemedText';

type ChapterCardProps = {
  chapter: Chapter;
  onPress?: () => void;
  isNew?: boolean;
};

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  companion: 'person-outline',
  theme: 'bulb-outline',
};

const FALLBACK_GRADIENT = ['#7f53ac', '#647dee'];

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

const ChapterCard: React.FC<ChapterCardProps> = ({ chapter, onPress, isNew = false }) => {
  const diaryContext = useContext(DiaryContext);
  const diaries = diaryContext?.diaries;
  const companionContext = useContext(CompanionContext);
  const companions = companionContext?.companions;

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

  const glowAnim = useRef(new Animated.Value(0)).current;

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

  const animatedWrapperStyle = useMemo(() => {
    if (!isNew) {
      return styles.card;
    }
    const borderColor = glowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.75)'],
    });
    return [
      styles.card,
      styles.cardNew,
      {
        borderColor,
      },
    ];
  }, [glowAnim, isNew]);

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
          {isNew ? <View style={styles.newDot} /> : null}
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
                d="M0 22 L15 18 L30 20 L45 12 L60 16 L75 8 L90 12 L105 6 L120 10"
                stroke="rgba(255,255,255,0.85)"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
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

