// src/store/chatStore.ts
// Chat history store for multi-turn conversations (Privacy First & Local First)
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom storage adapter for AsyncStorage
const asyncStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return await AsyncStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await AsyncStorage.removeItem(name);
  },
};

/**
 * Chat Message - Individual message in a conversation
 */
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: number;
}

/**
 * Chat Session - Collection of messages for a specific context
 */
export interface ChatSession {
  contextId: string; // e.g., "person-mike", "topic-coffee"
  messages: ChatMessage[];
  lastUpdated: number; // timestamp of last message
}

interface ChatState {
  sessions: Record<string, ChatSession>; // contextId -> ChatSession
  
  // Actions
  addMessage: (contextId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  getMessages: (contextId: string) => ChatMessage[];
  getSession: (contextId: string) => ChatSession | null;
  clearChat: (contextId: string) => void;
  clearAllChats: () => void;
  getAllSessions: () => ChatSession[];
}

const generateMessageId = (): string => {
  return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: {},

      addMessage: (contextId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        if (!contextId || !message.text || message.text.trim().length === 0) {
          return;
        }

        const normalizedContextId = contextId.toLowerCase().trim();
        const now = Date.now();
        
        const newMessage: ChatMessage = {
          id: generateMessageId(),
          text: message.text.trim(),
          sender: message.sender,
          timestamp: now,
        };

        set((state) => {
          const existingSession = state.sessions[normalizedContextId];
          
          if (existingSession) {
            // Update existing session
            return {
              sessions: {
                ...state.sessions,
                [normalizedContextId]: {
                  ...existingSession,
                  messages: [...existingSession.messages, newMessage],
                  lastUpdated: now,
                },
              },
            };
          } else {
            // Create new session
            return {
              sessions: {
                ...state.sessions,
                [normalizedContextId]: {
                  contextId: normalizedContextId,
                  messages: [newMessage],
                  lastUpdated: now,
                },
              },
            };
          }
        });

        console.log('[ChatStore] Added message:', {
          contextId: normalizedContextId,
          sender: message.sender,
          textLength: newMessage.text.length,
        });
      },

      getMessages: (contextId: string) => {
        const normalizedContextId = contextId.toLowerCase().trim();
        const session = get().sessions[normalizedContextId];
        return session?.messages || [];
      },

      getSession: (contextId: string) => {
        const normalizedContextId = contextId.toLowerCase().trim();
        return get().sessions[normalizedContextId] || null;
      },

      clearChat: (contextId: string) => {
        const normalizedContextId = contextId.toLowerCase().trim();
        set((state) => {
          const { [normalizedContextId]: removed, ...remaining } = state.sessions;
          return { sessions: remaining };
        });
        console.log('[ChatStore] Cleared chat for context:', normalizedContextId);
      },

      clearAllChats: () => {
        set({ sessions: {} });
        console.log('[ChatStore] Cleared all chats');
      },

      getAllSessions: () => {
        return Object.values(get().sessions).sort((a, b) => b.lastUpdated - a.lastUpdated);
      },
    }),
    {
      name: 'whisperline-chat-storage',
      storage: createJSONStorage(() => asyncStorage),
    }
  )
);

export default useChatStore;

