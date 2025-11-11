// screens/DiaryDetail.tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useContext, useMemo } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ImageStyle,
} from 'react-native';
import RenderHTML, { type RendererProps } from 'react-native-render-html';

import { ThemeContext } from '../context/ThemeContext';

const baseImageStyle: ImageStyle = {
  width: '100%',
  height: 'auto',
  resizeMode: 'contain',
  marginTop: 16,
  marginBottom: 16,
  borderRadius: 8,
};

const DiaryDetail: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useContext(ThemeContext);
  const { width } = useWindowDimensions();

  const diary = params.diary ? JSON.parse(params.diary as string) : null;

  const diaryContent = diary?.content || diary?.contentHTML || '';

  const htmlSource = useMemo(() => ({ html: diaryContent }), [diaryContent]);

  const tagsStyles = useMemo(
    () => ({
      body: {
        color: colors.text,
      },
      p: {
        marginTop: 10,
        marginBottom: 10,
        fontSize: 18,
        lineHeight: 28,
        color: colors.text,
      },
    }),
    [colors.text],
  );

  const renderers = useMemo(
    () => ({
      img: ({ tnode, TDefaultRenderer }: RendererProps<'img'>) => {
        const src = tnode.attributes.src?.trim();

        if (!src) {
          return <TDefaultRenderer tnode={tnode} />;
        }

        const normalizedSource = src.startsWith('data:')
          ? { uri: src }
          : { uri: src.startsWith('file://') || src.startsWith('content://') || src.startsWith('http') ? src : `file://${src}` };

        return <Image source={normalizedSource} style={baseImageStyle} />;
      },
    }),
    [],
  );

  if (!diary) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
        ]}
      >
        <Text style={{ color: colors.text }}>Diary not found.</Text>
      </View>
    );
  }

  const handleEdit = () => {
    router.push({
      pathname: '/add-edit-diary',
      params: {
        diary: JSON.stringify(diary),
      },
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Ionicons name="create-outline" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        {diary.mood?.image && <Image source={diary.mood.image} style={styles.moodImage} />}
        <Text style={[styles.title, { color: colors.text }]}>{diary.title}</Text>
      </View>

      <View style={styles.metaContainer}>
        <Text style={[styles.metaText, { color: colors.text }]}> 
          {new Date(diary.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {diaryContent ? (
        <View style={styles.htmlContainer}>
          <RenderHTML
            contentWidth={width - 40}
            source={htmlSource}
            baseStyle={{
              fontSize: 18,
              lineHeight: 28,
              color: colors.text,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            }}
            tagsStyles={tagsStyles}
            renderers={renderers}
            defaultTextProps={{ selectable: true }}
          />
        </View>
      ) : (
        <Text style={[styles.content, { color: colors.text }]}>No content available.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  editButton: {
    padding: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  moodImage: {
    width: 48,
    height: 48,
    marginRight: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    flex: 1,
  },
  metaContainer: {
    marginBottom: 16,
  },
  metaText: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 20,
  },
  content: {
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'justify',
  },
  htmlContainer: {
    width: '100%',
    marginBottom: 24,
  },
});

export default DiaryDetail;

