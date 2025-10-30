// screens/TimelineScreen.js
import { useRouter } from 'expo-router';
import React, { useContext, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const TimelineScreen = () => {
    const router = useRouter();
    const diaryContext = useContext(DiaryContext);
    const themeContext = useContext(ThemeContext);
    const [selectedDate, setSelectedDate] = useState(getTodayDateString());

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

    const renderDiaryItem = ({item}) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/add-edit-diary', params: { diary: JSON.stringify(item) } })}
        >
            <View style={styles.cardHeader}>
                {item.mood && <Text style={styles.moodEmoji}>{item.mood.emoji}</Text>}
                <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
                {item.weather && (
                    <Image
                        source={{ uri: `https://openweathermap.org/img/wn/${item.weather.icon}@2x.png` }}
                        style={styles.weatherIcon}
                    />
                )}
            </View>
            <Text style={[styles.cardContent, { color: colors.text }]} numberOfLines={2}>
                {item.content}
            </Text>
            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                {item.weather && (
                    <Text style={[styles.footerText, { color: colors.text }]}>{item.weather.city}</Text>
                )}
                <Text style={[styles.footerText, { color: colors.text }]}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>
        </TouchableOpacity>
    );

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
            onDayPress={day => setSelectedDate(day.dateString)}
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

    return (
        <FlatList
            style={{ flex: 1, backgroundColor: colors.background }}
            data={filteredDiaries}
            renderItem={renderDiaryItem}
            keyExtractor={(item, index) => (item && item.id ? item.id.toString() : index.toString())}
            ListHeaderComponent={renderCalendarHeader}
            ListEmptyComponent={renderEmptyComponent}
            contentContainerStyle={{ flexGrow: 1 }}
        />
    );
};

const styles = StyleSheet.create({
    emptyContainer: { padding: 20, alignItems: 'center', marginTop: 20 },
    emptyText: { fontSize: 16, color: 'gray' },
    card: { borderRadius: 8, padding: 15, marginVertical: 8, marginHorizontal: 10, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    moodEmoji: { fontSize: 24, marginRight: 10 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
    weatherIcon: { width: 30, height: 30 },
    cardContent: { fontSize: 14, marginBottom: 15 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10 },
    footerText: { fontSize: 12 },
});

export default TimelineScreen;