// screens/InsightsScreen.js
import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
    ActionSheetIOS,
    Alert,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { PieChart } from 'react-native-chart-kit';
import { VictoryChart, VictoryScatter, VictoryTooltip, VictoryTheme } from 'victory-native';
import { useRouter } from 'expo-router';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { MOODS } from '../data/moods';
import themeAnalysisService from '../services/ThemeAnalysisService';

const toneColorMap = {
    positive: '#4CAF50',
    neutral: '#FFC107',
    negative: '#F44336',
};

const MOOD_SCORE_MAP = {
    Happy: 5,
    Excited: 4.5,
    Calm: 3.5,
    Tired: 2,
    Sad: 1.5,
    Angry: 1,
};

const getMoodScore = (moodName) => MOOD_SCORE_MAP[moodName] ?? 3;

const getEmotionColor = (score) => {
    if (score >= 4.5) return '#4CAF50'; // bright green
    if (score >= 3.5) return '#8BC34A'; // soft green
    if (score >= 2.5) return '#FFC107'; // amber
    if (score >= 1.5) return '#FF9800'; // orange
    return '#F44336'; // red
};

const getEmotionLabel = (score) => {
    if (score >= 4.5) return 'Uplifting';
    if (score >= 3.5) return 'Positive';
    if (score >= 2.5) return 'Balanced';
    if (score >= 1.5) return 'Tense';
    return 'Low';
};

const InsightsScreen = () => {
    const router = useRouter();
    const { colors } = useContext(ThemeContext);
    const { diaries } = useContext(DiaryContext);
    const [themes, setThemes] = useState([]);
    const [isLoadingThemes, setIsLoadingThemes] = useState(true);
    const [renameTarget, setRenameTarget] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [isRenameModalVisible, setRenameModalVisible] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const loadThemes = async () => {
            try {
                const loaded = await themeAnalysisService.getThemes();
                if (!cancelled) {
                    setThemes(loaded);
                }
            } catch (error) {
                console.warn('InsightsScreen: failed to load themes', error);
            } finally {
                if (!cancelled) {
                    setIsLoadingThemes(false);
                }
            }
        };
        loadThemes();
        return () => {
            cancelled = true;
        };
    }, []);

    const {
        calendarMarks,
        pieChartData,
        summary,
        adviceItems,
    } = useMemo(() => {
        if (!diaries || diaries.length === 0) {
            return {
                calendarMarks: {},
                pieChartData: [],
                summary: {
                    totalEntries: 0,
                    averageScore: null,
                    toneCounts: { positive: 0, neutral: 0, negative: 0 },
                    trendLabel: 'No data yet',
                    scoreDelta: 0,
                },
                adviceItems: [],
            };
        }

        const marks = {};
        const toneCounts = { positive: 0, neutral: 0, negative: 0 };
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 29);
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 6);
        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(now.getDate() - 13);

        const sorted = [...diaries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const scoreBuckets = [];
        const weeklyScores = [];
        const previousWeeklyScores = [];
        const advice = [];
        const seenAdviceIds = new Set();

        sorted.forEach((diary) => {
            const createdAt = new Date(diary.createdAt);
            const dateString = createdAt.toISOString().split('T')[0];
            const tone = diary.analysis?.summary?.tone || null;
            const score = diary.analysis?.summary?.score ?? null;

            if (tone && toneCounts[tone] !== undefined) {
                toneCounts[tone] += 1;
                if (!marks[dateString]) {
                    marks[dateString] = {
                        startingDay: true,
                        endingDay: true,
                        color: toneColorMap[tone],
                        textColor: 'white',
                    };
                }
            } else if (!marks[dateString] && diary.mood) {
                const moodData = MOODS.find((m) => m.name === diary.mood);
                if (moodData) {
                    marks[dateString] = {
                        startingDay: true,
                        endingDay: true,
                        color: moodData.color,
                        textColor: 'white',
                    };
                }
            }

            if (score !== null && createdAt >= thirtyDaysAgo && createdAt <= now) {
                scoreBuckets.push(score);
            }

            if (score !== null && createdAt >= sevenDaysAgo && createdAt <= now) {
                weeklyScores.push(score);
            } else if (score !== null && createdAt >= fourteenDaysAgo && createdAt < sevenDaysAgo) {
                previousWeeklyScores.push(score);
            }

            const diaryAdvice = diary.analysis?.advice ?? [];
            diaryAdvice.forEach((item) => {
                if (!seenAdviceIds.has(item.id)) {
                    advice.push({
                        ...item,
                        sourceDate: dateString,
                    });
                    seenAdviceIds.add(item.id);
                }
            });
        });

        const averageScore = scoreBuckets.length
            ? Math.round(scoreBuckets.reduce((sum, value) => sum + value, 0) / scoreBuckets.length)
            : null;

        const weeklyAverage = weeklyScores.length
            ? weeklyScores.reduce((sum, value) => sum + value, 0) / weeklyScores.length
            : null;

        const previousWeeklyAverage = previousWeeklyScores.length
            ? previousWeeklyScores.reduce((sum, value) => sum + value, 0) / previousWeeklyScores.length
            : null;

        let trendLabel = 'Steady';
        let scoreDelta = 0;

        if (weeklyAverage !== null && previousWeeklyAverage !== null) {
            scoreDelta = Math.round(weeklyAverage - previousWeeklyAverage);
            if (scoreDelta > 3) {
                trendLabel = 'Rising';
            } else if (scoreDelta < -3) {
                trendLabel = 'Cooling';
            }
        } else if (weeklyAverage !== null) {
            trendLabel = 'Tracking';
        } else {
            trendLabel = 'No recent data';
        }

        const chartData = Object.entries(toneCounts)
            .filter(([, count]) => count > 0)
            .map(([tone, count]) => ({
                name: tone.charAt(0).toUpperCase() + tone.slice(1),
                population: count,
                color: toneColorMap[tone],
                legendFontColor: colors.text,
                legendFontSize: 14,
            }));

        return {
            calendarMarks: marks,
            pieChartData: chartData,
            summary: {
                totalEntries: diaries.length,
                averageScore,
                toneCounts,
                trendLabel,
                scoreDelta,
            },
            adviceItems: advice.slice(0, 4),
        };
    }, [diaries, colors.text]);

    const themeBubbleData = useMemo(() => {
        if (!themes || themes.length === 0 || !diaries || diaries.length === 0) {
            return [];
        }

        const diaryMap = new Map();
        diaries.forEach((entry) => {
            if (!entry || !entry.id) return;
            diaryMap.set(String(entry.id), entry);
        });

        const metrics = themes.map((theme) => {
            const diaryIds = (theme.diaryEntryIDs || []).filter(Boolean);
            let linkedEntries = diaryIds
                .map((id) => diaryMap.get(String(id)))
                .filter(Boolean);

            if (linkedEntries.length === 0) {
                linkedEntries = diaries.filter((entry) => String(entry.themeID || '') === String(theme.id));
            }

            const energy = linkedEntries.length;
            if (energy === 0) {
                return null;
            }

            const scores = linkedEntries.map((entry) => getMoodScore(entry.mood));
            const average =
                scores.length > 0
                    ? scores.reduce((sum, value) => sum + value, 0) / scores.length
                    : 0;

            return {
                id: theme.id,
                name: theme.name || 'Untitled',
                keywords: theme.keywords || [],
                energy,
                averageEmotion: average,
                color: getEmotionColor(average),
                emotionLabel: getEmotionLabel(average),
            };
        }).filter(Boolean);

        if (!metrics || metrics.length === 0) {
            return [];
        }

        return metrics.map((item, index) => {
            const row = Math.floor(index / 3) + 1;
            const column = (index % 3) + 1;
            const size = Math.max(16, Math.min(68, Math.sqrt(item.energy) * 18));

            return {
                ...item,
                x: column,
                y: row,
                size,
            };
        });
    }, [themes, diaries]);

    const openThemeRenameModal = (themeDatum) => {
        setRenameTarget(themeDatum);
        setRenameValue(themeDatum?.name ?? '');
        setRenameModalVisible(true);
    };

    const handleRenameTheme = async () => {
        if (!renameTarget) {
            return;
        }
        const trimmed = renameValue.trim();
        try {
            await themeAnalysisService.renameTheme(renameTarget.id, trimmed);
            const refreshed = await themeAnalysisService.getThemes();
            setThemes(Array.isArray(refreshed) ? [...refreshed] : []);
            setRenameModalVisible(false);
        } catch (error) {
            console.warn('InsightsScreen: rename theme failed', error);
            Alert.alert('Rename failed', 'Please try again.');
        }
    };

    const handleThemeAction = (themeDatum) => {
        if (!themeDatum) {
            return;
        }
        const navigateToTheme = () => {
            router.push({
                pathname: '/theme-timeline',
                params: {
                    id: themeDatum.id,
                    name: themeDatum.name,
                },
            });
        };

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    title: themeDatum.name,
                    options: ['Cancel', 'View entries', 'Rename theme'],
                    cancelButtonIndex: 0,
                    destructiveButtonIndex: -1,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) {
                        navigateToTheme();
                    } else if (buttonIndex === 2) {
                        openThemeRenameModal(themeDatum);
                    }
                }
            );
        } else {
            Alert.alert(themeDatum.name, 'What would you like to do?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'View entries', onPress: navigateToTheme },
                {
                    text: 'Rename theme',
                    onPress: () => openThemeRenameModal(themeDatum),
                },
            ]);
        }
    };

    const chartWidth = Dimensions.get('window').width - 40;

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.section}>
                <Text style={[styles.title, { color: colors.text }]}>Mood Calendar</Text>
                <Text style={[styles.subtitle, { color: colors.text }]}>
                    A colorful overview of your emotional journey.
                </Text>

                <Calendar
                    markingType="period"
                    markedDates={calendarMarks}
                    theme={{
                        calendarBackground: colors.background,
                        textSectionTitleColor: colors.primary,
                        dayTextColor: colors.text,
                        todayTextColor: colors.primary,
                        monthTextColor: colors.text,
                        arrowColor: colors.primary,
                        'stylesheet.calendar.header': {
                            week: {
                                marginTop: 5,
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                            },
                        },
                    }}
                    style={{
                        borderRadius: 12,
                        marginBottom: 20,
                    }}
                />
            </View>
            <View style={styles.section}>
                <Text style={[styles.title, { color: colors.text }]}>Mood Statistics</Text>
                <View style={[styles.placeholder, { backgroundColor: colors.card, minHeight: 220, height: undefined }]}>
                    {pieChartData.length > 0 ? (
                        <PieChart
                            data={pieChartData}
                            width={chartWidth}
                            height={220}
                            chartConfig={{
                                backgroundColor: 'transparent',
                                backgroundGradientFrom: colors.card,
                                backgroundGradientTo: colors.card,
                                color: () => colors.text,
                                labelColor: () => colors.text,
                                propsForLabels: {
                                    fontSize: 12,
                                },
                            }}
                            accessor="population"
                            backgroundColor="transparent"
                            paddingLeft="15"
                            style={{
                                borderRadius: 12,
                            }}
                            absolute
                        />
                    ) : (
                        <Text style={{ color: colors.text }}>No mood statistics for the last 30 days.</Text>
                    )}
                </View>
            </View>
            <View style={styles.section}>
                <Text style={[styles.title, { color: colors.text }]}>Thematic Energy Flow</Text>
                <Text style={[styles.subtitle, { color: colors.text }]}>
                    See where your attention naturally flows and how it feels.
                </Text>
                <View style={[styles.placeholder, { backgroundColor: colors.card }]}>
                    {isLoadingThemes ? (
                        <Text style={{ color: colors.text, opacity: 0.7 }}>Analyzing themes…</Text>
                    ) : themeBubbleData.length > 0 ? (
                        <VictoryChart
                            theme={VictoryTheme.material}
                            domainPadding={30}
                            padding={{ top: 20, bottom: 60, left: 30, right: 30 }}
                            height={320}
                            width={chartWidth}
                        >
                            <VictoryScatter
                                data={themeBubbleData}
                                size={({ datum }) => datum.size}
                                style={{
                                    data: {
                                        fill: ({ datum }) => datum.color,
                                        opacity: 0.85,
                                    },
                                    labels: {
                                        fill: colors.text,
                                        fontSize: 12,
                                        fontWeight: '600',
                                    },
                                }}
                                labels={({ datum }) => datum.name}
                                labelComponent={
                                    <VictoryTooltip
                                        flyoutStyle={{
                                            fill: '#fff',
                                            stroke: colors.border || '#e0e0e0',
                                        }}
                                        style={{ fill: colors.text, fontSize: 12 }}
                                    />
                                }
                                events={[
                                    {
                                        target: 'data',
                                        eventHandlers: {
                                            onPressIn: (_, props) => {
                                                const themeDatum = props?.datum;
                                                if (!themeDatum) {
                                                    return {};
                                                }
                                                handleThemeAction(themeDatum);
                                                return {};
                                            },
                                        },
                                    },
                                ]}
                            />
                        </VictoryChart>
                    ) : (
                        <Text style={{ color: colors.text, opacity: 0.7 }}>
                            Keep journaling to discover your emerging life themes.
                        </Text>
                    )}
                </View>
                {themeBubbleData.length > 0 ? (
                    <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendSwatch, { backgroundColor: '#4CAF50' }]} />
                            <Text style={[styles.legendLabel, { color: colors.text }]}>Positive</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendSwatch, { backgroundColor: '#FFC107' }]} />
                            <Text style={[styles.legendLabel, { color: colors.text }]}>Balanced</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendSwatch, { backgroundColor: '#F44336' }]} />
                            <Text style={[styles.legendLabel, { color: colors.text }]}>Tense</Text>
                        </View>
                    </View>
                ) : null}
            </View>
            <Modal
                visible={isRenameModalVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setRenameModalVisible(false)}
            >
                <View style={styles.renameOverlay}>
                    <View style={[styles.renameCard, { backgroundColor: colors.card }]}>
                        <Text style={[styles.renameTitle, { color: colors.text }]}>
                            Rename theme
                        </Text>
                        <TextInput
                            value={renameValue}
                            onChangeText={setRenameValue}
                            placeholder="Theme name"
                            placeholderTextColor={colors.border}
                            style={[
                                styles.renameInput,
                                { color: colors.text, borderColor: colors.border },
                            ]}
                        />
                        <View style={styles.renameActions}>
                            <TouchableOpacity
                                style={[styles.secondaryButton, { borderColor: colors.border }]}
                                onPress={() => setRenameModalVisible(false)}
                                activeOpacity={0.85}
                            >
                                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                                onPress={handleRenameTheme}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.primaryButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            <View style={styles.section}>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.title, styles.cardTitle, { color: colors.text }]}>Weekly Mood Snapshot</Text>
                    {summary.totalEntries > 0 ? (
                        <>
                            <Text style={[styles.summaryText, { color: colors.text }]}>
                                Average score (30 days): {summary.averageScore !== null ? summary.averageScore : '--'}
                            </Text>
                            <Text style={[styles.summaryText, { color: colors.text }]}>
                                Trend: {summary.trendLabel}
                                {summary.scoreDelta !== 0 ? ` (${summary.scoreDelta > 0 ? '+' : ''}${summary.scoreDelta})` : ''}
                            </Text>
                            <View style={styles.toneRow}>
                                {Object.entries(summary.toneCounts).map(([tone, count]) => (
                                    <View key={tone} style={styles.tonePill}>
                                        <View style={[styles.toneDot, { backgroundColor: toneColorMap[tone] }]} />
                                        <Text style={[styles.toneText, { color: colors.text }]}>
                                            {tone.charAt(0).toUpperCase() + tone.slice(1)} · {count}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    ) : (
                        <Text style={[styles.summaryText, { color: colors.text }]}>
                            Start journaling to see your mood insights.
                        </Text>
                    )}
                </View>
            </View>
            <View style={styles.section}>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                    <Text style={[styles.title, styles.cardTitle, { color: colors.text }]}>Personal Suggestions</Text>
                    {adviceItems.length > 0 ? (
                        adviceItems.map((item) => (
                            <View key={item.id} style={styles.adviceItem}>
                                <Text style={[styles.adviceTitle, { color: colors.text }]}>{item.title}</Text>
                                <Text style={[styles.adviceBody, { color: colors.text }]}>{item.body}</Text>
                                {item.sourceDate ? (
                                    <Text style={[styles.adviceMeta, { color: colors.text }]}>
                                        Based on your entry from {item.sourceDate}
                                    </Text>
                                ) : null}
                            </View>
                        ))
                    ) : (
                        <Text style={[styles.summaryText, { color: colors.text }]}>
                            Your future reflections will unlock tailored advice here.
                        </Text>
                    )}
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: 'gray',
        marginBottom: 20,
    },
    placeholder: {
        minHeight: 200,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    card: {
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardTitle: {
        marginBottom: 12,
    },
    summaryText: {
        fontSize: 16,
        marginBottom: 8,
    },
    toneRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 12,
    },
    tonePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginRight: 8,
        marginBottom: 8,
    },
    toneDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    toneText: {
        fontSize: 14,
        fontWeight: '500',
    },
    adviceItem: {
        marginBottom: 18,
    },
    adviceTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 6,
    },
    adviceBody: {
        fontSize: 15,
        lineHeight: 20,
        marginBottom: 4,
    },
    adviceMeta: {
        fontSize: 12,
        color: 'gray',
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendSwatch: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    legendLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    renameOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        padding: 24,
    },
    renameCard: {
        borderRadius: 20,
        padding: 20,
    },
    renameTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    renameInput: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    renameActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    primaryButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        flex: 1,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
});

export default InsightsScreen;