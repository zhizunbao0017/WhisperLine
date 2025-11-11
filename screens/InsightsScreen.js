// screens/InsightsScreen.js
import React, { useContext, useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { PieChart } from 'react-native-chart-kit';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { MOODS } from '../data/moods';

const toneColorMap = {
    positive: '#4CAF50',
    neutral: '#FFC107',
    negative: '#F44336',
};

const InsightsScreen = () => {
    const { colors } = useContext(ThemeContext);
    const { diaries } = useContext(DiaryContext);

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
});

export default InsightsScreen;