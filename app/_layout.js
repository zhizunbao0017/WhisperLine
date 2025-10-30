// app/_layout.js
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useContext } from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import { AuthContext, AuthProvider } from '../context/AuthContext';
import { DiaryProvider } from '../context/DiaryContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { ThemeContext, ThemeProvider } from '../context/ThemeContext';
import UnlockScreen from '../screens/UnlockScreen';

// 确保 index 路径通顺: 它指向 app/index.js
// expo-router 的 Stack.Screen name="index" 对应 app/index.js, 如果要自定义路径可以加 import 但按照 expo-router 约定无需显式导入

function MainApp() {
    const router = useRouter();
    const themeContext = useContext(ThemeContext);

    // 安全检查
    if (!themeContext) {
        return <ActivityIndicator size="large" style={{ flex: 1 }} />;
    }
    const { theme, colors } = themeContext;

    return (
        <>
            <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
            <Stack>
                {/* 路由配置: index (对应 app/index.js), 确认存在 */}
                <Stack.Screen
                    name="index"
                    options={{
                        headerStyle: { backgroundColor: colors.background },
                        headerTintColor: colors.text,
                        headerTitle: 'Lifyn',
                        headerLeft: () => (
                            <TouchableOpacity onPress={() => router.push('/settings')} style={{ marginLeft: 15 }}>
                                <Ionicons name="settings-outline" size={24} color={colors.text} />
                            </TouchableOpacity>
                        ),
                        headerRight: () => (
                            <TouchableOpacity onPress={() => router.push('/add-edit-diary')} style={{ marginRight: 15 }}>
                                <Ionicons name="add-circle" size={28} color={colors.primary} />
                            </TouchableOpacity>
                        ),
                    }}
                />
                {/* 其余路径按需添加，保持路径通顺 */}
                <Stack.Screen
                    name="settings"
                    options={{
                        title: 'Settings',
                        presentation: 'modal',
                        headerStyle: { backgroundColor: colors.background },
                        headerTintColor: colors.text
                    }}
                />
                <Stack.Screen
                    name="add-edit-diary"
                    options={{
                        title: 'New Entry',
                        presentation: 'modal',
                        headerStyle: { backgroundColor: colors.background },
                        headerTintColor: colors.text
                    }}
                />
                <Stack.Screen
                    name="privacy-policy"
                    options={{
                        title: 'Privacy Policy',
                        presentation: 'modal',
                        headerStyle: { backgroundColor: colors.background },
                        headerTintColor: colors.text
                    }}
                />
            </Stack>
        </>
    );
}

function RootLayoutNav() {
    const authContext = useContext(AuthContext);

    if (!authContext) {
        return <ActivityIndicator size="large" style={{ flex: 1 }} />;
    }
    const { isUnlocked, authenticate, isLockEnabled } = authContext;

    if (isLockEnabled && !isUnlocked) {
        return <UnlockScreen onUnlock={authenticate} />;
    }
    return <MainApp />;
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