// app/_layout.js
/* eslint-disable import/no-duplicates */
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
/* eslint-enable import/no-duplicates */
import { Buffer } from 'buffer';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    LogBox,
    View,
} from 'react-native';
import { AuthContext, AuthProvider } from '../context/AuthContext';
import { DiaryContext, DiaryProvider } from '../context/DiaryContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import { ThemeContext, ThemeProvider } from '../context/ThemeContext';
import { getThemeStyles } from '../hooks/useThemeStyles';
import UnlockScreen from '../screens/UnlockScreen';
import { CompanionProvider } from '../context/CompanionContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FloatingIntentCatcher from '../components/FloatingIntentCatcher';
import MoodQuickPickerModal from '../components/MoodQuickPickerModal';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import QuickCaptureContextValue from '../context/QuickCaptureContext';
import { useFonts } from 'expo-font';
import { ThemedText as Text } from '../components/ThemedText';

const FALLBACK_THEME_COLORS = {
    background: '#ffffff',
    surface: '#ffffff',
    text: '#111111',
    secondaryText: '#6b7280',
    muted: '#94a3b8',
    primary: '#4a6cf7',
    primaryText: '#ffffff',
    card: '#ffffff',
    border: '#e3e8f0',
    accent: '#ffd166',
    tagBackground: '#eef2ff',
    tagText: '#2945b5',
};

if (typeof global.Buffer === 'undefined') {
    global.Buffer = Buffer;
}

LogBox.ignoreAllLogs(true);

function RootLayoutNav() {
    const router = useRouter();
    const pathname = usePathname();
    const authContext = useContext(AuthContext);
    const diaryContext = useContext(DiaryContext);
    const themeContext = useContext(ThemeContext);
    const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
    const [needsOnboarding, setNeedsOnboarding] = useState(false);
    const [isActionSheetVisible, setActionSheetVisible] = useState(false);
    const [isMoodPickerVisible, setMoodPickerVisible] = useState(false);
    const [intentText, setIntentText] = useState('');
    const [intentMood, setIntentMood] = useState(null);
    const [intentPhotoUri, setIntentPhotoUri] = useState(null);
    const contextsReady = Boolean(authContext && diaryContext && themeContext);
    const theme = contextsReady ? themeContext.theme : 'default';
    const colors = contextsReady ? themeContext.colors : FALLBACK_THEME_COLORS;
    const hasSelectedTheme = contextsReady ? themeContext.hasSelectedTheme : false;
    const isUnlocked = contextsReady ? authContext.isUnlocked : false;
    const authenticate = contextsReady ? authContext.authenticate : () => {};
    const isLockEnabled = contextsReady ? authContext.isLockEnabled : false;
    const selectedDate = contextsReady ? diaryContext.selectedDate : null;
    const createQuickEntry = contextsReady ? diaryContext.createQuickEntry : null;
    const toastAnim = useRef(new Animated.Value(-80)).current;
    const [toastMessage, setToastMessage] = useState('');
    const toastTimeoutRef = useRef(null);

    const resetIntent = useCallback(
        (preserveFile = false) => {
            if (!preserveFile && intentPhotoUri) {
                FileSystem.deleteAsync(intentPhotoUri, { idempotent: true }).catch(() => {});
            }
            setIntentText('');
            setIntentMood(null);
            setIntentPhotoUri(null);
        },
        [intentPhotoUri]
    );

    const showToast = useCallback((message) => {
        if (!message) {
            return;
        }
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }
        setToastMessage(message);
        Animated.timing(toastAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
        }).start(() => {
            toastTimeoutRef.current = setTimeout(() => {
                Animated.timing(toastAnim, {
                    toValue: -80,
                    duration: 220,
                    useNativeDriver: true,
                }).start(() => {
                    setToastMessage('');
                });
            }, 1800);
        });
    }, [toastAnim]);

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
                toastTimeoutRef.current = null;
            }
        };
    }, []);

    const ensureDirectoryAsync = useCallback(async (dirUri) => {
        if (!dirUri) return;
        const dirInfo = await FileSystem.getInfoAsync(dirUri);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
        }
    }, []);

    const handleAddPhoto = useCallback(async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission required', 'Allow photo access to attach a moment.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
            });

            const asset = result.assets?.[0];
            if (!asset) {
                return;
            }

            let workingUri = asset.uri;
            let extension =
                (asset.fileName || workingUri).split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';

            if (extension === 'heic' || extension === 'heif') {
                const manipulated = await ImageManipulator.manipulateAsync(
                    workingUri,
                    [],
                    { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
                );
                workingUri = manipulated.uri;
                extension = 'jpg';
            }

            // eslint-disable-next-line import/namespace
            const documentDir = FileSystem.documentDirectory ?? null;
            // eslint-disable-next-line import/namespace
            const cacheDir = FileSystem.cacheDirectory ?? '';
            const baseRoot = documentDir ?? cacheDir ?? '';
            const baseDir = `${baseRoot}quick-images/`;
            await ensureDirectoryAsync(baseDir);
            const fileName = `quick_photo_${Date.now()}.${extension}`;
            const destination = `${baseDir}${fileName}`;
            await FileSystem.copyAsync({ from: workingUri, to: destination });
            const finalUri = destination;
            setIntentPhotoUri(finalUri);
        } catch (error) {
            console.warn('Attach photo failed', error);
            Alert.alert('Attachment failed', 'Unable to attach the photo. Please try again.');
        }
    }, [ensureDirectoryAsync]);

    const handleMoodSelected = useCallback((moodName) => {
        setMoodPickerVisible(false);
        if (!moodName) {
            return;
        }
        setIntentMood(moodName);
    }, []);

    const buildIntentHtml = useCallback(
        (text, photoUri) => {
            const segments = [];
            const trimmed = text.trim();
            if (trimmed.length > 0) {
                const escaped = trimmed
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\n/g, '<br/>');
                segments.push(`<p>${escaped}</p>`);
            }
            if (photoUri) {
                segments.push(
                    `<img src="${photoUri}" data-file-uri="${photoUri}" style="max-width:100%;height:auto;border-radius:12px;margin:8px 0;" />`
                );
            }
            return segments.join('\n');
        },
        []
    );

    const handleQuickSave = useCallback(async () => {
        const hasText = intentText.trim().length > 0;
        if (!hasText && !intentPhotoUri && !intentMood) {
            showToast('Add something before saving');
            return;
        }

        const html = buildIntentHtml(intentText, intentPhotoUri);
        const titleSeed = intentText.trim().split('\n')[0] || 'Quick capture';
        const safeTitle = titleSeed.slice(0, 60);
        const createdAtIso = selectedDate
            ? new Date(`${selectedDate}T12:00:00`).toISOString()
            : new Date().toISOString();
        if (!createQuickEntry) {
            Alert.alert('Please wait', 'Diary storage is initialising. Try again in a moment.');
            return;
        }
        try {
            await createQuickEntry({
                title: safeTitle,
                content: html,
                mood: intentMood,
                captureType: 'intent',
                captureMeta: {
                    source: 'floating-intent',
                    photoUri: intentPhotoUri,
                    mood: intentMood,
                },
                createdAt: createdAtIso,
            });
            showToast('瞬间已捕捉！');
            setActionSheetVisible(false);
            resetIntent(true);
        } catch (error) {
            console.warn('Quick save failed', error);
            Alert.alert('Save failed', 'Unable to save this entry. Please try again.');
        }
    }, [
        intentText,
        intentPhotoUri,
        intentMood,
        createQuickEntry,
        buildIntentHtml,
        showToast,
        resetIntent,
        selectedDate,
    ]);

    const handleCompose = useCallback(() => {
        const draft = {
            text: intentText,
            mood: intentMood,
            photoUri: intentPhotoUri,
            contentHtml: buildIntentHtml(intentText, intentPhotoUri),
        };
        setActionSheetVisible(false);
        resetIntent(true);
        router.push({
            pathname: '/add-edit-diary',
            params: {
                ...(selectedDate ? { date: selectedDate } : {}),
                intentDraft: JSON.stringify(draft),
            },
        });
    }, [
        intentText,
        intentMood,
        intentPhotoUri,
        buildIntentHtml,
        router,
        selectedDate,
        resetIntent,
    ]);

    const handleMoodPress = useCallback(() => {
        setTimeout(() => {
            setMoodPickerVisible(true);
        }, 140);
    }, []);

    const openQuickCapture = useCallback(() => {
        resetIntent(false);
        setActionSheetVisible(true);
    }, [resetIntent]);

    const handleRemoveMood = useCallback(() => {
        setIntentMood(null);
    }, []);

    const handleRemovePhoto = useCallback(() => {
        if (intentPhotoUri) {
            FileSystem.deleteAsync(intentPhotoUri, { idempotent: true }).catch(() => {});
        }
        setIntentPhotoUri(null);
    }, [intentPhotoUri]);

    useEffect(() => {
        let cancelled = false;

        if (!hasSelectedTheme) {
            setNeedsOnboarding(false);
            setIsCheckingOnboarding(false);
            return undefined;
        }

        const checkOnboarding = async () => {
            try {
                const completed = await AsyncStorage.getItem('hasCompletedOnboarding');
                if (!cancelled) {
                    setNeedsOnboarding(!completed);
                }
            } catch (error) {
                console.warn('Failed to read onboarding status', error);
            } finally {
                if (!cancelled) {
                    setIsCheckingOnboarding(false);
                }
            }
        };

        checkOnboarding();

        return () => {
            cancelled = true;
        };
    }, [pathname, hasSelectedTheme]);

    useEffect(() => {
        if (!contextsReady) {
            return;
        }
        if (!hasSelectedTheme) {
            if (pathname !== '/theme-onboarding') {
                router.replace('/theme-onboarding');
            }
            return;
        }
        if (pathname === '/theme-onboarding') {
            router.replace('/(tabs)');
        }
    }, [contextsReady, hasSelectedTheme, pathname, router]);

    useEffect(() => {
        if (isCheckingOnboarding || !hasSelectedTheme) {
            return;
        }

        if (needsOnboarding) {
            if (pathname !== '/onboarding') {
                router.replace('/onboarding');
            }
        } else if (pathname === '/onboarding') {
            router.replace('/(tabs)');
        }
    }, [isCheckingOnboarding, needsOnboarding, pathname, router, hasSelectedTheme]);

    if (!contextsReady) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (isLockEnabled && !isUnlocked) {
        return <UnlockScreen onUnlock={authenticate} />;
    }

    if (isCheckingOnboarding) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <QuickCaptureContextValue.Provider value={{ openQuickCapture }}>
            <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
            {toastMessage ? (
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        alignItems: 'center',
                        zIndex: 2500,
                        transform: [{ translateY: toastAnim }],
                    }}
                >
                    <View
                        style={{
                            marginTop: 18,
                            backgroundColor: colors.card,
                            paddingHorizontal: 18,
                            paddingVertical: 12,
                            borderRadius: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 6,
                        }}
                    >
                        <Text style={{ color: colors.text, fontWeight: '600' }}>{toastMessage}</Text>
                    </View>
                </Animated.View>
            ) : null}
            <Stack
                key={theme} 
                screenOptions={{
                    headerStyle: { backgroundColor: colors.background },
                    headerTintColor: colors.text,
                    headerTitleStyle: { fontFamily: getThemeStyles(theme).fontFamily },
                }}
            >
                <Stack.Screen
                    name="(tabs)"
                    options={{
                        headerTitle: 'WhisperLine',
                        headerTitleStyle: theme === 'cyberpunk' 
                            ? { color: '#39FF14', fontFamily: getThemeStyles(theme).fontFamily }
                            : { fontFamily: getThemeStyles(theme).fontFamily },
                        headerLeft: () => null, 
                    }}
                />
                
                <Stack.Screen name="add-edit-diary" />
                <Stack.Screen 
                    name="privacy-policy" 
                    options={{ 
                        title: 'Privacy Policy', 
                        presentation: 'modal',
                        headerTitleStyle: { fontFamily: getThemeStyles(theme).fontFamily },
                    }} 
                />
                <Stack.Screen 
                    name="user-guide" 
                    options={{ 
                        title: 'User Guide', 
                        presentation: 'modal',
                        headerTitleStyle: { fontFamily: getThemeStyles(theme).fontFamily },
                    }} 
                />
                <Stack.Screen 
                    name="diary-detail" 
                    options={{ 
                        title: 'Diary Detail', 
                        presentation: 'modal',
                        headerTitleStyle: { fontFamily: getThemeStyles(theme).fontFamily },
                    }} 
                />
                <Stack.Screen 
                    name="companions" 
                    options={{ 
                        title: 'Companions',
                        headerTitleStyle: { fontFamily: getThemeStyles(theme).fontFamily },
                    }} 
                />
                <Stack.Screen 
                    name="companion-timeline" 
                    options={{ 
                        title: 'Companion Timeline',
                        headerTitleStyle: { fontFamily: getThemeStyles(theme).fontFamily },
                    }} 
                />
                <Stack.Screen 
                    name="theme-settings" 
                    options={{ 
                        title: 'Appearance',
                        headerTitleStyle: { fontFamily: getThemeStyles(theme).fontFamily },
                    }} 
                />
                <Stack.Screen name="theme-onboarding" options={{ headerShown: false, presentation: 'modal' }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'modal' }} />
            </Stack>
            <FloatingIntentCatcher
                visible={isActionSheetVisible}
                onDismiss={() => {
                    resetIntent(false);
                    setActionSheetVisible(false);
                }}
                value={intentText}
                onChangeText={setIntentText}
                onSubmit={handleQuickSave}
                onAddPhoto={handleAddPhoto}
                onAddMood={handleMoodPress}
                onExpand={handleCompose}
                selectedMood={intentMood}
                selectedPhoto={intentPhotoUri}
                onRemoveMood={handleRemoveMood}
                onRemovePhoto={handleRemovePhoto}
                colors={colors}
            />
            <MoodQuickPickerModal
                visible={isMoodPickerVisible}
                onClose={() => setMoodPickerVisible(false)}
                onSelectMood={handleMoodSelected}
                colors={colors}
            />
        </QuickCaptureContextValue.Provider>
    );
}

export default function RootLayout() {
    // 尝试加载字体，但如果失败则继续运行（使用系统默认字体）
    const [fontsLoaded, fontError] = useFonts({
        'HanziPen TC': require('../assets/fonts/HanziPenTC-Regular.ttf'),
        'Orbitron': require('../assets/fonts/Orbitron-Regular.ttf'),
    });

    useEffect(() => {
        if (fontError) {
            console.warn('Font loading failed, using system fonts as fallback:', fontError);
            // 不阻塞应用，继续使用系统默认字体
        }
    }, [fontError]);

    // 如果字体加载失败，仍然继续渲染应用（使用系统默认字体）
    // 只在字体正在加载且没有错误时显示加载指示器
    if (!fontsLoaded && !fontError) {
        return (
            <GestureHandlerRootView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
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
        </GestureHandlerRootView>
    );
}