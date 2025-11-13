// screens/TimelineScreen.js
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { Swipeable } from 'react-native-gesture-handler';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';

const getTodayDateString = () => new Date().toISOString().split('T')[0];

// Helper function: extract plain text from HTML
const extractTextFromHTML = (html) => {
    if (!html) return '';
    // Remove all HTML tags, keep plain text
    return html.replace(/<[^>]*>?/gm, '').trim();
};

// New AnimatedDiaryItem component
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

    const plainPreview = extractTextFromHTML(item.content || item.contentHTML || '');
    const displayContent =
        plainPreview ||
        (item.captureType ? 'Tap to add more to this captured moment.' : 'No additional notes yet.');
    const displayTitle =
        (item.title || '').trim() || (item.captureType ? 'Quick capture' : 'Untitled entry');

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
                {item.captureType ? (
                    <View
                        style={[
                            styles.captureBadge,
                            {
                                backgroundColor: colors.primary ? colors.primary + '18' : 'rgba(74,108,247,0.15)',
                                borderColor: colors.primary ?? '#4a6cf7',
                            },
                        ]}
                    >
                        <Text style={[styles.captureBadgeText, { color: colors.primary ?? '#4a6cf7' }]}>
                            …
                        </Text>
                    </View>
                ) : null}
                {/* Card Header */}
                <View style={styles.cardHeader}>
                    {moodData && moodData.image && (
                        <Image source={moodData.image} style={styles.moodImage} />
                    )}
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                        {displayTitle}
                    </Text>
                </View>

                {/* Diary Content Preview */}
                <Text
                    style={[styles.cardContent, { color: colors.text }]}
                    numberOfLines={2}
                >
                    {displayContent}
                </Text>

                {/* Card Footer */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.footerLeft}>
                        {item.weather ? (
                            <View style={[styles.weatherBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                {item.weather.icon ? (
                                <Image
                                        source={{ uri: `https://openweathermap.org/img/wn/${item.weather.icon}@2x.png` }}
                                    style={styles.weatherIcon}
                                />
                                ) : (
                                    <Ionicons name="cloud-outline" size={20} color={colors.primary} style={{ marginRight: 6 }} />
                                )}
                                <View>
                                    <Text style={[styles.weatherText, { color: colors.text }]}>
                                        {item.weather.city || '—'}
                                    </Text>
                                    <Text style={[styles.weatherSubText, { color: colors.text }]}>
                                        {typeof item.weather.temperature === 'number'
                                            ? `${item.weather.temperature}°C`
                                            : (item.weather.description || '').toString()}
                                </Text>
                                </View>
                            </View>
                        ) : null}
                    </View>
                    <Text style={[styles.footerText, { color: colors.text }]}>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

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

    // Replace FlatList render method with AnimatedDiaryItem
    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <FlatList
                data={filteredDiaries}
                renderItem={({ item, index }) => {
                    const card = (
                        <AnimatedDiaryItem
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
                contentContainerStyle={{ paddingBottom: 20 }} // Add some margin to the bottom of the list
            />
        </View>
    );
};

// --- Start modification: update stylesheet ---
const styles = StyleSheet.create({
    emptyContainer: { padding: 20, alignItems: 'center', marginTop: 20 },
    emptyText: { fontSize: 16, color: 'gray' },
    card: { 
        borderRadius: 12, // More rounded card
        padding: 15, 
        marginVertical: 8, 
        marginHorizontal: 16, // Increase horizontal margin
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2.22,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    moodImage: { width: 32, height: 32, marginRight: 12 }, // New style for mood image
    moodEmoji: { fontSize: 24, marginRight: 10 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', flex: 1 },
    cardContent: { fontSize: 14, marginBottom: 15, color: '#666' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10 },
    footerLeft: { flexDirection: 'row', alignItems: 'center' },
    footerText: { fontSize: 12 },
    weatherBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        marginRight: 8,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#d5d5d5',
    },
    weatherIcon: { width: 28, height: 28, marginRight: 6 },
    weatherText: { fontSize: 12, fontWeight: '600' },
    weatherSubText: { fontSize: 11, opacity: 0.7 },
    captureBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: StyleSheet.hairlineWidth,
    },
    captureBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 3,
    },
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