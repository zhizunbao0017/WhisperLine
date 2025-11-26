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
}

export function KeyPeopleList({ colors }: KeyPeopleListProps) {
  const { primaryCompanionId, setPrimaryCompanionId } = useUserStateStore();
  const { userState } = useUserState();

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
        onPress={() => setPrimaryCompanionId(WHISPERLINE_ASSISTANT_ID)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: primaryCompanionId === WHISPERLINE_ASSISTANT_ID ? colors.primary : colors.border,
            opacity: pressed ? 0.7 : 1,
          },
          primaryCompanionId === WHISPERLINE_ASSISTANT_ID && styles.selectedCard,
        ]}
      >
        {renderAvatar(null)}
        <View style={styles.cardContent}>
          <Text style={[styles.cardName, { color: colors.text }]}>WhisperLine Assistant</Text>
          <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>Default AI companion</Text>
        </View>
        {primaryCompanionId === WHISPERLINE_ASSISTANT_ID && (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        )}
      </Pressable>

      {/* 2. Render Key People from journal */}
      {companions.map((companion) => (
        <Pressable
          key={companion.id}
          onPress={() => setPrimaryCompanionId(companion.id)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: primaryCompanionId === companion.id ? colors.primary : colors.border,
              opacity: pressed ? 0.7 : 1,
            },
            primaryCompanionId === companion.id && styles.selectedCard,
          ]}
        >
          {renderAvatar(companion)}
          <View style={styles.cardContent}>
            <Text style={[styles.cardName, { color: colors.text }]}>{companion.name}</Text>
            <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
              {companion.isInteractionEnabled ? 'AI enabled' : 'AI disabled'}
            </Text>
          </View>
          {primaryCompanionId === companion.id && (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          )}
        </Pressable>
      ))}
    </View>
  );
}

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
  },
  selectedCard: {
    borderWidth: 2,
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
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
  },
});

