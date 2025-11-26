// components/ThemeAvatarSelector.tsx
import React, { useContext } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import LottieView from 'lottie-react-native';
import { AVATARS } from '@/data/avatars';
import { ThemeContext } from '../context/ThemeContext';
import { ThemedText as TextComponent } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';

interface ThemeAvatarSelectorProps {
  currentAvatarId: string;
  onSelect: (avatarId: string) => void | Promise<void>;
  onPickCustom?: () => void | Promise<void>;
  customAvatarUri?: string | null;
  isPro?: boolean;
}

export function ThemeAvatarSelector({
  currentAvatarId,
  onSelect,
  onPickCustom,
  customAvatarUri,
  isPro = false,
}: ThemeAvatarSelectorProps) {
  const themeContext = useContext(ThemeContext);

  if (!themeContext) {
    return null;
  }

  const { colors } = themeContext;

  const handleCustomPress = () => {
    if (!isPro) {
      // Show upgrade alert if not pro
      return;
    }
    if (customAvatarUri) {
      onSelect('custom');
    } else if (onPickCustom) {
      onPickCustom();
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* Custom Avatar Button */}
      {isPro && (
        <Pressable
          onPress={handleCustomPress}
          style={[
            styles.avatarTouchable,
            {
              borderColor: currentAvatarId === 'custom' ? colors.primary : colors.border,
              backgroundColor: colors.card,
            },
          ]}
        >
          {customAvatarUri ? (
            <View style={styles.avatarImage}>
              <Image source={{ uri: customAvatarUri }} style={styles.avatarImageContent} />
            </View>
          ) : (
            <View style={[styles.plusAvatarCircle, { backgroundColor: colors.background }]}>
              <Text style={[styles.plusText, { color: colors.primary }]}>+</Text>
            </View>
          )}
          <TextComponent
            style={[
              styles.avatarLabel,
              { color: currentAvatarId === 'custom' ? colors.primary : colors.text },
            ]}
          >
            Custom
          </TextComponent>
        </Pressable>
      )}

      {/* System Avatars */}
      {AVATARS.map((avatar) => {
        const isSelected = currentAvatarId === avatar.id;
        return (
          <Pressable
            key={avatar.id}
            onPress={() => onSelect(avatar.id)}
            style={[
              styles.avatarTouchable,
              {
                borderColor: isSelected ? colors.primary : colors.border,
                backgroundColor: colors.card,
              },
            ]}
          >
            <LottieView
              autoPlay
              loop
              source={avatar.source}
              style={styles.avatarLottie}
            />
            <TextComponent
              style={[
                styles.avatarLabel,
                { color: isSelected ? colors.primary : colors.text },
              ]}
            >
              {avatar.name}
            </TextComponent>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingLeft: 2,
    alignItems: 'flex-start',
  },
  avatarTouchable: {
    borderWidth: 3,
    borderRadius: 44,
    padding: 5,
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 88,
    height: 120,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 2,
  },
  avatarLottie: {
    width: 70,
    height: 70,
    marginBottom: 4,
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 4,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  avatarImageContent: {
    width: '100%',
    height: '100%',
  },
  avatarLabel: {
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 13,
  },
  plusAvatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#DDDDDD',
  },
  plusText: {
    fontSize: 36,
    fontWeight: '300',
  },
});

