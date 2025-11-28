// app/diary-detail.js
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { ThemeContext } from '../context/ThemeContext';
import { ThemedText as Text } from '../components/ThemedText';
import MediaService from '../services/MediaService';

const DiaryDetailScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { colors } = useContext(ThemeContext);
    const { width } = useWindowDimensions();

    const diary = params.diary ? JSON.parse(params.diary) : null;
    
    const [displayHtml, setDisplayHtml] = useState('');

    useEffect(() => {
        const prepareHtml = async () => {
            if (diary?.content) {
                const restored = await MediaService.restoreHtmlImagesForDisplay(diary.content);
                setDisplayHtml(restored);
            } else {
                setDisplayHtml('');
            }
        };
        prepareHtml();
    }, [diary]);

    if (!diary) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}> 
                <Text style={{ color: colors.text }}>Diary not found.</Text>
            </View>
        );
    }

    const renderers = {
        img: ({ tnode }) => {
            const uri = tnode?.attributes?.src;
            if (!uri) {
                return null;
            }
            return (
                <Image
                    source={{ uri }}
                    style={{ width: '100%', height: undefined, aspectRatio: 1.5, marginBottom: 16, borderRadius: 8 }}
                    resizeMode="cover"
                />
            );
        },
    };

    const handleEdit = () => {
        console.log('[DiaryDetail] Edit button clicked, navigating to editor...');
        console.log('[DiaryDetail] Diary ID:', diary?.id);
        console.log('[DiaryDetail] Diary companionIDs:', diary?.companionIDs);
        
        // Close the detail modal first, then navigate to editor
        try {
            router.back(); // Close the current detail modal
            // Use setTimeout to ensure back() completes before push()
            setTimeout(() => {
                router.push({
                    pathname: '/add-edit-diary',
                    params: { diary: JSON.stringify(diary) },
                });
                console.log('[DiaryDetail] Navigation triggered successfully');
            }, 100);
        } catch (error) {
            console.error('[DiaryDetail] Navigation error:', error);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}> 
            <View style={styles.header}> 
                <TouchableOpacity 
                    onPress={handleEdit} 
                    style={styles.editButton}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                > 
                    <Ionicons name="create-outline" size={28} color={colors.primary} /> 
                </TouchableOpacity> 
            </View>
            {/* --- Date information --- */}
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
            
            {/* --- Diary content (includes title as <h1>) --- */}
            {/* --- KEY FIX: Content is the single source of truth, no separate title rendering --- */}
            {displayHtml ? (
                <View style={styles.htmlContainer}>
                    <RenderHTML
                        contentWidth={width - 40}
                        source={{ html: displayHtml }}
                        renderers={renderers}
                        ignoredDomTags={['ms-cmark-node']}
                        tagsStyles={{
                            h1: {
                                fontSize: 26,
                                fontWeight: '600',
                                marginTop: 0,
                                marginBottom: 15,
                                color: colors.text,
                            },
                            p: {
                                fontSize: 18,
                                lineHeight: 26,
                                color: colors.text,
                                marginTop: 10,
                                marginBottom: 10,
                            },
                        }}
                        baseStyle={{ color: colors.text, fontSize: 18, lineHeight: 26 }}
                    />
                </View>
            ) : (
                <Text style={[styles.content, { color: colors.text }]}>No content available.</Text>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 },
    editButton: { padding: 8 },
    titleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    moodImage: { width: 48, height: 48, marginRight: 12 },
    title: { fontSize: 26, fontWeight: '600' },
    metaContainer: { marginBottom: 12 },
    metaText: { fontSize: 14 },
    divider: { height: 1, width: '100%', marginBottom: 16 },
    htmlContainer: { width: '100%', marginBottom: 20 },
    content: { fontSize: 18, lineHeight: 26 },
});

export default DiaryDetailScreen;
