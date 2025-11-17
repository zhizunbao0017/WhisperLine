// app/companion-chat.tsx
import React, { useContext, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { useUserState } from '../context/UserStateContext';
import { conversationService } from '../services/PIE/ConversationService';
import { ThemedText as Text } from '../components/ThemedText';
import { useThemeStyles } from '../hooks/useThemeStyles';

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
      .map((p, index) => ({ type: 'prompt' as const, content: p, id: `prompt-${index}-${Date.now()}` }));

    // 2. Get recent user entries (most recent first)
    const entryIds = chapter.entryIds || [];
    const userEntries = entryIds
      .slice(0, 5)
      .map((id) => ({
        type: 'entry' as const,
        entry: allRichEntries[id],
        id: `entry-${id}`,
      }))
      .filter((item) => item.entry); // Only include entries that exist

    // 3. Combine: prompts first, then entries (inverted list will show newest at bottom)
    return [...prompts, ...userEntries];
  }, [chapter, allRichEntries]);

  const handlePromptPress = (promptContent: string) => {
    // Navigate to diary editor with the prompt as initial content
    router.push({
      pathname: '/add-edit-diary',
      params: {
        prompt: promptContent,
        companionId: companionId || '',
      },
    });
  };

  const extractTextFromHTML = (html: string): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const renderItem = ({ item }: { item: ConversationItem }) => {
    if (item.type === 'prompt' && item.content) {
      return (
        <TouchableOpacity
          onPress={() => handlePromptPress(item.content!)}
          activeOpacity={0.7}
          style={styles.itemContainer}
        >
          <View style={[styles.bubble, styles.promptBubble, { backgroundColor: colors?.card || '#f5f5f5' }]}>
            <Text style={[styles.promptText, { color: colors?.text || '#111111' }]}>{item.content}</Text>
            <View style={styles.promptHint}>
              <Ionicons name="create-outline" size={14} color={colors?.primary || '#4a6cf7'} />
              <Text style={[styles.promptHintText, { color: colors?.primary || '#4a6cf7' }]}>
                Tap to write
              </Text>
            </View>
          </View>
        </TouchableOpacity>
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors?.background || '#ffffff' }]}>
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
              Tap on a prompt above to begin writing
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
    paddingBottom: 32,
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
    borderColor: '#e3e8f0',
  },
  entryBubble: {
    alignSelf: 'flex-end',
  },
  promptText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  promptHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  promptHintText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
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
});

export default CompanionChatScreen;

