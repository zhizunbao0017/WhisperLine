import React, { useContext, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { DiaryContext } from '../context/DiaryContext';
import chapterService from '../services/ChapterService';

const AdvancedSettingsScreen = () => {
    const themeContext = useContext(ThemeContext);
    const diaryContext = useContext(DiaryContext);

    const [isRebuilding, setIsRebuilding] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    if (!themeContext || !diaryContext) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    const { colors } = themeContext;

    const handleRebuildChapters = async () => {
        try {
            const sourceEntries = diaryContext?.diaries ?? [];
            setStatusMessage('');
            setIsRebuilding(true);
            await chapterService.rebuildChapters(sourceEntries);
            await chapterService.resetCache();
            setStatusMessage(
                sourceEntries.length
                    ? `Rebuilt chapters for ${sourceEntries.length} entries.`
                    : 'No entries available to rebuild.'
            );
        } catch (error) {
            console.warn('AdvancedSettingsScreen: chapter rebuild failed', error);
            Alert.alert('Unable to rebuild chapters', 'Please try again later.');
        } finally {
            setIsRebuilding(false);
        }
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.contentContainer}
        >
            <Text style={[styles.title, { color: colors.text }]}>Advanced Tools</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
                Power tools for troubleshooting and maintaining your experience.
            </Text>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Rebuild Chapters</Text>
                <Text style={[styles.cardDescription, { color: colors.text }]}>
                    If your Chapters insight feels out of sync, rebuild the chapter library.
                    WhisperLine will re-process every diary entry locally on your device.
                </Text>
                <TouchableOpacity
                    style={[
                        styles.primaryButton,
                        {
                            backgroundColor: colors.primary,
                            opacity: isRebuilding ? 0.7 : 1,
                        },
                    ]}
                    activeOpacity={0.85}
                    onPress={handleRebuildChapters}
                    disabled={isRebuilding}
                >
                    {isRebuilding ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.primaryButtonText}>Rebuild Chapters</Text>
                    )}
                </TouchableOpacity>
                {statusMessage ? (
                    <Text style={[styles.statusText, { color: colors.text }]}>{statusMessage}</Text>
                ) : null}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 24,
        paddingBottom: 40,
    },
    loaderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 16,
        opacity: 0.7,
        marginBottom: 24,
    },
    card: {
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 10,
    },
    cardDescription: {
        fontSize: 15,
        lineHeight: 21,
        opacity: 0.8,
        marginBottom: 18,
    },
    primaryButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    statusText: {
        marginTop: 12,
        fontSize: 14,
        opacity: 0.8,
    },
});

export default AdvancedSettingsScreen;

