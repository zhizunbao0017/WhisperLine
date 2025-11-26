// app/assistant-editor.tsx
import React, { useContext } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import { ThemedText as Text } from '../components/ThemedText';
import { ThemeAvatarSelector } from '../components/ThemeAvatarSelector';
import { SubscriptionContext } from '../context/SubscriptionContext';

export default function AssistantEditorScreen() {
  const router = useRouter();
  const themeContext = useContext(ThemeContext);
  const subscriptionContext = useContext(SubscriptionContext);

  if (!themeContext || !subscriptionContext) {
    return null;
  }

  const { colors, selectedAvatarId, setSelectedAvatarId, customAvatarUri, pickCustomAvatar } =
    themeContext;
  const { isProMember } = subscriptionContext;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Assistant Appearance
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={[styles.title, { color: colors.text }]}>
            Choose Assistant's Appearance
          </Text>
          <Text style={[styles.description, { color: colors.secondaryText }]}>
            Select a theme avatar for the WhisperLine Assistant. This will be used as the default
            appearance for the assistant.
          </Text>
        </View>

        <View style={styles.section}>
          <ThemeAvatarSelector
            currentAvatarId={selectedAvatarId}
            onSelect={setSelectedAvatarId}
            onPickCustom={pickCustomAvatar}
            customAvatarUri={customAvatarUri}
            isPro={isProMember}
          />
        </View>
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
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});

