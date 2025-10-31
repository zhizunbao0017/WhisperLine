// screens/TimelineScreen.js
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

// 新增 AnimatedDiaryItem 组件
import { MOODS } from '../data/moods';

const AnimatedDiaryItem = ({ item, index, onPress, colors }) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    // Find the mood data object
    const moodData = MOODS.find(m => m.name === item.mood);

    useEffect(() => {
        Animated.timing(opacity, {
            toValue: 1,
            duration: 350,
            delay: index * 100,
            useNativeDriver: true,
        }).start();
        Animated.timing(translateY, {
            toValue: 0,
            duration: 350,
            delay: index * 100,
            useNativeDriver: true,
        }).start();
    }, [opacity, translateY, index]);

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
                {/* Card Header */}
                <View style={styles.cardHeader}>
                    {moodData && moodData.image && (
                        <Image source={moodData.image} style={styles.moodImage} />
                    )}
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                        {item.title}
                    </Text>
                </View>

                {/* Diary Content Preview */}
                <Text
                    style={[styles.cardContent, { color: colors.text }]}
                    numberOfLines={2}
                >
                    {item.content}
                </Text>

                {/* Card Footer */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.footerLeft}>
                        {item.weather && (
                            <>
                                <Image
                                    source={{
                                        uri: `https://openweathermap.org/img/wn/${item.weather.icon}@2x.png`,
                                    }}
                                    style={styles.weatherIcon}
                                />
                                <Text
                                    style={[
                                        styles.footerText,
                                        { color: colors.text, marginLeft: 5 },
                                    ]}
                                >
                                    {item.weather.city}
                                </Text>
                            </>
                        )}
                    </View>
                    <Text style={[styles.footerText, { color: colors.text }]}>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const TimelineScreen = () => {
    const router = useRouter();
    const diaryContext = useContext(DiaryContext);
    const themeContext = useContext(ThemeContext);
    const { selectedDate, setSelectedDate } = diaryContext || {};

    if (!diaryContext || !themeContext) {
        return <ActivityIndicator size="large" style={{ flex: 1 }} />;
    }

    const { diaries, isLoading } = diaryContext;
    const { colors } = themeContext;

    const markedDates = useMemo(() => {
        const marks = {};
        if (diaries) {
            diaries.forEach(diary => {
                const dateString = new Date(diary.createdAt).toISOString().split('T')[0];
                marks[dateString] = { marked: true, dotColor: colors.primary };
            });
        }
        marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.primary };
        return marks;
    }, [diaries, selectedDate, colors]);

    const filteredDiaries = useMemo(() => {
        if (!diaries) return [];
        return diaries.filter(diary => new Date(diary.createdAt).toISOString().split('T')[0] === selectedDate);
    }, [diaries, selectedDate]);

    if (isLoading) {
        return <ActivityIndicator style={{ flex: 1, backgroundColor: colors.background }} size="large" />;
    }

    const renderCalendarHeader = () => (
        <Calendar
            theme={{
                calendarBackground: colors.background,
                textSectionTitleColor: colors.primary,
                dayTextColor: colors.text,
                todayTextColor: colors.primary,
                monthTextColor: colors.text,
                arrowColor: colors.primary,
            }}
            onDayPress={day => setSelectedDate && setSelectedDate(day.dateString)}
            markedDates={markedDates}
        />
    );

    const renderEmptyComponent = () => (
        <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.text }]}>
                No entries for this date.
            </Text>
        </View>
    );

    // 用 AnimatedDiaryItem 替换 FlatList 的渲染方法
    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <FlatList
                data={filteredDiaries}
                renderItem={({ item, index }) => (
                    <AnimatedDiaryItem
                        item={item}
                        index={index}
                        onPress={() =>
                            router.push({ pathname: '/diary-detail', params: { diary: JSON.stringify(item) } })
                        }
                        colors={colors}
                    />
                )}
                keyExtractor={(item, index) => (item && item.id ? item.id.toString() : index.toString())}
                ListHeaderComponent={renderCalendarHeader}
                ListEmptyComponent={renderEmptyComponent}
                contentContainerStyle={{ paddingBottom: 20 }} // 给列表底部增加一些边距
            />
        </View>
    );
};

// --- 开始修改：更新样式表 ---
const styles = StyleSheet.create({
    emptyContainer: { padding: 20, alignItems: 'center', marginTop: 20 },
    emptyText: { fontSize: 16, color: 'gray' },
    card: { 
        borderRadius: 12, // 更圆润的卡片
        padding: 15, 
        marginVertical: 8, 
        marginHorizontal: 16, // 增加水平边距
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2.22,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    moodImage: { width: 32, height: 32, marginRight: 12 }, // 心情图片的新样式
    moodEmoji: { fontSize: 24, marginRight: 10 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
    weatherIcon: { width: 25, height: 25 }, // 天气图标略微缩小
    cardContent: { fontSize: 14, marginBottom: 15, color: '#666' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10 },
    footerLeft: { flexDirection: 'row', alignItems: 'center' },
    footerText: { fontSize: 12 },
});
// --- 结束修改 ---

export default TimelineScreen;