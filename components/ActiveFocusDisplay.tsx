// components/ActiveFocusDisplay.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useUserStateStore, { WHISPERLINE_ASSISTANT_ID } from '../src/stores/userState';
import { useUserState } from '../context/UserStateContext';
import { Companion } from '../models/PIE';

interface ActiveFocusDisplayProps {
  colors: {
    text: string;
    secondaryText: string;
    primary: string;
    card: string;
    border: string;
    background: string;
  };
  onChangePress?: () => void;
}

function getFocusData(
  id: string,
  companions: Record<string, Companion>
): { name: string; avatar?: string; avatarType?: 'lottie' | 'image' } | null {
  if (id === WHISPERLINE_ASSISTANT_ID) {
    return {
      name: 'WhisperLine Assistant',
      avatar: undefined,
      avatarType: undefined,
    };
  }
  
  const companion = companions[id];
  if (!companion) {
    return null;
  }

  return {
    name: companion.name,
    avatar: companion.avatar?.source || companion.avatarUri,
    avatarType: companion.avatar?.type,
  };
}

export function ActiveFocusDisplay({ colors, onChangePress }: ActiveFocusDisplayProps) {
  const { primaryCompanionId } = useUserStateStore();
  const { userState } = useUserState();

  const companions = userState?.companions || {};
  const currentFocus = getFocusData(primaryCompanionId, companions);

  if (!currentFocus) {
    // Safety Net: This should ideally never happen with our new state logic
    return (
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.errorText, { color: colors.secondaryText }]}>
          Error: Focus not found.
        </Text>
      </View>
    );
  }

  // Render avatar
  const renderAvatar = () => {
    if (currentFocus.avatar && currentFocus.avatarType === 'image') {
      return (
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: currentFocus.avatar }} 
            style={styles.avatarImage}
            resizeMode="cover"
          />
        </View>
      );
    } else if (currentFocus.avatar && currentFocus.avatarType === 'lottie') {
      // Lottie avatar - show placeholder
      return (
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarInitials, { color: colors.primary }]}>
            {currentFocus.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      );
    } else {
      // Default assistant avatar or fallback
      return (
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="sparkles" size={32} color={colors.primary} />
        </View>
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.content}>
        {renderAvatar()}
        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: colors.secondaryText }]}>Active Focus</Text>
          <Text style={[styles.name, { color: colors.text }]}>{currentFocus.name}</Text>
        </View>
      </View>
      {onChangePress && (
        <Pressable
          onPress={onChangePress}
          style={({ pressed }) => [
            styles.changeButton,
            {
              backgroundColor: colors.primary + '15',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={[styles.changeButtonText, { color: colors.primary }]}>Change</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 24,
    fontWeight: '700',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
  },
  changeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

