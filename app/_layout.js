// app/_layout.js
import { Buffer } from 'buffer';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useContext } from 'react';
import { ActivityIndicator, LogBox, TouchableOpacity, View } from 'react-native';
import { AuthContext, AuthProvider } from '../context/AuthContext';
import { DiaryContext, DiaryProvider } from '../context/DiaryContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { ThemeContext, ThemeProvider } from '../context/ThemeContext';
import UnlockScreen from '../screens/UnlockScreen';
import { CompanionProvider } from '../context/CompanionContext';

if (typeof global.Buffer === 'undefined') {
    global.Buffer = Buffer;
}

LogBox.ignoreAllLogs(true);

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
                <Stack.Screen
                    name="(tabs)"
                    options={{
                        headerTitle: 'WhisperLine',
                        headerLeft: () => null, 
                        headerRight: () => (
                            <TouchableOpacity 
                                onPress={() => router.push({
                                    pathname: '/add-edit-diary',
                                    params: selectedDate ? { date: selectedDate } : {}
                                })} 
                                style={{ marginRight: 15 }}
                            >
                                <Ionicons name="add-circle" size={28} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                
                <Stack.Screen name="add-edit-diary" options={{ title: 'New Entry' }} />
                <Stack.Screen name="privacy-policy" options={{ title: 'Privacy Policy', presentation: 'modal' }} />
                <Stack.Screen name="user-guide" options={{ title: 'User Guide', presentation: 'modal' }} />
                <Stack.Screen name="diary-detail" options={{ title: 'Diary Detail', presentation: 'modal' }} />
                <Stack.Screen name="companions" options={{ title: 'Companions' }} />
                <Stack.Screen name="companion-timeline" options={{ title: 'Companion Timeline' }} />
            </Stack>
        </>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <DiaryProvider>
                <CompanionProvider>
                    <SubscriptionProvider>
                        <ThemeProvider>
                            <RootLayoutNav />
                        </ThemeProvider>
                    </SubscriptionProvider>
                </CompanionProvider>
            </DiaryProvider>
        </AuthProvider>
    );
}