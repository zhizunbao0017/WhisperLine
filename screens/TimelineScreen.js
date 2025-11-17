// screens/TimelineScreen.js
import { useRouter } from 'expo-router';
import React, { useContext, useMemo, useRef, useState, useEffect } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { Swipeable } from 'react-native-gesture-handler';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { useUserState } from '../context/UserStateContext';
import DiarySummaryCard from '../components/DiarySummaryCard';
import FloatingActionButton from '../components/FloatingActionButton';
import QuickCaptureContextValue from '../context/QuickCaptureContext';
import { ThemedText as Text } from '../components/ThemedText';
import OnThisDay from '../components/OnThisDay';
import LongPressCoachMark from '../components/LongPressCoachMark';

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

    // --- PIE Integration: Get UserState for focus chapters ---
    let userStateContext = null;
    try {
        userStateContext = useUserState();
    } catch (error) {
        // UserStateProvider not available, focus features will be disabled
        console.warn('TimelineScreen: UserStateProvider not available, focus features disabled', error);
    }

    // --- Coach Mark State ---
    const [showCoachMark, setShowCoachMark] = useState(false);

    // Check if we should show the coach mark
    useEffect(() => {
        if (!userStateContext) return;

        const hasSeenHint = userStateContext.userState?.settings?.hasSeenLongPressHint || false;
        const diaryCount = diaries?.length || 0;
        
        // Show coach mark if:
        // 1. User hasn't seen the hint yet
        // 2. User has at least 2 diary entries (engaged user)
        // 3. Not currently loading
        if (!hasSeenHint && diaryCount >= 2 && !isLoading) {
            // Small delay to ensure UI is ready
            const timer = setTimeout(() => {
                setShowCoachMark(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [userStateContext, diaries, isLoading]);

    const handleDismissCoachMark = async () => {
        setShowCoachMark(false);
        if (userStateContext?.markLongPressHintSeen) {
            await userStateContext.markLongPressHintSeen();
        }
    };

    if (!diaryContext || !themeContext) {
        return <ActivityIndicator size="large" style={{ flex: 1 }} />;
    }

    const { diaries, isLoading, deleteDiary } = diaryContext;
    const { colors } = themeContext;

    // Extract focus chapter IDs for efficient lookup
    const focusChapterIds = useMemo(() => {
        if (!userStateContext?.userState?.focus?.currentFocusChapters) {
            return new Set();
        }
        return new Set(
            userStateContext.userState.focus.currentFocusChapters.map(fc => fc.chapterId)
        );
    }, [userStateContext?.userState?.focus?.currentFocusChapters]);

    // Get all rich entries for checking chapter associations
    const allRichEntries = userStateContext?.allRichEntries || {};

    // Create a map of dates to focus status
    const focusDatesMap = useMemo(() => {
        const focusDates = new Set();
        
        if (focusChapterIds.size === 0 || Object.keys(allRichEntries).length === 0) {
            return focusDates;
        }

        // Iterate through all rich entries to find dates with focus entries
        for (const entry of Object.values(allRichEntries)) {
            if (!entry.chapterIds || entry.chapterIds.length === 0) {
                continue;
            }

            // Check if this entry belongs to any focus chapter
            const belongsToFocusChapter = entry.chapterIds.some(chapterId => 
                focusChapterIds.has(chapterId)
            );

            if (belongsToFocusChapter) {
                // Extract date string (YYYY-MM-DD)
                const dateString = entry.createdAt.split('T')[0];
                focusDates.add(dateString);
            }
        }

        return focusDates;
    }, [allRichEntries, focusChapterIds]);

    const markedDates = useMemo(() => {
        const marks = {};
        
        // First, mark all dates with diary entries
        if (diaries) {
            diaries.forEach(diary => {
                const dateString = new Date(diary.createdAt).toISOString().split('T')[0];
                const isFocusDate = focusDatesMap.has(dateString);
                const isSelected = dateString === selectedDate;
                
                // Determine background and border styles based on focus and selection
                let containerBg = 'transparent';
                let containerBorderWidth = 0;
                let containerBorderColor = 'transparent';
                let textColor = colors.text;
                let textWeight = 'normal';
                
                if (isSelected) {
                    // Selected date takes priority
                    containerBg = isFocusDate 
                        ? 'rgba(0, 255, 200, 0.4)' // Stronger focus highlight when selected
                        : colors.primary; // Primary color when selected
                    containerBorderWidth = isFocusDate ? 2 : 0;
                    containerBorderColor = isFocusDate ? 'rgba(0, 255, 200, 0.9)' : 'transparent';
                    textColor = '#fff';
                    textWeight = '700';
                } else if (isFocusDate) {
                    // Focus date (not selected)
                    containerBg = 'rgba(0, 255, 200, 0.15)';
                    containerBorderWidth = 1;
                    containerBorderColor = 'rgba(0, 255, 200, 0.5)';
                    textColor = colors.text;
                    textWeight = '600';
                }
                
                // Use custom marking to show both entry and focus status
                marks[dateString] = {
                    customStyles: {
                        container: {
                            backgroundColor: containerBg,
                            borderRadius: 4,
                            borderWidth: containerBorderWidth,
                            borderColor: containerBorderColor,
                        },
                        text: {
                            color: textColor,
                            fontWeight: textWeight,
                        },
                    },
                    // Add dot for entries
                    marked: true,
                    dotColor: isFocusDate 
                        ? 'rgba(0, 255, 200, 0.9)' // Focus dot color (cyan)
                        : colors.primary, // Regular entry dot color
                    // Add selected state
                    selected: isSelected,
                    selectedColor: colors.primary,
                };
            });
        }

        // Mark selected date even if it has no entries (for visual feedback)
        if (selectedDate && !marks[selectedDate]) {
            const isFocusDate = focusDatesMap.has(selectedDate);
            // Convert hex color to rgba for semi-transparent background
            // If colors.primary is already rgba, use it directly
            let selectedBg = colors.primary;
            if (typeof colors.primary === 'string' && colors.primary.startsWith('#')) {
                // Convert hex to rgba (assuming 6-digit hex)
                const hex = colors.primary.slice(1);
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                selectedBg = `rgba(${r}, ${g}, ${b}, 0.4)`;
            } else if (typeof colors.primary === 'string' && colors.primary.startsWith('rgba')) {
                // Already rgba, just use it
                selectedBg = colors.primary;
            }
            
            marks[selectedDate] = {
                selected: true,
                selectedColor: colors.primary,
                customStyles: {
                    container: {
                        backgroundColor: isFocusDate 
                            ? 'rgba(0, 255, 200, 0.3)' // Focus highlight background
                            : selectedBg, // Semi-transparent primary color
                        borderRadius: 4,
                        borderWidth: isFocusDate ? 2 : 0,
                        borderColor: isFocusDate ? 'rgba(0, 255, 200, 0.8)' : 'transparent',
                    },
                    text: {
                        color: '#fff',
                        fontWeight: '700',
                    },
                },
            };
        }

        return marks;
    }, [diaries, selectedDate, colors, focusDatesMap]);

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
            markingType="custom"
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
                ListHeaderComponent={
                    <>
                        <OnThisDay />
                        {renderCalendarHeader()}
                    </>
                }
                renderItem={({ item, index }) => {
                    // Get RichEntry data for emotion metadata
                    const richEntry = allRichEntries[item.id];
                    const card = (
                        <DiarySummaryCard
                            item={item}
                            richEntry={richEntry}
                            index={index}
                            onPress={() =>
                                router.push({ pathname: '/diary-detail', params: { diary: JSON.stringify(item) } })
                            }
                            colors={colors}
                        />
                    );

                    // Enable swipe-to-delete for all entries (both drafts and regular entries)
                    return (
                        <DraftSwipeableWrapper onDelete={() => {
                            Alert.alert(
                                'Delete Entry',
                                'Are you sure you want to delete this entry? This action cannot be undone.',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Delete',
                                        style: 'destructive',
                                        onPress: () => deleteDiary && deleteDiary(item.id)
                                    }
                                ]
                            );
                        }}>
                            {card}
                        </DraftSwipeableWrapper>
                    );
                }}
                keyExtractor={(item, index) => (item && item.id ? item.id.toString() : index.toString())}
                ListEmptyComponent={renderEmptyComponent}
                contentContainerStyle={{ paddingBottom: 100 }}
            />
            <FloatingActionButton
                onPress={() => router.push({
                    pathname: '/add-edit-diary',
                    params: selectedDate ? { date: selectedDate } : {}
                })}
                onLongPress={openQuickCapture}
            />
            <LongPressCoachMark
                visible={showCoachMark}
                onDismiss={handleDismissCoachMark}
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