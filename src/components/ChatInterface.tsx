// src/components/ChatInterface.tsx
// Full conversational UI component for multi-turn chat (iMessage-style)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useChatStore, { ChatMessage } from '../store/chatStore';
import { generateReplyToUser, getChatContext, generateResponse, ChatContext } from '../services/localChatService';

interface ChatInterfaceProps {
  contextId: string; // e.g., "person-mike"
  entityName: string; // e.g., "Mike"
  entityId: string; // Normalized entity ID
  currentMood?: string;
  onClose?: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    border: string;
    primary: string;
  };
}

interface ChatBubbleProps {
  message: ChatMessage;
  isUser: boolean;
  colors: ChatInterfaceProps['colors'];
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isUser, colors }) => {
  return (
    <View
      style={[
        styles.bubbleContainer,
        isUser ? styles.userBubbleContainer : styles.aiBubbleContainer,
      ]}
    >
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Ionicons name="sparkles" size={16} color="#fff" />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: colors.primary }] // User bubble: Primary color background
            : styles.aiBubble, // AI bubble: Pure white background
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isUser ? styles.userBubbleText : styles.aiBubbleText,
          ]}
        >
          {message.text}
        </Text>
      </View>
      {isUser && <View style={styles.spacer} />}
    </View>
  );
};

const TypingIndicator: React.FC<{ colors: ChatInterfaceProps['colors'] }> = ({ colors }) => {
  const [dotIndex, setDotIndex] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setDotIndex((prev) => (prev + 1) % 3);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.bubbleContainer, styles.aiBubbleContainer]}>
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Ionicons name="sparkles" size={16} color="#fff" />
      </View>
      <View style={[styles.bubble, styles.aiBubble]}>
        <View style={styles.typingDots}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: '#2C2C2C', // Dark gray to match AI bubble text
                opacity: dotIndex === 0 ? 1 : 0.4,
              },
            ]}
          />
          <View
            style={[
              styles.dot,
              {
                backgroundColor: '#2C2C2C', // Dark gray to match AI bubble text
                opacity: dotIndex === 1 ? 1 : 0.4,
              },
            ]}
          />
          <View
            style={[
              styles.dot,
              {
                backgroundColor: '#2C2C2C', // Dark gray to match AI bubble text
                opacity: dotIndex === 2 ? 1 : 0.4,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  contextId,
  entityName,
  entityId,
  currentMood,
  onClose,
  colors,
}) => {
  const chatStore = useChatStore();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load existing messages
  const messages = chatStore.getMessages(contextId);
  const session = chatStore.getSession(contextId);

  // Get chat context for generating replies
  const chatContext = getChatContext(entityId, entityName, currentMood);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Generate welcome message if no history exists
  useEffect(() => {
    if (!session || session.messages.length === 0) {
      // Generate initial welcome message
      const welcomeMessage = generateResponse(chatContext);
      chatStore.addMessage(contextId, {
        text: welcomeMessage,
        sender: 'ai',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle send message
  const handleSend = useCallback(async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isTyping) return;

    // Save user message
    chatStore.addMessage(contextId, {
      text: trimmedText,
      sender: 'user',
    });

    // Clear input
    setInputText('');

    // Show typing indicator
    setIsTyping(true);

    // Generate AI reply with delay
    setTimeout(async () => {
      try {
        const reply = generateReplyToUser(trimmedText, chatContext);
        
        // Save AI message
        chatStore.addMessage(contextId, {
          text: reply,
          sender: 'ai',
        });
      } catch (error) {
        console.error('[ChatInterface] Error generating reply:', error);
        chatStore.addMessage(contextId, {
          text: "I'm here to listen. What would you like to talk about?",
          sender: 'ai',
        });
      } finally {
        setIsTyping(false);
      }
    }, 800); // Delay for natural feel
  }, [inputText, contextId, chatContext, isTyping]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatBubble message={item} isUser={item.sender === 'user'} colors={colors} />
    ),
    [colors]
  );

  const renderFooter = useCallback(() => {
    if (!isTyping) return null;
    return <TypingIndicator colors={colors} />;
  }, [isTyping, colors]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]} // Step 1: Solid background
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0} // Step 2: Adjusted offset for header
    >
      {/* Step 1: Solid background container - no opacity */}
      <View style={[styles.chatContainer, { backgroundColor: colors.background }]}>
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.messagesList, { backgroundColor: colors.background }]} // Step 1: Solid background
          ListFooterComponent={renderFooter}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          style={{ backgroundColor: colors.background }} // Step 1: Ensure list background is solid
        />

        {/* Input Area */}
        <View style={[styles.inputContainer, { 
          borderTopColor: colors.border,
          backgroundColor: colors.background, // Step 1: Solid background for input area
        }]}>
          <TextInput
            style={[styles.input, { 
              backgroundColor: colors.card || colors.background, // Step 1: Use card color or background
              color: colors.text, 
              borderColor: colors.border,
            }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={colors.text + '80'}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() ? colors.primary : colors.border,
                opacity: inputText.trim() ? 1 : 0.5,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isTyping}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 8,
    flexGrow: 1, // Ensure list can grow
  },
  bubbleContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    maxWidth: '80%',
  },
  userBubbleContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiBubbleContainer: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    marginTop: 4,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  // AI Bubble (Left) - High contrast white background
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  // User Bubble (Right) - Primary color background
  userBubble: {
    backgroundColor: undefined, // Will be set inline with colors.primary
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 20,
  },
  // AI Bubble Text - Dark gray for high contrast
  aiBubbleText: {
    color: '#2C2C2C',
    fontWeight: '400',
  },
  // User Bubble Text - Pure white
  userBubbleText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  spacer: {
    width: 32,
    marginHorizontal: 8,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 2,
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 40,
    fontWeight: '400', // Ensure readable text
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ChatInterface;

