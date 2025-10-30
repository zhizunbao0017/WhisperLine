// screens/AddEditDiaryScreen.js
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
// --- 1. 从 React 导入 useEffect 和 useMemo ---
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Button, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MoodSelector from '../components/MoodSelector';
import { DiaryContext } from '../context/DiaryContext';
import { SubscriptionContext } from '../context/SubscriptionContext';
import { ThemeContext } from '../context/ThemeContext';
import { getAIResponse } from '../services/aiService';
import { getCurrentWeather } from '../services/weatherService';

// CompanionAvatarView (保持不变)
const CompanionAvatarView = ({ currentAvatar, size = 80 }) => {
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
    // 使用 useMemo 保证 existingDiary 在 params.diary 没变化时不会重新创建
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

    // --- 2. 将 isEditMode 转化为 State ---
    const [isEditMode, setIsEditMode] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [selectedMood, setSelectedMood] = useState(null);
    const [weather, setWeather] = useState(null);
    const [isFetchingWeather, setIsFetchingWeather] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [showAIResponse, setShowAIResponse] = useState(false);
    
    // 您的 AI 试用逻辑可以保持不变
    const { freeTrialUsed, markFreeTrialAsUsed } = diaryContext;
    const canGetAIFeedback = isProMember || !freeTrialUsed;

    // --- 3. 使用 useEffect 在首次加载时，且仅一次，来设置所有初始状态 ---
    useEffect(() => {
        if (existingDiary) {
            setIsEditMode(true);
            setTitle(existingDiary.title || '');
            setContent(existingDiary.content || '');
            setSelectedMood(existingDiary.mood || null);
            setWeather(existingDiary.weather || null);
        }
    }, [existingDiary]); // 依赖数组中只有 existingDiary，确保只在它变化时执行

    const handleGetWeather = async () => {
        setIsFetchingWeather(true);
        const weatherData = await getCurrentWeather();
        if (weatherData) setWeather(weatherData);
        setIsFetchingWeather(false);
    };

    // --- 4. handleSave 函数现在可以完全信任 isEditMode 的值了 ---
    const handleSave = () => {
        console.log("--- Save Button Pressed ---"); // 日志1：确认函数被调用

        if (!title.trim() || !content.trim() || !selectedMood) {
            alert('Please select a mood and fill in the title and content.');
            return;
        }

        // --- 保存/更新日记的核心逻辑 ---
        if (isEditMode) {
            console.log("Mode: Editing existing diary."); // 日志2：确认进入编辑模式
            const diaryData = { 
                id: existingDiary.id, 
                title, content, mood: selectedMood, weather, 
                createdAt: existingDiary.createdAt 
            };
            updateDiary(diaryData);
        } else {
            console.log("Mode: Adding new diary."); // 日志3：确认进入添加模式
            const diaryData = { 
                title, content, mood: selectedMood, weather 
            };
            addDiary(diaryData);
        }
        console.log("Diary data has been saved/updated."); // 日志4：确认保存动作完成

        // --- 决定下一步导航的逻辑 ---
        console.log(`Checking AI feedback eligibility. canGetAIFeedback = ${canGetAIFeedback}`); // 日志5：检查AI资格

        if (canGetAIFeedback) {
            const response = getAIResponse(content);
            console.log("AI response received:", response); // 日志6：查看AI返回了什么

            if (!isProMember) {
                markFreeTrialAsUsed();
                console.log("Free trial has been marked as used.");
            }
            
            // --- 关键修复：只有在response真实有效时才显示AI页面 ---
            if (response && response.trim() !== '') {
                console.log("Response is valid. Showing AI Response screen."); // 日志7
                setAiResponse(response);
                setShowAIResponse(true);
            } else {
                console.log("Response is empty or invalid. Navigating back."); // 日志8
                router.back(); // 如果AI没有返回有效内容，也直接返回
            }
        } else {
            console.log("No AI feedback eligibility. Navigating back.");
            // --- 修改开始 ---
            router.replace('/'); // 同样使用 replace
            // --- 修改结束 ---
        }
    };

    // --- 下面的 JSX 渲染部分保持不变 ---
    if (showAIResponse) {
        // Render the AI Response modal/section
        return (
            <View style={[styles.aiContainer, { backgroundColor: colors.background }]}>
                <View style={[styles.aiCard, { backgroundColor: colors.card }]}>
                    <View style={{ alignItems: 'center', marginBottom: 8 }}>
                        {/* Avatar robust render logic */}
                        {currentAvatar && currentAvatar.type === 'system' && currentAvatar.source ? (
                            <LottieView
                                source={currentAvatar.source}
                                autoPlay
                                loop
                                style={styles.lottieAvatar}
                            />
                        ) : currentAvatar && currentAvatar.type === 'custom' && currentAvatar.image ? (
                            <Image
                                source={currentAvatar.image}
                                style={styles.lottieAvatar}
                                resizeMode="contain"
                            />
                        ) : null}
                    </View>
                    <Text style={[styles.aiTitle, { color: colors.text }]}>AI Feedback</Text>
                    <Text style={[styles.aiText, { color: colors.text }]}>{aiResponse}</Text>
                    <TouchableOpacity
                        style={[styles.aiDoneButton, { backgroundColor: colors.primary }]}
                        onPress={() => {
                            setShowAIResponse(false);
                            // --- 修改开始 ---
                            router.replace('/'); // 使用 replace 直接替换当前页面为首页
                            // --- 修改结束 ---
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
                    {/* Avatar robust render logic */}
                    {currentAvatar && currentAvatar.type === 'system' && currentAvatar.source ? (
                        <LottieView
                            source={currentAvatar.source}
                            autoPlay
                            loop
                            style={styles.lottieAvatar}
                        />
                    ) : currentAvatar && currentAvatar.type === 'custom' && currentAvatar.image ? (
                        <Image
                            source={currentAvatar.image}
                            style={styles.lottieAvatar}
                            resizeMode="contain"
                        />
                    ) : null}
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