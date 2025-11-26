// components/KeyPeopleList.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useUserStateStore, { WHISPERLINE_ASSISTANT_ID } from '../src/stores/userState';
import { useUserState } from '../context/UserStateContext';
import { Companion } from '../models/PIE';

interface KeyPeopleListProps {
  colors: {
    text: string;
    secondaryText: string;
    primary: string;
    card: string;
    border: string;
    background: string;
  };
  onSelect?: (id: string) => void; // Callback receives the selected ID
}

export function KeyPeopleList({ colors, onSelect }: KeyPeopleListProps) {
  const { primaryCompanionId, setPrimaryCompanionId } = useUserStateStore();
  const { userState } = useUserState();

  const handleSelect = (id: string) => {
    // Set the global state FIRST
    setPrimaryCompanionId(id);
    
    // THEN, call the callback with the new ID
    if (onSelect) {
      onSelect(id);
    }
  };

  // Get all companions from userState
  const companions = Object.values(userState?.companions || {}) as Companion[];

  // Render avatar for a companion
  const renderAvatar = (companion: Companion | null) => {
    if (!companion) {
      // Default assistant avatar
      return (
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="sparkles" size={24} color={colors.primary} />
        </View>
      );
    }

    const avatarSource = companion.avatar?.source || companion.avatarUri;
    
    if (avatarSource && companion.avatar?.type === 'image') {
      // Custom image avatar
      return (
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: avatarSource }} 
            style={styles.avatarImage}
            resizeMode="cover"
          />
        </View>
      );
    } else if (avatarSource && companion.avatar?.type === 'lottie') {
      // Lottie avatar - show placeholder for now
      return (
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarInitials, { color: colors.primary }]}>
            {companion.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      );
    } else {
      // Fallback: show initials
      const initials = companion.name
        .split(' ')
        .map(part => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      
      return (
        <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarInitials, { color: colors.primary }]}>
            {initials}
          </Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Render the Default Assistant */}
      <Pressable
        onPress={() => handleSelect(WHISPERLINE_ASSISTANT_ID)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: primaryCompanionId === WHISPERLINE_ASSISTANT_ID ? THEME_ACCENT_COLOR : colors.border,
            opacity: pressed ? 0.7 : 1,
          },
          primaryCompanionId === WHISPERLINE_ASSISTANT_ID && styles.selectedCard,
        ]}
      >
        {renderAvatar(null)}
        <View style={styles.cardContent}>
          <Text style={[styles.personName, { color: colors.text }]}>WhisperLine Assistant</Text>
          <Text style={[styles.personSubtitle, { color: colors.secondaryText }]}>Default Assistant</Text>
        </View>
        {primaryCompanionId === WHISPERLINE_ASSISTANT_ID && (
          <Text style={styles.checkmark}>✔</Text>
        )}
      </Pressable>

      {/* 2. Render Key People from journal */}
      {companions.map((companion) => (
        <Pressable
          key={companion.id}
          onPress={() => handleSelect(companion.id)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: primaryCompanionId === companion.id ? THEME_ACCENT_COLOR : colors.border,
              opacity: pressed ? 0.7 : 1,
            },
            primaryCompanionId === companion.id && styles.selectedCard,
          ]}
        >
          {renderAvatar(companion)}
          <View style={styles.cardContent}>
            <Text style={[styles.personName, { color: colors.text }]}>{companion.name}</Text>
          </View>
          {primaryCompanionId === companion.id && (
            <Text style={styles.checkmark}>✔</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

// Theme accent color for selected state
const THEME_ACCENT_COLOR = '#A18276';

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginTop: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    gap: 12,
    marginBottom: 12,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: THEME_ACCENT_COLOR,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
  },
  personSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  checkmark: {
    color: THEME_ACCENT_COLOR,
    fontSize: 20,
    fontWeight: '600',
  },
});

