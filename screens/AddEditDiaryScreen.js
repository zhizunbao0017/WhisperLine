// screens/AddEditDiaryScreen.js
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Button, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MoodSelector from '../components/MoodSelector';
import { DiaryContext } from '../context/DiaryContext';
import { SubscriptionContext } from '../context/SubscriptionContext';
import { ThemeContext } from '../context/ThemeContext';
import { getAIResponse } from '../services/aiService';
import { getCurrentWeather } from '../services/weatherService';

// CompanionAvatarView refactored: gets currentAvatar from ThemeContext directly
const CompanionAvatarView = ({ size = 80 }) => {
    const { currentAvatar } = useContext(ThemeContext);
    if (!currentAvatar) return null;

    if (currentAvatar.type === 'system') {
        return (
            <View style={[styles.avatarWrapper, { width: size, height: size }]}>
                <LottieView source={currentAvatar.source} autoPlay loop style={{ width: size, height: size }} />
            </View>
        );
    }
    if (currentAvatar.type === 'custom' && currentAvatar.image) {
        return (
            <View style={[styles.avatarWrapper, { width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}>
                <View style={[styles.glow, { width: size + 24, height: size + 24, borderRadius: (size + 24) / 2, backgroundColor: currentAvatar.glowColor || '#87CEEB' }]}>
                    <Image source={{ uri: currentAvatar.image }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: '#fff', backgroundColor: '#fff' }} resizeMode="cover" />
                </View>
            </View>
        );
    }
    return null; // Fallback
};

const AddEditDiaryScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const existingDiary = useMemo(() => {
        return params.diary ? JSON.parse(params.diary) : null;
    }, [params.diary]);

    const diaryContext = useContext(DiaryContext);
    const subscriptionContext = useContext(SubscriptionContext);
    const themeContext = useContext(ThemeContext);

    if (!diaryContext || !subscriptionContext || !themeContext) {
        return <ActivityIndicator size="large" style={{flex: 1}} />;
    }

    const { addDiary, updateDiary } = diaryContext;
    const { isProMember } = subscriptionContext;
    const { colors, currentAvatar } = themeContext;

    const [isEditMode, setIsEditMode] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedMood, setSelectedMood] = useState(existingDiary?.mood || null);
    const [weather, setWeather] = useState(null);
    const [isFetchingWeather, setIsFetchingWeather] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [showAIResponse, setShowAIResponse] = useState(false);
    
    const { freeTrialUsed, markFreeTrialAsUsed } = diaryContext;
    const canGetAIFeedback = isProMember || !freeTrialUsed;

    useEffect(() => {
        if (existingDiary) {
            setIsEditMode(true);
            setTitle(existingDiary.title || '');
            setContent(existingDiary.content || '');
            setSelectedMood(existingDiary.mood || null);
            setWeather(existingDiary.weather || null);
        }
    }, [existingDiary]);

    const handleGetWeather = async () => {
        setIsFetchingWeather(true);
        const weatherData = await getCurrentWeather();
        if (weatherData) setWeather(weatherData);
        setIsFetchingWeather(false);
    };

    const handleSave = () => {
        console.log("--- Save Button Pressed ---");

        if (!title.trim() || !content.trim() || !selectedMood) {
            alert('Please select a mood and fill in the title and content.');
            return;
        }

        if (isEditMode) {
            console.log("Mode: Editing existing diary.");
            const diaryData = { 
                id: existingDiary.id, 
                title, content, mood: selectedMood, weather, 
                createdAt: existingDiary.createdAt 
            };
            updateDiary(diaryData);
        } else {
            console.log("Mode: Adding new diary.");
            const diaryData = { 
                title, content, mood: selectedMood, weather 
            };
            addDiary(diaryData);
        }
        console.log("Diary data has been saved/updated.");

        console.log(`Checking AI feedback eligibility. canGetAIFeedback = ${canGetAIFeedback}`);

        if (canGetAIFeedback) {
            const response = getAIResponse(content);
            console.log("AI response received:", response);

            if (!isProMember) {
                markFreeTrialAsUsed();
                console.log("Free trial has been marked as used.");
            }
            
            if (response && response.trim() !== '') {
                console.log("Response is valid. Showing AI Response screen.");
                setAiResponse(response);
                setShowAIResponse(true);
            } else {
                console.log("Response is empty or invalid. Navigating back.");
                router.back();
            }
        } else {
            console.log("No AI feedback eligibility. Navigating back.");
            router.replace('/');
        }
    };

    if (showAIResponse) {
        return (
            <View style={[styles.aiContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.aiCard, { backgroundColor: colors.card }]}>
                    <View style={{ alignItems: 'center', marginBottom: 8 }}>
                        {/* Use CompanionAvatarView instead of direct logic */}
                        <CompanionAvatarView size={150} />
                    </View>
                    <Text style={[styles.aiTitle, { color: colors.text }]}>AI Feedback</Text>
                    <Text style={[styles.aiText, { color: colors.text }]}>{aiResponse}</Text>
                    <TouchableOpacity
                        style={[styles.aiDoneButton, { backgroundColor: colors.primary }]}
                        onPress={() => {
                            setShowAIResponse(false);
                            router.replace('/');
                        }}
                    >
                        <Text style={styles.aiDoneButtonText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1, backgroundColor: colors.background }}
            keyboardVerticalOffset={90}
        >
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <View style={styles.avatarSection}>
                    {/* Use CompanionAvatarView instead of direct logic */}
                    <CompanionAvatarView size={150} />
                </View>
                <MoodSelector onSelectMood={setSelectedMood} selectedMood={selectedMood} />
                <View style={[styles.weatherContainer, { backgroundColor: colors.card }]}>
                    {isFetchingWeather ? (
                        <ActivityIndicator />
                    ) : weather ? (
                        <Text style={{ color: colors.text }}>
                            {`Weather: ${weather.city}, ${weather.temperature}°C, ${weather.description}`}
                        </Text>
                    ) : (
                        <Button title="Add Current Weather" onPress={handleGetWeather} />
                    )}
                </View>
                <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Title"
                    placeholderTextColor="gray"
                />
                <TextInput
                    style={[styles.input, styles.multilineInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={content}
                    onChangeText={setContent}
                    placeholder="How was your day?"
                    multiline={true}
                    placeholderTextColor="gray"
                />
                <View style={{ marginTop: 10 }}>
                    <Button
                        title={canGetAIFeedback ? 'Save & Get Feedback' : 'Save Diary (Upgrade for AI)'}
                        onPress={handleSave}
                    />
                </View>
                {!isProMember && (
                    <Text style={[styles.limitText, { color: 'gray' }]}>
                        {canGetAIFeedback ? 'You have one free AI feedback trial.' : 'Free trial used. Upgrade for unlimited AI.'}
                    </Text>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20 },
    avatarSection: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    avatarWrapper: { alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 9, elevation: 6 },
    glow: { alignItems: 'center', justifyContent: 'center', shadowColor: "#87CEEB", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 18, elevation: 12 },
    input: { borderWidth: 1, borderRadius: 8, padding: 15, fontSize: 16, marginBottom: 20 },
    multilineInput: { height: 200, textAlignVertical: 'top' },
    weatherContainer: { alignItems: 'center', padding: 15, marginBottom: 20, borderRadius: 8 },
    limitText: { textAlign: 'center', marginTop: 10 },
    aiContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    aiCard: { borderRadius: 12, padding: 25, alignItems: 'center', width: '100%', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
    lottieAvatar: { width: 150, height: 150, marginBottom: 10 },
    aiTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
    aiText: { fontSize: 16, textAlign: 'center', marginBottom: 25, lineHeight: 24 },
    aiDoneButton: { paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25 },
    aiDoneButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default AddEditDiaryScreen;