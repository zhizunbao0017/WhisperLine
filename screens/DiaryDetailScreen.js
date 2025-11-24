// screens/DiaryDetailScreen.js
import { Ionicons } from '@expo/vector-icons'; // We'll use a nice icon library
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useContext, useMemo } from 'react';
import { Dimensions, Image, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { ThemeContext } from '../context/ThemeContext';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { ThemedText as Text } from '../components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { stripHtml } from '../src/utils/textUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DiaryDetailScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const themeContext = useContext(ThemeContext);
    const { colors } = themeContext;
    const themeStyles = useThemeStyles();
    const isCyberpunkTheme = themeContext?.theme === 'cyberpunk';
    const { width } = useWindowDimensions(); // Get screen width for responsive layout

    // Parse diary data from parameters
    const diary = params.diary ? JSON.parse(params.diary) : null;

    if (!diary) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.text }}>Diary not found.</Text>
            </View>
        );
    }

    // Get diary content: prioritize content, fallback to contentHTML for backward compatibility
    const diaryContent = diary.content || diary.contentHTML || '';
    
    // Extract and clean title for duplicate detection
    const cleanTitle = useMemo(() => {
        if (!diaryContent) return '';
        // Extract h1 content
        const h1Match = diaryContent.match(/^<h1[^>]*>(.*?)<\/h1>/i);
        if (h1Match) {
            return stripHtml(h1Match[1]).trim();
        }
        return stripHtml(diary.title || '').trim();
    }, [diaryContent, diary.title]);
    
    // Extract clean body text (without h1) for duplicate detection
    const cleanBodyText = useMemo(() => {
        if (!diaryContent) return '';
        // Remove h1 tag and get plain text
        const withoutH1 = diaryContent.replace(/^<h1[^>]*>.*?<\/h1>/i, '').trim();
        return stripHtml(withoutH1).trim();
    }, [diaryContent]);
    
    // Check if body starts with title (duplicate detection)
    const isBodyRedundant = useMemo(() => {
        if (!cleanTitle || !cleanBodyText) return false;
        // If title is long enough and body starts with it, consider redundant
        if (cleanTitle.length > 10 && cleanBodyText.startsWith(cleanTitle)) {
            return true;
        }
        // Exact match
        if (cleanBodyText === cleanTitle) {
            return true;
        }
        return false;
    }, [cleanTitle, cleanBodyText]);

    // Custom style configuration
    const renderHTMLConfig = useMemo(() => ({
        tagsStyles: {
            p: {
                marginTop: 10,
                marginBottom: 10,
                fontSize: 18,
                lineHeight: 28,
                color: colors.text,
            },
            img: {
                marginTop: 15,
                marginBottom: 15,
                borderRadius: 8,
            },
            ul: {
                marginTop: 10,
                marginBottom: 10,
                paddingLeft: 30,
            },
            ol: {
                marginTop: 10,
                marginBottom: 10,
                paddingLeft: 30,
            },
            li: {
                marginTop: 5,
                marginBottom: 5,
                fontSize: 18,
                lineHeight: 28,
                color: colors.text,
            },
            strong: {
                fontWeight: 'bold',
                color: colors.text,
            },
            em: {
                fontStyle: 'italic',
                color: colors.text,
            },
            u: {
                textDecorationLine: 'underline',
                color: colors.text,
            },
        },
        baseStyle: {
            fontSize: 18,
            lineHeight: 28,
            color: colors.text,
            fontFamily: isCyberpunkTheme 
                ? themeStyles.fontFamily 
                : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        },
    }), [colors.text, isCyberpunkTheme, themeStyles.fontFamily]);

    // Function to navigate to edit page
    const handleEdit = () => {
        console.log('[DiaryDetailScreen] Edit button clicked, navigating to editor...');
        console.log('[DiaryDetailScreen] Diary ID:', diary?.id);
        console.log('[DiaryDetailScreen] Diary companionIDs:', diary?.companionIDs);
        
        // Ensure immediate navigation without delay
        try {
            router.push({
                pathname: '/add-edit-diary',
                params: { 
                    diary: JSON.stringify(diary) 
                }
            });
            console.log('[DiaryDetailScreen] Navigation triggered successfully');
        } catch (error) {
            console.error('[DiaryDetailScreen] Navigation error:', error);
        }
    };

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* --- Top bar with edit button --- */}
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

            {/* --- Date and weather information --- */}
            <View style={styles.metaContainer}>
                <Text style={[styles.metaText, { color: colors.text }]}>
                    {new Date(diary.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </Text>
                {diary.weather && (
                    <View style={styles.weatherContainer}>
                        <Image
                            source={{ uri: `https://openweathermap.org/img/wn/${diary.weather.icon}@2x.png` }}
                            style={styles.weatherIcon}
                        />
                        <Text style={[styles.metaText, { color: colors.text, marginLeft: 5 }]}>
                            {`${diary.weather.city}, ${diary.weather.temperature}°C`}
                        </Text>
                    </View>
                )}
            </View>

            {/* --- Analyzed Metadata Display --- */}
            {diary.analyzedMetadata && (
                <View style={styles.metadataContainer}>
                    {/* Moods */}
                    {diary.analyzedMetadata.moods && diary.analyzedMetadata.moods.length > 0 && (
                        diary.analyzedMetadata.moods.map((mood, index) => (
                            <View key={`mood-${index}`} style={[styles.moodBadge, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                                <Text style={[styles.moodText, { color: colors.primary }]}>✨ {mood}</Text>
                            </View>
                        ))
                    )}
                    
                    {/* People */}
                    {diary.analyzedMetadata.people && diary.analyzedMetadata.people.length > 0 && (
                        diary.analyzedMetadata.people.map((person, index) => (
                            <View key={`person-${index}`} style={[styles.personChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Ionicons name="person-circle" size={16} color={colors.text} />
                                <Text style={[styles.chipText, { color: colors.text }]}>{person}</Text>
                            </View>
                        ))
                    )}

                    {/* Activities */}
                    {diary.analyzedMetadata.activities && diary.analyzedMetadata.activities.length > 0 && (
                        diary.analyzedMetadata.activities.map((activity, index) => (
                            <View key={`activity-${index}`} style={[styles.activityTag, { borderColor: colors.border }]}>
                                <Text style={[styles.tagText, { color: colors.text }]}>#{activity}</Text>
                            </View>
                        ))
                    )}
                </View>
            )}

            {/* --- Divider --- */}
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* --- Diary content (includes title as <h1>) --- */}
            {/* --- KEY FIX: Content is the single source of truth, no separate title rendering --- */}
            {(diary.content || diary.contentHTML) ? (
                // Use RenderHTML to render (supports images and rich text formatting)
                // The content now includes the title as <h1>, so we render it directly
                <View style={styles.htmlContainer}>
                    <RenderHTML
                        contentWidth={width - 40} // Use useWindowDimensions width
                        source={{ html: diary.content || diary.contentHTML || '' }}
                        ignoredDomTags={['ms-cmark-node']}
                        tagsStyles={{
                            ...renderHTMLConfig.tagsStyles,
                            h1: {
                                fontSize: 28,
                                fontWeight: 'bold',
                                marginTop: 0,
                                marginBottom: 15,
                                color: colors.text,
                                fontFamily: isCyberpunkTheme ? themeStyles.fontFamily : undefined,
                            },
                        }}
                        // Custom h1 renderer to clean HTML entities and handle duplicates
                        renderers={{
                            h1: ({ TDefaultRenderer, ...props }) => {
                                // If body is redundant (starts with title), hide the h1
                                if (isBodyRedundant) {
                                    return null;
                                }
                                
                                // Extract text content and clean it
                                const rawText = props.tnode.children
                                    .map((child: any) => {
                                        if (child.type === 'text') return child.data;
                                        return '';
                                    })
                                    .join('');
                                const cleanText = stripHtml(rawText);
                                
                                return (
                                    <Text style={{
                                        fontSize: 28,
                                        fontWeight: 'bold',
                                        marginTop: 0,
                                        marginBottom: 15,
                                        color: colors.text,
                                        fontFamily: isCyberpunkTheme ? themeStyles.fontFamily : undefined,
                                    }}>
                                        {cleanText}
                                    </Text>
                                );
                            },
                            img: ({ TDefaultRenderer, ...props }) => {
                                const { src } = props.tnode.attributes;
                                // Handle local file URI (file:// or direct path)
                                if (src && (src.startsWith('file://') || src.startsWith('/'))) {
                                    return (
                                        <Image
                                            source={{ uri: src }}
                                            style={{
                                                width: '100%',
                                                height: undefined,
                                                aspectRatio: 1,
                                                marginTop: 15,
                                                marginBottom: 15,
                                                borderRadius: 8,
                                            }}
                                            resizeMode="contain"
                                        />
                                    );
                                }
                                // Use default renderer for other cases
                                return <TDefaultRenderer {...props} />;
                            },
                        }}
                        baseStyle={renderHTMLConfig.baseStyle}
                        systemFonts={isCyberpunkTheme ? [themeStyles.fontFamily] : ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif']}
                        renderersProps={{
                            img: {
                                // Ensure local file URI images can load correctly
                                enableExperimentalPercentWidth: true,
                            },
                        }}
                        // Ensure images can render local file URIs correctly
                        defaultTextProps={{
                            selectable: true,
                        }}
                    />
                </View>
            ) : (
                // If no content, show message
            <Text style={[styles.content, { color: colors.text }]}>
                    No content available.
            </Text>
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
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    editButton: {
        padding: 5,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    moodImage: {
        width: 50,
        height: 50,
        marginRight: 15,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        flex: 1,
    },
    metaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    metaText: {
        fontSize: 14,
        color: '#666',
    },
    weatherContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    weatherIcon: {
        width: 30,
        height: 30,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 20,
    },
    content: {
        fontSize: 18,
        lineHeight: 28, // Increase line height for better reading experience
        textAlign: 'justify', // Justify text
    },
    htmlContainer: {
        width: '100%',
        marginBottom: 20,
    },
    metadataContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
        alignItems: 'center',
    },
    moodBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
    },
    moodText: {
        fontSize: 14,
        fontWeight: '600',
    },
    personChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
        gap: 6,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    activityTag: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 8,
        marginBottom: 8,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.8,
    },
});

export default DiaryDetailScreen;