import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useContext, useLayoutEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { CompanionContext } from '../context/CompanionContext';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { ThemedText as Text } from '../components/ThemedText';

const PALETTE = [
  '#6C5CE7',
  '#E17055',
  '#00CEC9',
  '#0984E3',
  '#FF7675',
  '#00B894',
  '#FAB1A0',
  '#74B9FF',
  '#D63031',
  '#636EFA',
];

const getColorForName = (name = '') => {
  if (!name) {
    return PALETTE[0];
  }
  const code = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PALETTE[code % PALETTE.length];
};

const extractTextFromHTML = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
};

const CompanionTimelineView = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const companionContext = useContext(CompanionContext);
  const diaryContext = useContext(DiaryContext);
  const themeContext = useContext(ThemeContext);
  const themeStyles = useThemeStyles();
  const isCyberpunkTheme = themeContext?.theme === 'cyberpunk';

  const colors = themeContext?.colors ?? {
    background: '#fff',
    card: '#f6f6f9',
    border: '#d7d7e0',
    text: '#10121A',
    primary: '#4a6cf7',
  };

  const companionIdRaw = params?.id;
  const companionId = Array.isArray(companionIdRaw) ? companionIdRaw[0] : companionIdRaw;
  const fallbackNameParam = Array.isArray(params?.name) ? params.name[0] : params?.name;

  const companions = companionContext?.companions ?? [];
  const companion = companions.find((item) => String(item.id) === String(companionId));

  const diaries = diaryContext?.diaries ?? [];
  const isDiaryLoading = diaryContext?.isLoading;

  const filteredDiaries = useMemo(() => {
    if (!companionId) return [];
    return diaries
      .filter((entry) => {
        const ids = entry.companionIDs || entry.companionIds || [];
        if (!Array.isArray(ids)) return false;
        return ids.map(String).includes(String(companionId));
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [diaries, companionId]);

  const headerTitle = companion?.name || fallbackNameParam || 'Companion Timeline';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: headerTitle,
    });
  }, [navigation, headerTitle]);

  if (!companionContext || !diaryContext) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleOpenEntry = (entry) => {
    router.push({
      pathname: '/diary-detail',
      params: { diary: JSON.stringify(entry) },
    });
  };

  const renderDiaryCard = ({ item }) => {
    const plainText = extractTextFromHTML(item.content || item.contentHTML || '');
    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
        onPress={() => handleOpenEntry(item)}
        activeOpacity={0.85}
      >
        <Text style={[
          styles.cardTitle, 
          { color: colors.text },
          isCyberpunkTheme && { fontFamily: themeStyles.fontFamily }
        ]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[
          styles.cardSnippet, 
          { color: colors.text },
          isCyberpunkTheme && { fontFamily: themeStyles.fontFamily }
        ]} numberOfLines={3}>
          {plainText || 'No additional notes for this entry.'}
        </Text>
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <Text style={[styles.cardMeta, { color: colors.text }]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
          {item.weather?.icon ? (
            <Image
              source={{ uri: `https://openweathermap.org/img/wn/${item.weather.icon}@2x.png` }}
              style={styles.weatherIcon}
            />
          ) : item.weather?.description ? (
            <Text style={[styles.cardMeta, { color: colors.text }]} numberOfLines={1}>
              {item.weather.description}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (isDiaryLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {companion?.avatarIdentifier ? (
          <Image source={{ uri: companion.avatarIdentifier }} style={styles.profileAvatar} />
        ) : (
          <View
            style={[
              styles.profilePlaceholder,
              { backgroundColor: getColorForName(companion?.name ?? '') },
            ]}
          >
            <Text style={styles.profilePlaceholderInitial}>
              {(companion?.name || '??').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {companion?.name || fallbackNameParam || 'Unknown Companion'}
          </Text>
          <Text style={[styles.profileMeta, { color: colors.text }]} numberOfLines={1}>
            {filteredDiaries.length
              ? `${filteredDiaries.length} linked ${filteredDiaries.length === 1 ? 'entry' : 'entries'}`
              : 'No linked entries yet'}
          </Text>
        </View>
      </View>

      {filteredDiaries.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="book-outline" size={56} color={colors.primary} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No entries yet</Text>
          <Text style={[styles.emptyDescription, { color: colors.text }]}>
            {`你还没有和 ${
              companion?.name || fallbackNameParam || '这个陪伴者'
            } 记录任何瞬间，快去写下第一篇吧！`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDiaries}
          keyExtractor={(item) => item.id}
          renderItem={renderDiaryCard}
          contentContainerStyle={styles.timelineList}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: 16,
  },
  profilePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderInitial: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileMeta: {
    fontSize: 14,
    opacity: 0.75,
  },
  timelineList: {
    paddingBottom: 32,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardSnippet: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  cardMeta: {
    fontSize: 12,
    opacity: 0.7,
  },
  weatherIcon: {
    width: 32,
    height: 32,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.75,
  },
});

export default CompanionTimelineView;

