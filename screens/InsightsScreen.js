// screens/InsightsScreen.js
import React, { useContext, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { MOODS } from '../data/moods'; // 导入我们带有颜色的心情数据

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
                        // 使用 'period' 标记类型
                        startingDay: true,
                        endingDay: true,
                        color: moodData.color, // 使用我们在 moods.js 中定义的颜色
                        textColor: 'white', // 日期数字的颜色
                    };
                }
            });
        }
        return marks;
    }, [diaries]); // 仅当 diaries 数组变化时，才重新计算

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.section}>
                <Text style={[styles.title, { color: colors.text }]}>Mood Calendar</Text>
                <Text style={[styles.subtitle, { color: colors.text }]}>
                    A colorful overview of your emotional journey.
                </Text>

                {/* --- 2. 渲染日历组件 --- */}
                <Calendar
                    // markingType 告诉日历我们要使用哪种标记样式
                    markingType={'period'}
                    markedDates={markedDates}
                    // 为日历应用当前的主题颜色
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
            
            {/* 我们可以在这里为未来的“心情统计”图表预留位置 */}
            <View style={styles.section}>
                <Text style={[styles.title, { color: colors.text }]}>Mood Statistics</Text>
                <View style={[styles.placeholder, { backgroundColor: colors.card }]}>
                    <Text style={{ color: colors.text }}>Pie chart coming soon...</Text>
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
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
});

export default InsightsScreen;