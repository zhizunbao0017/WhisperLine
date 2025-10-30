// screens/AddEditDiaryScreen.js
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useContext, useState } from 'react';
import { ActivityIndicator, Button, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MoodSelector from '../components/MoodSelector';
import { DiaryContext } from '../context/DiaryContext';
import { SubscriptionContext } from '../context/SubscriptionContext';
import { ThemeContext } from '../context/ThemeContext';
import { getAIResponse } from '../services/aiService';
import { getCurrentWeather } from '../services/weatherService';

// CompanionAvatarView: Consumes currentAvatar from props. Renders Lottie for 'system', glowing image for 'custom'.
const CompanionAvatarView = ({ currentAvatar, size = 80 }) => {
    if (!currentAvatar) return null;

    if (currentAvatar.type === 'system') {
        return (
            <View style={[styles.avatarWrapper, { width: size, height: size }]}>
                <LottieView
                    source={currentAvatar.source}
                    autoPlay
                    loop
                    style={{ width: size, height: size }}
                />
            </View>
        );
    }

    if (currentAvatar.type === 'custom') {
        return (
            <View
                style={[
                    styles.avatarWrapper,
                    {
                        width: size,
                        height: size,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }
                ]}
            >
                <View
                    style={[
                        styles.glow,
                        {
                            width: size + 24,
                            height: size + 24,
                            borderRadius: (size + 24) / 2,
                            backgroundColor: currentAvatar.glowColor || '#87CEEB',
                        }
                    ]}
                >
                    <Image
                        source={{ uri: currentAvatar.image }}
                        style={{
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            borderWidth: 2,
                            borderColor: '#fff',
                            backgroundColor: '#fff'
                        }}
                        resizeMode="cover"
                    />
                </View>
            </View>
        );
    }

    return null; // Fallback
};

const AddEditDiaryScreen = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const existingDiary = params.diary ? JSON.parse(params.diary) : null;

    const diaryContext = useContext(DiaryContext);
    const subscriptionContext = useContext(SubscriptionContext);
    const themeContext = useContext(ThemeContext);

    if (!diaryContext || !subscriptionContext || !themeContext) {
        return <ActivityIndicator size="large" style={{flex: 1}} />;
    }

    const { addDiary, updateDiary, freeTrialUsed, markFreeTrialAsUsed } = diaryContext;
    const { isProMember } = subscriptionContext;
    const { colors, selectedAvatar, currentAvatar } = themeContext;

    const [title, setTitle] = useState(existingDiary?.title || '');
    const [content, setContent] = useState(existingDiary?.content || '');
    const [selectedMood, setSelectedMood] = useState(existingDiary?.mood || null);
    const [weather, setWeather] = useState(existingDiary?.weather || null);
    const [isFetchingWeather, setIsFetchingWeather] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [showAIResponse, setShowAIResponse] = useState(false);

    const isEditMode = !!existingDiary;
    const canGetAIFeedback = isProMember || !freeTrialUsed;

    const handleGetWeather = async () => {
        setIsFetchingWeather(true);
        const weatherData = await getCurrentWeather();
        if (weatherData) setWeather(weatherData);
        setIsFetchingWeather(false);
    };

    const handleSave = () => {
        if (!title.trim() || !content.trim() || !selectedMood) {
            alert('Please select a mood and fill in the title and content.');
            return;
        }

        let response = null;
        if (canGetAIFeedback) {
            response = getAIResponse(content);
            if (!isProMember) markFreeTrialAsUsed();
        }

        const diaryData = { id: existingDiary?.id, title, content, mood: selectedMood, weather, createdAt: existingDiary?.createdAt };
        if (isEditMode) updateDiary(diaryData);
        else addDiary(diaryData);

        if (response) {
            setAiResponse(response);
            setShowAIResponse(true);
        } else {
            router.back();
        }
    };

    if (showAIResponse) {
        return (
            <View style={[styles.aiContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.aiCard, { backgroundColor: colors.card }]}>
                    {selectedAvatar && <LottieView autoPlay loop style={styles.lottieAvatar} source={selectedAvatar.source} />}
                    <Text style={[styles.aiTitle, { color: colors.text }]}>AI Companion Response</Text>
                    <Text style={[styles.aiText, { color: colors.text }]}>{aiResponse}</Text>
                    <TouchableOpacity style={[styles.aiDoneButton, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
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
                {/* Companion Avatar at the very top, centered */}
                <View style={styles.avatarSection}>
                    <CompanionAvatarView currentAvatar={currentAvatar} size={80} />
                </View>
                {/* Mood Selector */}
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
                    style={[
                        styles.input,
                        { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }
                    ]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Title"
                    placeholderTextColor="gray"
                />
                <TextInput
                    style={[
                        styles.input,
                        styles.multilineInput,
                        { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }
                    ]}
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
                        {canGetAIFeedback
                            ? 'You have one free AI feedback trial.'
                            : 'Free trial used. Upgrade for unlimited AI.'}
                    </Text>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flexGrow: 1, padding: 20 },
    avatarSection: { alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    avatarWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        // Shadows for system and glow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 9,
        elevation: 6,
    },
    glow: {
        alignItems: 'center',
        justifyContent: 'center',
        // Subtle glow
        shadowColor: "#87CEEB",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.55,
        shadowRadius: 18,
        elevation: 12,
    },
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