// screens/TimelineScreen.js
import { useRouter } from 'expo-router';
import React, { useContext, useMemo, useRef } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { Swipeable } from 'react-native-gesture-handler';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import DiarySummaryCard from '../components/DiarySummaryCard';
import FloatingActionButton from '../components/FloatingActionButton';
import QuickCaptureContextValue from '../context/QuickCaptureContext';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const DraftSwipeableWrapper = ({ children, onDelete }) => {
    const swipeableRef = useRef(null);

    const renderRightActions = () => (
        <TouchableOpacity
            style={styles.deleteAction}
            onPress={() => {
                if (swipeableRef.current) {
                    swipeableRef.current.close();
                }
                onDelete();
            }}
            activeOpacity={0.8}
        >
            <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
    );

    return (
        <Swipeable
            ref={swipeableRef}
            friction={2}
            rightThreshold={40}
            overshootRight={false}
            renderRightActions={renderRightActions}
        >
            {children}
        </Swipeable>
    );
};

const TimelineScreen = () => {
    const router = useRouter();
    const diaryContext = useContext(DiaryContext);
    const themeContext = useContext(ThemeContext);
    const { openQuickCapture } = useContext(QuickCaptureContextValue);
    const { selectedDate, setSelectedDate } = diaryContext || {};

    if (!diaryContext || !themeContext) {
        return <ActivityIndicator size="large" style={{ flex: 1 }} />;
    }

    const { diaries, isLoading, deleteDiary } = diaryContext;
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

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <FlatList
                data={filteredDiaries}
                renderItem={({ item, index }) => {
                    const card = (
                        <DiarySummaryCard
                            item={item}
                            index={index}
                            onPress={() =>
                                router.push({ pathname: '/diary-detail', params: { diary: JSON.stringify(item) } })
                            }
                            colors={colors}
                        />
                    );

                    if (item.captureType) {
                        return (
                            <DraftSwipeableWrapper onDelete={() => deleteDiary && deleteDiary(item.id)}>
                                {card}
                            </DraftSwipeableWrapper>
                        );
                    }

                    return card;
                }}
                keyExtractor={(item, index) => (item && item.id ? item.id.toString() : index.toString())}
                ListHeaderComponent={renderCalendarHeader}
                ListEmptyComponent={renderEmptyComponent}
                contentContainerStyle={{ paddingBottom: 100 }}
            />
            <FloatingActionButton
                onPress={openQuickCapture}
                onLongPress={() => router.push('/add-edit-diary')}
            />
        </View>
    );
};

// --- Start modification: update stylesheet ---
const styles = StyleSheet.create({
    emptyContainer: { padding: 20, alignItems: 'center', marginTop: 20 },
    emptyText: { fontSize: 16, color: 'gray' },
    deleteAction: {
        backgroundColor: '#ff4d4f',
        justifyContent: 'center',
        alignItems: 'center',
        width: 70,
        marginVertical: 8,
        borderRadius: 12,
        marginRight: 16,
    },
});
// --- End modification ---

export default TimelineScreen;