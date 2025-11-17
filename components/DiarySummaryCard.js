import React, { useContext, useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MOODS } from '../data/moods';
import { ThemeContext } from '../context/ThemeContext';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { ThemedText as Text } from './ThemedText';
import { EmotionType } from '../models/PIE';

const extractTextFromHTML = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
};

// Map EmotionType to emoji for display
const EMOTION_EMOJI_MAP = {
  excited: '🤩',
  happy: '😊',
  calm: '😌',
  tired: '😴',
  sad: '😢',
  angry: '😠',
};


const DiarySummaryCard = ({ item, richEntry, index, onPress, colors }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const themeContext = useContext(ThemeContext);
  const themeStyles = useThemeStyles();
  const isCyberpunkTheme = themeContext?.theme === 'cyberpunk';

  // Use the authoritative primaryEmotion field from metadata
  // This field already prioritizes user-selected mood over AI detection
  const emotionType = richEntry?.metadata?.primaryEmotion || 
    (richEntry?.metadata?.detectedEmotion?.primary); // Fallback for legacy entries
  const emotionEmoji = emotionType && EMOTION_EMOJI_MAP[emotionType] ? EMOTION_EMOJI_MAP[emotionType] : null;
  
  // Fallback to mood icon if no emoji available
  const moodData = MOODS.find((m) => m.name === item.mood);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 350,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
    Animated.timing(translateY, {
      toValue: 0,
      duration: 350,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [opacity, translateY, index]);

  const plainPreview = extractTextFromHTML(item.content || item.contentHTML || '');
  const displayContent =
    plainPreview ||
    (item.captureType ? 'Tap to add more to this captured moment.' : 'No additional notes yet.');
  const displayTitle =
    (item.title || '').trim() || (item.captureType ? 'Quick capture' : 'Untitled entry');

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {item.captureType ? (
          <View
            style={[
              styles.captureBadge,
              {
                backgroundColor: colors.primary ? `${colors.primary}18` : 'rgba(74,108,247,0.15)',
                borderColor: colors.primary ?? '#4a6cf7',
              },
            ]}
          >
            <Text style={[styles.captureBadgeText, { color: colors.primary ?? '#4a6cf7' }]}>
              …
            </Text>
          </View>
        ) : null}
        <View style={styles.cardHeader}>
          <Text style={[
            styles.cardTitle, 
            { color: colors.text },
            isCyberpunkTheme && { fontFamily: themeStyles.fontFamily }
          ]}>{displayTitle}</Text>
        </View>
        <Text style={[
          styles.cardContent, 
          { color: colors.text },
          isCyberpunkTheme && { fontFamily: themeStyles.fontFamily }
        ]} numberOfLines={2}>
          {displayContent}
        </Text>
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          {/* Left: Weather/Location */}
          <View style={styles.footerLeft}>
            {item.weather ? (
              <View
                style={[
                  styles.weatherBadge,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                {item.weather.icon ? (
                  <Image
                    source={{ uri: `https://openweathermap.org/img/wn/${item.weather.icon}@2x.png` }}
                    style={styles.weatherIcon}
                  />
                ) : (
                  <Ionicons
                    name="cloud-outline"
                    size={20}
                    color={colors.primary}
                    style={{ marginRight: 6 }}
                  />
                )}
                <View>
                  <Text style={[styles.weatherText, { color: colors.text }]}>
                    {item.weather.city || '—'}
                  </Text>
                  <Text style={[styles.weatherSubText, { color: colors.text }]}>
                    {typeof item.weather.temperature === 'number'
                      ? `${item.weather.temperature}°C`
                      : (item.weather.description || '').toString()}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Right: Emotion Indicator + Date */}
          <View style={styles.footerRight}>
            {/* Emotion Indicator */}
            <View style={styles.emotionContainer}>
              {emotionEmoji ? (
                <Text style={styles.emotionEmoji}>{emotionEmoji}</Text>
              ) : moodData && moodData.image ? (
                <Image source={moodData.image} style={styles.emotionIcon} />
              ) : null}
            </View>

            {/* Date */}
            <Text style={[styles.footerText, { color: colors.text }]}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.22,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
  cardContent: { fontSize: 14, marginBottom: 15, color: '#666' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 0,
    minHeight: 40,
  },
  footerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-start',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  emotionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    minWidth: 32,
    height: 32,
    flexShrink: 0,
  },
  emotionEmoji: {
    fontSize: 22,
    lineHeight: 22,
    textAlign: 'center',
  },
  emotionIcon: {
    width: 22,
    height: 22,
  },
  footerText: { 
    fontSize: 12,
    flexShrink: 0,
  },
  weatherIcon: { width: 28, height: 28, marginRight: 6 },
  weatherText: { fontSize: 12, fontWeight: '600' },
  weatherSubText: { fontSize: 11, opacity: 0.7 },
  captureBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  captureBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
  },
});

export default DiarySummaryCard;

