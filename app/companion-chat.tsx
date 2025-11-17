// app/companion-chat.tsx
import React, { useContext, useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { DiaryContext } from '../context/DiaryContext';
import { useUserState } from '../context/UserStateContext';
import { conversationService } from '../services/PIE/ConversationService';
import { ThemedText as Text } from '../components/ThemedText';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CompanionChatParams = {
  chapterId?: string;
  companionId?: string;
};

type ConversationItem = {
  type: 'prompt' | 'entry';
  content?: string;
  entry?: any;
  id: string;
};

const CompanionChatScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<CompanionChatParams>();
  const themeContext = useContext(ThemeContext);
  const { colors } = themeContext || {};
  const themeStyles = useThemeStyles();
  const { userState, allRichEntries } = useUserState();
  const diaryContext = useContext(DiaryContext);
  const { addDiary } = diaryContext || {};
  const insets = useSafeAreaInsets();
  
  // State for chat input
  const [reply, setReply] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const chapterId = params?.chapterId;
  const companionId = params?.companionId;

  const chapter = useMemo(() => {
    if (!chapterId || !userState?.chapters) {
      return null;
    }
    return userState.chapters[chapterId];
  }, [chapterId, userState?.chapters]);

  const companion = useMemo(() => {
    if (!companionId || !userState?.companions) {
      return null;
    }
    return userState.companions[companionId];
  }, [companionId, userState?.companions]);

  const companionName = companion?.name || 'Companion';

  const conversationItems = useMemo<ConversationItem[]>(() => {
    if (!chapter) return [];

    // 1. Get AI-generated prompts
    const prompts = conversationService
      .generatePrompts(chapter, allRichEntries)
      .map((p, index) => ({ type: 'prompt' as const, content: p, id: `prompt-${index}` }));

    // 2. Get recent user entries (most recent first)
    const entryIds = chapter.entryIds || [];
    const userEntries = entryIds
      .slice(0, 10) // Show more entries for better conversation flow
      .map((id) => ({
        type: 'entry' as const,
        entry: allRichEntries[id],
        id: `entry-${id}`,
      }))
      .filter((item) => item.entry); // Only include entries that exist

    // 3. Combine: prompts first, then entries (newest entries appear at bottom)
    return [...prompts, ...userEntries];
  }, [chapter, allRichEntries]);

  const handleSend = async () => {
    if (!reply.trim() || !addDiary) return;

    try {
      // Create diary entry with the reply content
      // Convert plain text to HTML format
      const contentHtml = `<p>${reply.trim().replace(/\n/g, '</p><p>')}</p>`;
      
      // Extract title from first line (max 60 chars)
      const firstLine = reply.trim().split('\n')[0];
      const title = firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;

      // Save the diary entry
      await addDiary({
        title: title || 'Untitled',
        content: contentHtml,
        mood: null, // User can add mood later if needed
        weather: null,
        companionIDs: companionId ? [companionId] : [],
        themeID: null,
      });

      // Clear the input
      setReply('');

      // Scroll to bottom to show the new entry after it's added
      // Wait for the state to update and the new entry to appear
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (error) {
      console.error('Failed to save diary entry:', error);
    }
  };

  const extractTextFromHTML = (html: string): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const renderItem = ({ item }: { item: ConversationItem }) => {
    if (item.type === 'prompt' && item.content) {
      return (
        <View style={styles.itemContainer}>
          <View style={[styles.bubble, styles.promptBubble, { backgroundColor: colors?.card || '#f5f5f5', borderColor: colors?.border || '#e3e8f0' }]}>
            <Text style={[styles.promptText, { color: colors?.text || '#111111' }]}>{item.content}</Text>
          </View>
        </View>
      );
    }

    if (item.type === 'entry' && item.entry) {
      const entryText = extractTextFromHTML(item.entry.content || item.entry.contentHTML || '');
      const previewText = entryText.length > 150 ? entryText.substring(0, 150) + '...' : entryText;

      return (
        <View style={styles.itemContainer}>
          <View style={[styles.bubble, styles.entryBubble, { backgroundColor: colors?.primary || '#4a6cf7' }]}>
            <Text style={[styles.entryText, { color: colors?.primaryText || '#ffffff' }]}>
              {previewText || 'No content'}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  if (!chapter) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors?.background || '#ffffff' }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors?.primary || '#4a6cf7'} />
          <Text style={[styles.loadingText, { color: colors?.text || '#111111' }]}>
            Loading conversation...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors?.background || '#ffffff' }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors?.card || '#ffffff', borderBottomColor: colors?.border || '#e3e8f0' }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors?.text || '#111111'} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors?.text || '#111111' }]}>
              {companionName}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors?.secondaryText || '#6b7280' }]}>
              Conversation
            </Text>
          </View>
          <View style={styles.backButton} /> {/* Spacer for centering */}
        </View>

        {/* Chat List */}
        <FlatList
          ref={flatListRef}
          data={conversationItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          inverted={false} // Show prompts at top, entries below
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color={colors?.border || '#e3e8f0'} />
              <Text style={[styles.emptyText, { color: colors?.text || '#111111' }]}>
                Start a conversation
              </Text>
              <Text style={[styles.emptySubtext, { color: colors?.secondaryText || '#6b7280' }]}>
                Type your thoughts below to begin
              </Text>
            </View>
          }
        />

        {/* Input Bar */}
        <View style={[styles.inputContainer, { backgroundColor: colors?.card || '#ffffff', borderTopColor: colors?.border || '#e3e8f0', paddingBottom: insets.bottom }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors?.background || '#f5f5f5', color: colors?.text || '#111111', borderColor: colors?.border || '#e3e8f0' }]}
            value={reply}
            onChangeText={setReply}
            placeholder="Type your thoughts here..."
            placeholderTextColor={colors?.secondaryText || '#6b7280'}
            multiline
            textAlignVertical="top"
            maxLength={5000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: reply.trim() ? (colors?.primary || '#4a6cf7') : (colors?.border || '#e3e8f0'),
                opacity: reply.trim() ? 1 : 0.5,
              },
            ]}
            onPress={handleSend}
            disabled={!reply.trim()}
            activeOpacity={0.7}
          >
            <Ionicons
              name="send"
              size={20}
              color={reply.trim() ? (colors?.primaryText || '#ffffff') : (colors?.secondaryText || '#6b7280')}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 16,
  },
  itemContainer: {
    marginBottom: 16,
  },
  bubble: {
    padding: 16,
    borderRadius: 16,
    maxWidth: '85%',
  },
  promptBubble: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
  },
  entryBubble: {
    alignSelf: 'flex-end',
  },
  promptText: {
    fontSize: 15,
    lineHeight: 22,
  },
  entryText: {
    fontSize: 15,
    lineHeight: 22,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});

export default CompanionChatScreen;

