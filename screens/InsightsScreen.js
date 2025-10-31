// screens/InsightsScreen.js
import React, { useContext, useMemo } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { PieChart } from 'react-native-chart-kit';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { MOODS } from '../data/moods';

const InsightsScreen = () => {
    const { colors } = useContext(ThemeContext);
    const { diaries } = useContext(DiaryContext);

    // --- 1. 使用 useMemo 来高效地处理日记数据 ---
    const markedDates = useMemo(() => {
        const marks = {};

        if (diaries) {
            diaries.forEach(diary => {
                const dateString = new Date(diary.createdAt).toISOString().split('T')[0];
                const moodData = MOODS.find(m => m.name === diary.mood);
                
                // 如果当天还没有被标记，并且找到了对应的心情颜色
                if (!marks[dateString] && moodData) {
                    marks[dateString] = {
                        startingDay: true,
                        endingDay: true,
                        color: moodData.color,
                        textColor: 'white',
                    };
                }
            });
        }
        return marks;
    }, [diaries]);

    // --- 2. 计算最近 30 天的心情统计，并生成 PieChart 所需数据 ---
    const pieChartData = useMemo(() => {
        if (!diaries || diaries.length === 0) return [];

        // a. 只保留最近 30 天的日记
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // 包含今天

        const recentDiaries = diaries.filter(diary => {
            const d = new Date(diary.createdAt);
            // 保证 d 不是未来，并 >= thirtyDaysAgo
            return d >= thirtyDaysAgo && d <= new Date();
        });

        // b. 统计各 mood 出现次数
        const moodCount = {};
        recentDiaries.forEach(diary => {
            if (diary.mood) {
                moodCount[diary.mood] = (moodCount[diary.mood] || 0) + 1;
            }
        });

        // c. 转换为 PieChart 需要的数据
        // 只展示统计中出现的 mood
        const result = Object.keys(moodCount).map(moodName => {
            const moodData = MOODS.find(m => m.name === moodName) || {};
            return {
                name: moodName,
                population: moodCount[moodName],
                color: moodData.color || '#ccc',
                legendFontColor: colors.text,
                legendFontSize: 14,
            };
        });

        return result;
    }, [diaries, colors.text]);

    const chartWidth = Dimensions.get("window").width - 40;

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.section}>
                <Text style={[styles.title, { color: colors.text }]}>Mood Calendar</Text>
                <Text style={[styles.subtitle, { color: colors.text }]}>
                    A colorful overview of your emotional journey.
                </Text>

                <Calendar
                    markingType={'period'}
                    markedDates={markedDates}
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
                                justifyContent: 'space-between'
                            }
                        }
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
                                }
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
});

export default InsightsScreen;