import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { Animated, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { MOODS } from '../data/moods';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { ThemedText as Text } from './ThemedText';
import { stripHtml } from '../src/utils/textUtils';

// --- Helper: Extract Plain Text & First Image from HTML ---
const parseContent = (html: string) => {
  if (!html) return { text: '', image: null };
  
  // 1. Extract first image source if exists
  const imgMatch = html.match(/<img[^>]+src="([^">]+)"/);
  const firstImage = imgMatch ? imgMatch[1] : null;

  // 2. Use robust text utility to strip HTML and decode entities
  const plainText = stripHtml(html);

  return { text: plainText, image: firstImage };
};

const EMOTION_EMOJI_MAP: Record<string, string> = {
  excited: '🤩', happy: '😊', calm: '😌',
  tired: '😴', sad: '😢', angry: '😠',
};

const DiarySummaryCard = ({ item, richEntry, index, onPress, onLongPress, colors }: any) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const themeContext = useContext(ThemeContext);
  const themeStyles = useThemeStyles();
  const isCyberpunkTheme = themeContext?.theme === 'cyberpunk';

  // Extract content efficiently and ensure clean rendering
  // SMART DE-DUPLICATION: Extract title from h1, compare with body to avoid repetition
  const { text: summaryText, image: thumbnail, title: displayTitle, isContentRedundant } = useMemo(() => {
    const rawContent = item.content || item.contentHTML || '';
    const parsed = parseContent(rawContent);
    
    // Step 1: Extract title from content (h1 tag) OR use item.title
    let cleanTitle = '';
    if (rawContent) {
      // Try to extract h1 tag from content first (title is integrated into content)
      const h1Match = rawContent.match(/^<h1[^>]*>(.*?)<\/h1>/i);
      if (h1Match) {
        cleanTitle = stripHtml(h1Match[1]).trim();
      }
    }
    
    // Fallback to item.title if no h1 found
    if (!cleanTitle && item.title) {
      cleanTitle = stripHtml(item.title).trim();
    }
    
    // Step 2: Extract body text (content WITHOUT h1 tag)
    let cleanBodyText = '';
    if (rawContent) {
      // Remove h1 tag from content to get body text
      const withoutH1 = rawContent.replace(/^<h1[^>]*>.*?<\/h1>/i, '').trim();
      cleanBodyText = stripHtml(withoutH1).trim();
    } else {
      // Fallback: use parsed text if no raw content
      cleanBodyText = parsed.text ? stripHtml(parsed.text).trim() : '';
    }
    
    // Step 3: SMART DE-DUPLICATION - Compare title and body
    // If body is essentially the same as title, mark as redundant
    let isRedundant = false;
    if (cleanBodyText && cleanTitle) {
      // Exact match
      if (cleanBodyText === cleanTitle) {
        isRedundant = true;
      }
      // Body starts with title (and title is reasonably long to be meaningful)
      else if (cleanTitle.length > 5 && cleanBodyText.startsWith(cleanTitle)) {
        isRedundant = true;
      }
    }
    
    return {
      text: cleanBodyText,
      image: parsed.image,
      title: cleanTitle,
      isContentRedundant: isRedundant,
    };
  }, [item.content, item.contentHTML, item.title]);

  const emotionType = richEntry?.metadata?.primaryEmotion || richEntry?.metadata?.detectedEmotion?.primary;
  const emotionEmoji = emotionType && EMOTION_EMOJI_MAP[emotionType] ? EMOTION_EMOJI_MAP[emotionType] : null;
  const moodData = MOODS.find((m) => m.name === item.mood);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 50, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 50, useNativeDriver: true })
    ]).start();
  }, []);

  // Format Date: "Nov 14"
  const dateObj = new Date(item.createdAt);
  const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <Animated.View style={[styles.card, { 
      backgroundColor: colors.card, 
      borderColor: colors.border,
      opacity, 
      transform: [{ translateY }] 
    }]}>
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={onPress}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          if (onLongPress) onLongPress();
        }}
        delayLongPress={300}
        style={styles.touchable}
      >
        <View style={styles.row}>
            {/* Left: Thumbnail or Time */}
            {thumbnail ? (
                <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
            ) : (
                <View style={[styles.dateBox, { backgroundColor: colors.background }]}>
                    <Text style={[styles.dateText, { color: colors.text }]}>{dateStr.split(' ')[1]}</Text>
                    <Text style={[styles.monthText, { color: colors.primary }]}>{dateStr.split(' ')[0]}</Text>
                </View>
            )}

            {/* Right: Content */}
            <View style={styles.contentCol}>
                {/* Header: Time & Emotion */}
                <View style={styles.headerRow}>
                    <Text style={[styles.timeText, { color: colors.text, opacity: 0.5 }]}>{timeStr}</Text>
                    {emotionEmoji && <Text style={styles.emoji}>{emotionEmoji}</Text>}
                </View>

                {/* Title Area - Always show CLEAN title if available */}
                {displayTitle && displayTitle.length > 0 ? (
                    <Text 
                        numberOfLines={2} 
                        style={[
                            styles.titleText, 
                            { color: colors.text, fontFamily: isCyberpunkTheme ? themeStyles.fontFamily : undefined }
                        ]}
                    >
                        {displayTitle}
                    </Text>
                ) : (
                    <Text 
                        numberOfLines={2} 
                        style={[
                            styles.titleText, 
                            { color: colors.text, opacity: 0.5, fontFamily: isCyberpunkTheme ? themeStyles.fontFamily : undefined }
                        ]}
                    >
                        Untitled
                    </Text>
                )}

                {/* Content Preview - Only show if it offers NEW info (not redundant with title) */}
                {(() => {
                    // If we have a title and content is redundant, don't show content
                    if (displayTitle && isContentRedundant) {
                        return null;
                    }
                    
                    // Show content if it exists and provides new information
                    if (summaryText && summaryText.length > 0) {
                        return (
                            <Text 
                                numberOfLines={3} 
                                style={[
                                    styles.summaryText, 
                                    { color: colors.text, fontFamily: isCyberpunkTheme ? themeStyles.fontFamily : undefined }
                                ]}
                            >
                                {summaryText}
                            </Text>
                        );
                    }
                    
                    // Empty state
                    if (!displayTitle) {
                        return (
                            <Text 
                                style={[
                                    styles.summaryText, 
                                    { color: colors.text, opacity: 0.5, fontFamily: isCyberpunkTheme ? themeStyles.fontFamily : undefined }
                                ]}
                            >
                                No content...
                            </Text>
                        );
                    }
                    
                    return null;
                })()}

                {/* Footer: Weather or Location */}
                {item.weather && (
                    <View style={styles.footerRow}>
                        <Ionicons name="location-outline" size={12} color={colors.primary} />
                        <Text style={[styles.locationText, { color: colors.text }]}>
                            {item.weather.city || 'Unknown'}
                        </Text>
                    </View>
                )}
            </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden'
  },
  touchable: {
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  dateBox: {
    width: 70,
    height: 70,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)'
  },
  dateText: { fontSize: 20, fontWeight: '700' },
  monthText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  
  contentCol: { flex: 1, justifyContent: 'space-between' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  timeText: { fontSize: 12, fontWeight: '500' },
  emoji: { fontSize: 16 },
  
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 4,
    opacity: 0.9,
  },
  
  summaryText: {
    fontSize: 15,
    lineHeight: 20,
    opacity: 0.8,
  },
  
  footerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  locationText: { fontSize: 11, opacity: 0.6 }
});

export default DiarySummaryCard;