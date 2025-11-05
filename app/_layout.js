// app/_layout.js
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useContext } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { AuthContext, AuthProvider } from '../context/AuthContext';
import { DiaryContext } from '../context/DiaryContext';
import { DiaryProvider } from '../context/DiaryContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { ThemeContext, ThemeProvider } from '../context/ThemeContext';
import UnlockScreen from '../screens/UnlockScreen';

function RootLayoutNav() {
    const router = useRouter();
    const authContext = useContext(AuthContext);
    const diaryContext = useContext(DiaryContext);
    const themeContext = useContext(ThemeContext);

    if (!authContext || !themeContext || !diaryContext) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    const { isUnlocked, authenticate, isLockEnabled } = authContext;
    const { theme, colors } = themeContext;
    const { selectedDate } = diaryContext;

    if (isLockEnabled && !isUnlocked) {
        return <UnlockScreen onUnlock={authenticate} />;
    }

    return (
        <>
            <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
            <Stack
                key={theme} 
                screenOptions={{
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                }}
            >
                {/* --- 1. 定义 (tabs) 屏幕，它代表整个底部标签栏 --- */}
                <Stack.Screen
                    name="(tabs)"
                    options={{
                        headerTitle: 'WhisperLine',
                        // --- 2. 移除旧的 headerLeft ---
                        headerLeft: () => null, 
                        // --- 3. 保留右上角的“新建”按钮 ---
                        headerRight: () => (
                            <TouchableOpacity onPress={() => router.push({ pathname: '/add-edit-diary', params: { date: selectedDate } })} style={{ marginRight: 15 }}>
                                <Ionicons name="add-circle" size={28} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                
                {/* --- 4. 保留所有“模态框”页面的定义 --- */}
                <Stack.Screen name="add-edit-diary" options={{ title: 'New Entry', presentation: 'modal' }} />
                <Stack.Screen name="privacy-policy" options={{ title: 'Privacy Policy', presentation: 'modal' }} />
                <Stack.Screen name="diary-detail" options={{ title: 'Diary Detail', presentation: 'modal' }} />
            </Stack>
        </>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <DiaryProvider>
                <SubscriptionProvider>
                    <ThemeProvider>
                        <RootLayoutNav />
                    </ThemeProvider>
                </SubscriptionProvider>
            </DiaryProvider>
        </AuthProvider>
    );
}