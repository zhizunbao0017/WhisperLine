// app/manage-key-people.tsx
import React, { useContext } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserState } from '../context/UserStateContext';
import { Companion } from '../models/PIE';
import { ThemeContext } from '../context/ThemeContext';
import { ThemedText as Text } from '../components/ThemedText';

export default function ManageKeyPeopleScreen() {
  const router = useRouter();
  const themeContext = useContext(ThemeContext);
  const { userState, deleteCompanion } = useUserState();

  if (!themeContext) {
    return null;
  }

  const { colors } = themeContext;
  const companions = Object.values(userState?.companions || {}) as Companion[];

  const handleDelete = async (companionId: string) => {
    try {
      await deleteCompanion(companionId);
    } catch (error) {
      console.error('Failed to delete companion:', error);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Manage Key People
        </Text>
        <Pressable
          style={styles.addButton}
          onPress={() => {
            router.push('/people-editor');
          }}
        >
          <Ionicons name="add" size={24} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* WhisperLine Assistant - cannot be deleted */}
        <View style={[styles.personRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.personInfo}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="sparkles" size={24} color={colors.primary} />
            </View>
            <View style={styles.personDetails}>
              <Text style={[styles.personName, { color: colors.text }]}>
                WhisperLine Assistant
              </Text>
              <Text style={[styles.personSubtitle, { color: colors.secondaryText }]}>
                Default Assistant
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                router.push('/assistant-editor');
              }}
              style={styles.actionButton}
            >
              <Ionicons name="color-palette" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {/* List of user-created companions */}
        {companions.map((companion) => (
          <View
            key={companion.id}
            style={[styles.personRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.personInfo}>
              {/* Avatar */}
              {(() => {
                const avatarSource = companion.avatar?.source || companion.avatarUri;
                const hasImageAvatar = avatarSource && companion.avatar?.type === 'image';
                
                if (hasImageAvatar) {
                  return (
                    <View style={styles.avatarContainer}>
                      <Image
                        source={{ uri: avatarSource }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    </View>
                  );
                } else {
                  // Fallback to initials
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
              })()}
              <View style={styles.personDetails}>
                <Text style={[styles.personName, { color: colors.text }]}>
                  {companion.name}
                </Text>
                {/* TODO: Add edit/delete functionality */}
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  router.push({
                    pathname: '/people-editor',
                    params: { companionId: companion.id },
                  });
                }}
                style={styles.actionButton}
              >
                <Ionicons name="pencil" size={20} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    'Delete Companion',
                    `Are you sure you want to delete ${companion.name}? This action cannot be undone.`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => handleDelete(companion.id),
                      },
                    ]
                  );
                }}
                style={styles.actionButton}
              >
                <Ionicons name="trash-outline" size={20} color={colors.text} />
              </Pressable>
            </View>
          </View>
        ))}

        {companions.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              No custom companions yet. Tap the + button to add one.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
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
  personDetails: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  personSubtitle: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

