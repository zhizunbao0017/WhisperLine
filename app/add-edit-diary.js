import { useFocusEffect, useNavigation, usePreventRemove } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Keyboard,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// --- 核心依赖 ---
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

// --- 组件和 Context ---
import MoodSelector from '../components/MoodSelector';
import ChapterSelector from '../components/ChapterSelector';
// Removed CompanionSelectorCarousel import - companion selection moved to settings
import { useThemeStyles } from '@/hooks/useThemeStyles';
import { FocusSelectionModal } from '../components/FocusSelectionModal';
import { ThemedText as Text } from '../components/ThemedText';
import { CompanionContext } from '../context/CompanionContext';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { useUserState } from '../context/UserStateContext';
import MediaService from '../services/MediaService';
import { ensureStaticServer, getPublicUrlForFileUri } from '../services/staticServer';
import themeAnalysisService from '../services/ThemeAnalysisService';
import { getCurrentWeather } from '../services/weatherService';
import useUserStateStore, { WHISPERLINE_ASSISTANT_ID } from '../src/stores/userState';
import useChapterStore from '../src/stores/useChapterStore';

const DEFAULT_HERO_IMAGE = require('../assets/images/ai_avatar.png');


// Helper function to extract plain text from HTML
const extractTextFromHTML = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '');
};

// Helper function to extract title from content HTML (if title is integrated)
// Returns { title: string, content: string }
const extractTitleFromContent = (html) => {
    if (!html) return { title: '', content: '' };
    
    // Check if content starts with <h1> tag
    const h1Match = html.match(/^<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) {
        const title = extractTextFromHTML(h1Match[1]).trim();
        const content = html.replace(/^<h1[^>]*>.*?<\/h1>\s*/i, '').trim();
        return { title, content };
    }
    
    // Check if content starts with <p><strong> (common title pattern)
    const strongMatch = html.match(/^<p[^>]*>\s*<strong[^>]*>(.*?)<\/strong>/i);
    if (strongMatch) {
        const title = extractTextFromHTML(strongMatch[1]).trim();
        const content = html.replace(/^<p[^>]*>\s*<strong[^>]*>.*?<\/strong>\s*(.*?)<\/p>/i, '$1').trim();
        // If the paragraph only contained the title, remove it
        if (!content || content === '') {
            const contentWithoutTitle = html.replace(/^<p[^>]*>\s*<strong[^>]*>.*?<\/strong>\s*<\/p>\s*/i, '').trim();
            return { title, content: contentWithoutTitle };
        }
    }
    
    // No title found in HTML, extract from first line of plain text
    const plainText = extractTextFromHTML(html);
    const firstLine = plainText.split(/\n+/).map(line => line.trim()).find(line => line.length > 0);
    const title = firstLine ? firstLine.slice(0, 60) : '';
    
    return { title, content: html };
};

// Helper function to integrate title into content HTML
const integrateTitleIntoContent = (title, content) => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    
    if (!trimmedTitle) {
        return trimmedContent;
    }
    
    // Escape HTML in title
    const escapedTitle = trimmedTitle
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    
    // If content already has an h1 tag, replace it
    if (trimmedContent.match(/^<h1[^>]*>/i)) {
        return trimmedContent.replace(/^<h1[^>]*>.*?<\/h1>/i, `<h1>${escapedTitle}</h1>`);
    }
    
    // Otherwise, prepend h1 tag
    if (trimmedContent) {
        return `<h1>${escapedTitle}</h1>\n${trimmedContent}`;
    }
    
    return `<h1>${escapedTitle}</h1>`;
};

const decodeHtmlAttribute = (value) => {
    if (!value) return value;
    return value.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
};

const remapHtmlImageSourcesToServer = async (html) => {
    if (!html) return html;

    const imgTagRegex = /<img[^>]*>/gi;
    const tags = html.match(imgTagRegex);

    if (!tags || tags.length === 0) {
        return html;
    }

    const replacements = await Promise.all(
        tags.map(async (tag) => {
            const dataMatch = tag.match(/data-file-uri="([^"]*)"/i);
            const srcMatch = tag.match(/src="([^"]*)"/i);
            const fileUri = decodeHtmlAttribute(dataMatch?.[1]) || decodeHtmlAttribute(srcMatch?.[1]);

            if (!fileUri || !fileUri.startsWith('file://')) {
                return [tag, tag];
            }

            const publicUrl = await getPublicUrlForFileUri(fileUri);
            const updatedTag = tag.replace(/src="([^"]*)"/i, `src="${publicUrl}"`);
            return [tag, updatedTag];
        })
    );

    let updatedHtml = html;
    replacements.forEach(([original, replacement]) => {
        updatedHtml = updatedHtml.replace(original, replacement);
    });

    return updatedHtml;
};

const EMOJI_OPTIONS = [
    '😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','😘','🥰','😗','😙','😚','🙂','🤗','🤩','🤔','🤨',
    '😐','😑','😶','🙄','😏','😣','😥','😮','🤐','😯','😪','😫','🥱','😴','😌','😛','😜','😝','🤤','😒','😓','😔','😕',
    '🙃','🤑','😲','☹️','🙁','😖','😞','😟','😤','😢','😭','😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪',
    '😵','😡','😠','🤬','😷','🤒','🤕','🤢','🤮','🤧','😇','🥳','🥸','😈','👻','💀','🤖','🎃','😺','😸','😹','😻','😼',
    '😽','🙀','😿','😾','🐶','🐱','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🦊','🐦','🦄','🐝','🌸','🌻','🌈','⭐','⚡',
];

// Removed getCompanionColor - no longer needed after removing companion picker modal

const normalizeWeather = (value) => {
    if (!value) return null;
    return {
        city: value.city ?? null,
        temperature: value.temperature ?? null,
        description: value.description ?? null,
        icon: value.icon ?? null,
    };
};

// Companion avatar component
const CompanionAvatarView = memo(({ size = 80, visual }) => {
    // --- DEFENSIVE: Ensure config always has valid structure ---
    const config = visual || { type: 'image', source: DEFAULT_HERO_IMAGE };
    
    // --- DEFENSIVE: Validate config structure ---
    if (!config || typeof config !== 'object') {
        // Removed expensive console.error - only log in development if needed
        return (
            <View style={[styles.avatarWrapper, { width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}>
                <Image source={DEFAULT_HERO_IMAGE} style={{ width: size, height: size }} resizeMode="cover" />
            </View>
        );
    }

    if (config.type === 'stacked') {
        const primary = config.primary ?? { type: 'image', source: DEFAULT_HERO_IMAGE };
        const secondary = config.secondary ?? primary;
        return (
            <View style={[styles.avatarWrapper, { width: size, height: size }]}>
                <View style={[styles.stackedAvatar, { width: size, height: size }]}>
                    <Image
                        source={secondary.source}
                        style={[
                            styles.stackedSecondary,
                            {
                                width: size * 0.7,
                                height: size * 0.7,
                                borderRadius: 0, // Cyberpunk style: square corners
                            },
                        ]}
                        resizeMode="cover"
                    />
                    <Image
                        source={primary.source}
                        style={[
                            styles.stackedPrimary,
                            {
                                width: size * 0.8,
                                height: size * 0.8,
                                borderRadius: 0, // Cyberpunk style: square corners
                            },
                        ]}
                        resizeMode="cover"
                    />
                </View>
            </View>
        );
    }

    if (config.type === 'lottie' && config.source) {
        return (
            <View style={[styles.avatarWrapper, { width: size, height: size }]}>
                <LottieView source={config.source} autoPlay loop style={{ width: size, height: size }} />
            </View>
        );
    }

    if (config.type === 'image' && config.source) {
        // Check if this is a companion avatar (has URI) vs theme placeholder
        const isCompanionAvatar = config.source && typeof config.source === 'object' && config.source.uri;
        
        if (isCompanionAvatar) {
            // Companion avatar: circular, no theme styling, high zIndex
            return (
                <View style={[styles.avatarWrapper, { width: size, height: size, alignItems: 'center', justifyContent: 'center', zIndex: 10 }]}>
                    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: 'transparent' }}>
                        <Image
                            source={config.source}
                            style={{ width: size, height: size }}
                            resizeMode="cover"
                        />
                    </View>
                </View>
            );
        }
        
        // Theme placeholder: apply theme-specific styling (Cyberpunk square style)
        return (
            <View style={[styles.avatarWrapper, { width: size, height: size, alignItems: 'center', justifyContent: 'center', zIndex: 1 }]}>
                <View style={[styles.glow, { width: size + 24, height: size + 24, borderRadius: 0 }]}>
                    <Image
                        source={config.source}
                        style={{ width: size, height: size, borderRadius: 0, borderWidth: 2, borderColor: '#FF0000', backgroundColor: '#fff' }}
                        resizeMode="cover"
                    />
                </View>
            </View>
        );
    }

    // --- DEFENSIVE: Always return a fallback instead of null ---
    return (
        <View style={[styles.avatarWrapper, { width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}>
            <Image source={DEFAULT_HERO_IMAGE} style={{ width: size, height: size }} resizeMode="cover" />
        </View>
    );
});

const AddEditDiaryScreen = () => {
    const router = useRouter();
    // CRITICAL: Use ref to track if component is mounted for async operations
    const isMountedRef = useRef(true);
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    
    const entryDateParam = useMemo(() => {
        const raw = params?.date;
        if (!raw) return undefined;
        return Array.isArray(raw) ? raw[0] : raw;
    }, [params]);
    const chapterIdParam = useMemo(() => {
        const raw = params?.chapterId;
        if (!raw) return undefined;
        return Array.isArray(raw) ? raw[0] : raw;
    }, [params]);
    const promptParam = useMemo(() => {
        const raw = params?.prompt;
        if (!raw) return undefined;
        return Array.isArray(raw) ? raw[0] : raw;
    }, [params]);
    const existingDiary = useMemo(() => {
        const diary = params.diary ? JSON.parse(params.diary) : null;
        return diary;
    }, [params.diary]);
    const intentDraft = useMemo(() => {
        const raw = params?.intentDraft;
        if (!raw) {
            return null;
        }
        const stringified = Array.isArray(raw) ? raw[0] : raw;
        try {
            return JSON.parse(stringified);
        } catch (error) {
            console.warn('AddEditDiary: failed to parse intentDraft', error);
            return null;
        }
    }, [params?.intentDraft]);
    const existingCompanionIds = useMemo(() => {
        if (!existingDiary) {
            return [];
        }
        const companions =
            existingDiary.companionIDs ||
            existingDiary.companionIds ||
            existingDiary.companions ||
            [];
        return Array.isArray(companions) ? companions.map((id) => String(id)) : [];
    }, [existingDiary]);

    // --- Hooks and Context ---
    const { addDiary, updateDiary, saveDiary } = useContext(DiaryContext);
    const companionContext = useContext(CompanionContext);
    const companionsLoading = companionContext?.isLoading;
    // Get userState to access user-created companions
    // UserStateProvider should always be available as it wraps the entire app
    // If it's not available, there's a provider setup issue that needs to be fixed
    const userStateContext = useUserState();
    const userState = userStateContext?.userState;
    const themeContext = useContext(ThemeContext);
    const themeStyles = useThemeStyles();
    const currentAvatar = themeContext?.currentAvatar;
    const isChildTheme = themeContext?.theme === 'child';
    const isCyberpunkTheme = themeContext?.theme === 'cyberpunk';
    
    const headingFontFamily = themeStyles.headingFontFamily ?? 'System';
    const bodyFontFamily = themeStyles.bodyFontFamily ?? 'System';
    const buttonFontFamily = themeStyles.buttonFontFamily ?? headingFontFamily;
    const sectionTitleStyle = useMemo(() => ({
        fontFamily: headingFontFamily,
        fontSize: isChildTheme ? 20 : 18,
        color: isChildTheme ? '#7090AC' : themeStyles.text,
        marginBottom: 8,
        fontWeight: isChildTheme ? '400' : '600',
    }), [headingFontFamily, isChildTheme, themeStyles.text]);
    const moodLabelTitleStyle = useMemo(() => ({
        fontFamily: headingFontFamily,
        fontSize: isChildTheme ? 20 : 18,
        color: isChildTheme ? '#7090AC' : themeStyles.text,
        fontWeight: isChildTheme ? '400' : '600',
    }), [headingFontFamily, isChildTheme, themeStyles.text]);
    const toolbarContainerStyle = useMemo(
        () => {
            if (isChildTheme) {
                return {
                    backgroundColor: '#FFF6E0',
                    borderRadius: isCyberpunkTheme ? 0 : 30,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: '#F3D5C1',
                    overflow: 'hidden',
                    width: '100%', // Ensure full width
                    minHeight: 50, // Ensure minimum height
                };
            }
            
            if (isCyberpunkTheme && themeStyles.toolbarStyle) {
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: '#FFFF00',
                    borderRadius: 0,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    minHeight: 50,
                    overflow: 'hidden',
                };
            }
            
            return {
                backgroundColor: themeStyles.surface,
                borderRadius: isCyberpunkTheme ? 0 : themeStyles.cardRadius,
                overflow: 'hidden',
                width: '100%', // Ensure full width
                minHeight: 50, // Ensure minimum height
            };
        },
        [isChildTheme, isCyberpunkTheme, themeStyles.surface, themeStyles.cardRadius, themeStyles.toolbarStyle]
    );

    // Cyberpunk toolbar item style
    const cyberpunkToolbarItemStyle = useMemo(
        () => {
            if (isCyberpunkTheme) {
                return {
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 44,
                    height: 44,
                    backgroundColor: 'transparent',
                };
            }
            return undefined;
        },
        [isCyberpunkTheme]
    );
    const heroContainerStyle = useMemo(
        () => [
            styles.heroContainer,
            isChildTheme && {
                backgroundColor: 'rgba(255, 243, 226, 0.8)',
            },
        ],
        [isChildTheme]
    );
    const insets = useSafeAreaInsets(); // Get safe area insets
    const editorRef = useRef(null); // Create ref for rich text editor
    // scrollViewRef removed - RichEditor now handles internal scrolling automatically
 
    // Process initial content: convert local file URI to WebView-accessible format
    const processContentForEditor = (html) => {
        if (!html) return '';

        return html.replace(/<img([^>]*?)>/gi, (match) => {
            const srcMatch = match.match(/src="([^"]*)"/i);
            const dataMatch = match.match(/data-file-uri="([^"]*)"/i);

            if (!srcMatch) {
                return match;
    }

            const originalSrc = srcMatch[1];
            const normalizedSrc = originalSrc.startsWith('file://')
                ? originalSrc
                : `file://${originalSrc.replace(/^file:\/\//, '')}`;

            let updated = match.replace(srcMatch[0], `src="${normalizedSrc}"`);

            if (!dataMatch) {
                const escaped = normalizedSrc.replace(/"/g, '&quot;');
                updated = updated.replace('<img', `<img data-file-uri="${escaped}"`);
            }

            return updated;
        });
    };
    
    // Load content: prioritize content, fallback to contentHTML for backward compatibility
    // If prompt is provided, use it as initial content
    const initialContent = useMemo(() => {
        if (existingDiary) {
            return existingDiary.content || existingDiary.contentHTML || '';
        }
        // If prompt is provided, use it as initial content
        if (promptParam) {
            return `<p>${promptParam}</p>`;
        }
        return intentDraft?.contentHtml || '';
    }, [existingDiary, intentDraft, promptParam]);

    // Extract title from content if title is integrated
    const initialTitleAndContent = useMemo(() => {
        if (!initialContent) {
            // For new entries, use existing diary title or intent draft title
            const existingTitle = existingDiary?.title || 
                (intentDraft?.text ? intentDraft.text.split('\n')[0].slice(0, 60) : '');
            return { title: existingTitle, content: '' };
        }
        // Try to extract title from content HTML
        const extracted = extractTitleFromContent(initialContent);
        // If no title found in content, use existing diary title
        if (!extracted.title && existingDiary?.title) {
            return { title: existingDiary.title, content: initialContent };
        }
        return extracted;
    }, [initialContent, existingDiary, intentDraft]);

    const processedInitialContent = useMemo(() => (
        initialTitleAndContent.content ? processContentForEditor(initialTitleAndContent.content) : ''
    ), [initialTitleAndContent.content]);

    // --- State ---
    // 1. 创建一个 state 来存储 Header 的实际高度
    const [headerHeight, setHeaderHeight] = useState(0);
    const [isEditMode, setIsEditMode] = useState(!!existingDiary);
    const [title, setTitle] = useState(
        initialTitleAndContent.title ||
            existingDiary?.title ||
            (intentDraft?.text ? intentDraft.text.split('\n')[0].slice(0, 60) : '')
    );

    const [contentHtml, setContentHtml] = useState(processedInitialContent);
    const initialContentRef = useRef(processedInitialContent);
    const hasRemappedInitialHtml = useRef(false);
    const [isSaving, setIsSaving] = useState(false); // Prevent duplicate saves
    const [isLoading, setIsLoading] = useState(true); // Track content loading state - Start with true to prevent premature rendering
    const [isEditorFocused, setIsEditorFocused] = useState(false); // Track editor focus state for UX enhancement
    const [selectedMood, setSelectedMood] = useState(
        existingDiary?.mood || intentDraft?.mood || null
    );
    const [weather, setWeather] = useState(existingDiary?.weather || null);
    const [isFetchingWeather, setIsFetchingWeather] = useState(false);
    const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
    // Removed companion picker modal - companion selection moved to settings
    const [emojiTarget, setEmojiTarget] = useState('content');
    const titleInputRef = useRef(null);
    const [titleSelection, setTitleSelection] = useState({ start: 0, end: 0 });
    const [allCompanions, setAllCompanions] = useState([]);
    // Removed manual companion selection - will auto-use primary companion or existing diary companions
    const [selectedCompanionIDs, setSelectedCompanionIDs] = useState(existingCompanionIds);
    // Track previous companions hash to detect changes
    const prevCompanionsHashRef = useRef('');
    const [selectedThemeId, setSelectedThemeId] = useState(
        existingDiary?.themeID ?? existingDiary?.themeId ?? null
    );
    const [selectedChapterId, setSelectedChapterId] = useState(
        existingDiary?.chapterId ?? chapterIdParam ?? null
    );
    // CRITICAL: Removed heroVisual state - will derive from live context data on every render
    const [hasInitialPrimaryApplied, setHasInitialPrimaryApplied] = useState(false);
    // CRITICAL: Use unified focus model - get primaryCompanionId from Zustand store
    const { primaryCompanionId } = useUserStateStore();
    // State for Focus Selection Modal
    const [isFocusModalVisible, setFocusModalVisible] = useState(false);
    
    // Keyboard height animation - drives absolute positioned Footer
    const keyboardHeight = useRef(new Animated.Value(0)).current;
    const [isKeyboardUp, setIsKeyboardUp] = useState(false);
    
    // JS Keyboard Driver - for layout properties (height, margin, padding) that don't support native driver
    const jsKeyboardDriver = useRef(new Animated.Value(0)).current;
    
    // Header animation interpolations - Create immersive editing experience
    // Visual animations (transform, opacity) - use keyboardHeight directly
    const headerScale = keyboardHeight.interpolate({
        inputRange: [0, 300], // Keyboard typically around 300px high
        outputRange: [1, 0.6], // Scale down to 60% when keyboard is up
        extrapolate: 'clamp',
    });
    
    const headerOpacity = keyboardHeight.interpolate({
        inputRange: [0, 300],
        outputRange: [1, 0.5], // Fade to 50% opacity for focus mode
        extrapolate: 'clamp',
    });
    
    // Layout animations (height, margin, padding) - use jsKeyboardDriver (0-1 range)
    const headerContainerHeight = jsKeyboardDriver.interpolate({
        inputRange: [0, 1],
        outputRange: [250, 100], // Shrink from ~250px to 100px
        extrapolate: 'clamp',
    });
    
    const headerContainerMarginBottom = jsKeyboardDriver.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 5], // Tighten bottom spacing from 20 to 5
        extrapolate: 'clamp',
    });
    
    const headerPaddingVertical = jsKeyboardDriver.interpolate({
        inputRange: [0, 1],
        outputRange: [24, 8], // Reduce padding from 24 to 8
        extrapolate: 'clamp',
    });
    
    // MoodSelector compression animation - optional space optimization
    const moodSelectorScale = jsKeyboardDriver.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.85], // Slight scale down to 85%
        extrapolate: 'clamp',
    });
    
    const moodSelectorMarginBottom = jsKeyboardDriver.interpolate({
        inputRange: [0, 1],
        outputRange: [25, 10], // Reduce bottom margin from 25 to 10
        extrapolate: 'clamp',
    });
    
    // Focus Mode: Background overlay opacity for immersive editing
    const backgroundOverlayOpacity = keyboardHeight.interpolate({
        inputRange: [0, 300],
        outputRange: [0, 0.05], // Subtle darkening (5% opacity)
        extrapolate: 'clamp',
    });
    
    // Editor shadow elevation for focus mode
    const editorShadowOpacity = keyboardHeight.interpolate({
        inputRange: [0, 300],
        outputRange: [0, 0.15], // Subtle shadow when keyboard is up
        extrapolate: 'clamp',
    });
    
    // Editor elevation for Android shadow (focus mode)
    const editorElevation = keyboardHeight.interpolate({
        inputRange: [0, 300], // When keyboard pops up
        outputRange: [0, 8], // Increase elevation from 0 to 8
        extrapolate: 'clamp',
    });
    
    // Cursor position tracking - RichEditor now handles internal scrolling automatically
    // The WebView inside RichEditor will automatically scroll to keep cursor visible
    const handleCursorPosition = useCallback((scrollY) => {
        // RichEditor's internal WebView handles scrolling automatically
        // This callback is kept for potential future enhancements
        if (scrollY !== undefined && scrollY !== null) {
            console.log('[AddEditDiaryScreen] Cursor position:', scrollY);
        }
    }, []);
    
    // Handle focus selection - the store update will trigger automatic re-render
    const handleFocusSelected = (selectedId: string) => {
        // Close the modal
        setFocusModalVisible(false);
        // IMPORTANT: Because `primaryCompanionId` comes from `useUserStateStore()` hook,
        // and `KeyPeopleList` has ALREADY updated the store via `setPrimaryCompanionId(id)`,
        // this component will AUTOMATICALLY re-render with the new data when the modal closes.
        // We don't need to force a refresh manually. The hook system does it for us.
        console.log('[AddEditDiaryScreen] Focus selected:', selectedId);
    };

    // THIS IS THE NEW, INTELLIGENT RENDERER
    const getActiveFocusComponent = () => {
        // Case 1: The Active Focus is the WhisperLine Assistant
        if (primaryCompanionId === WHISPERLINE_ASSISTANT_ID) {
            // Use theme's current avatar (Lottie or custom image)
            if (currentAvatar?.type === 'custom' && currentAvatar.image) {
                try {
                    const heroVisualSource = resolveImageSource(currentAvatar.image);
                    return (
                        <CompanionAvatarView 
                            size={150} 
                            visual={{ 
                                type: 'image', 
                                source: heroVisualSource 
                            }} 
                        />
                    );
                } catch (error) {
                    console.error('[AddEditDiaryScreen] Error resolving theme custom avatar:', error);
                }
            } else if (currentAvatar?.type === 'system' && currentAvatar.source) {
                return (
                    <CompanionAvatarView 
                        size={150} 
                        visual={{ 
                            type: 'lottie', 
                            source: currentAvatar.source 
                        }} 
                    />
                );
            }
            // Fallback to default hero image
            return (
                <CompanionAvatarView 
                    size={150} 
                    visual={{ type: 'image', source: DEFAULT_HERO_IMAGE }} 
                />
            );
        }

        // Get companion from userState
        const companion = userState?.companions?.[primaryCompanionId];

        // If for some reason the companion isn't found, provide a safe fallback
        if (!companion) {
            return (
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.placeholderInitial}>?</Text>
                </View>
            );
        }

        // Case 2: The Active Focus is a Companion WITH a custom avatar
        const avatarSource = companion.avatar?.source || companion.avatarUri;
        
        // Check for Lottie avatar first
        if (companion.avatar?.type === 'lottie' && companion.avatar?.source) {
            // Lottie avatar
            return (
                <CompanionAvatarView 
                    size={150} 
                    visual={{ 
                        type: 'lottie', 
                        source: companion.avatar.source 
                    }} 
                />
            );
        }
        
        // Check for image avatar (either with type='image' or legacy avatarUri)
        if (avatarSource && (companion.avatar?.type === 'image' || companion.avatarUri)) {
            // Validate that the path is NOT a temporary ImagePicker cache path
            // Note: This check is for legacy data. New images are automatically copied to permanent storage.
            if (avatarSource.includes('Caches/ImagePicker')) {
                console.warn('[AddEditDiaryScreen] Found temporary ImagePicker cache path. This should not happen with new images.');
                // Fall through to placeholder for legacy temporary paths
            } else {
                try {
                    const heroVisualSource = resolveImageSource(avatarSource);
                    return (
                        <CompanionAvatarView 
                            size={150} 
                            visual={{ 
                                type: 'image', 
                                source: heroVisualSource 
                            }} 
                        />
                    );
                } catch (error) {
                    console.error('[AddEditDiaryScreen] Error resolving companion image:', error);
                    // Fall through to placeholder
                }
            }
        }

        // Case 3: The Active Focus is a Companion WITHOUT a custom avatar
        // Display the first character of their name as an initial
        return (
            <View style={styles.avatarPlaceholder}>
                <Text style={styles.placeholderInitial}>
                    {companion.name.charAt(0).toUpperCase()}
                </Text>
            </View>
        );
    };
    const processedInitialPlainText = useMemo(
        () => extractTextFromHTML(processedInitialContent || ''),
        [processedInitialContent]
    );
    const plainTextContent = useMemo(() => extractTextFromHTML(contentHtml), [contentHtml]);
    const deriveTitleFromText = useCallback((text = '') => {
        if (!text) {
            return '';
        }
        const firstLine = text
            .split(/\n+/)
            .map((line) => line.trim())
            .find((line) => line.length > 0);
        return firstLine ? firstLine.slice(0, 60) : '';
    }, []);
    
    // Extract title from content HTML if integrated, otherwise use title state
    const effectiveTitle = useMemo(() => {
        // Try to extract title from content HTML first (for all templates)
        const extracted = extractTitleFromContent(contentHtml);
        if (extracted.title) {
            return extracted.title;
        }
        // Fallback: derive title from plain text content for all themes
        return deriveTitleFromText(plainTextContent) || title.trim() || '';
    }, [contentHtml, deriveTitleFromText, plainTextContent, title]);

    const resolveImageSource = useCallback((identifier) => {
        if (!identifier) {
            return DEFAULT_HERO_IMAGE;
        }
        if (typeof identifier === 'object' && (identifier.uri || Number.isInteger(identifier))) {
            return identifier;
        }
        if (typeof identifier === 'number') {
            return identifier;
        }
        return { uri: identifier };
    }, []);

    // CRITICAL: Removed applyDefaultHero - visual is now derived on every render from live context

    const baselineSnapshot = useMemo(() => {
        // Extract title from content for all themes
        const extractedTitle = initialTitleAndContent.title || 
            (existingDiary ? extractTitleFromContent(existingDiary.content || existingDiary.contentHTML || '').title : '') ||
            deriveTitleFromText(processedInitialPlainText) ||
            (existingDiary?.title || '').trim();
        
        return JSON.stringify({
            title: extractedTitle,
        content: processedInitialContent || '',
        mood: existingDiary?.mood || null,
        weather: normalizeWeather(existingDiary?.weather),
        companionIDs: existingCompanionIds,
        themeID: existingDiary?.themeID ?? existingDiary?.themeId ?? null,
        });
    }, [
        deriveTitleFromText,
        existingDiary,
        existingCompanionIds,
        initialTitleAndContent.title,
        processedInitialContent,
        processedInitialPlainText,
    ]);

    const [initialSnapshot, setInitialSnapshot] = useState(baselineSnapshot);

    useEffect(() => {
        setInitialSnapshot(baselineSnapshot);
    }, [baselineSnapshot]);
    
    const currentSnapshot = useMemo(() => JSON.stringify({
        title: effectiveTitle,
        content: contentHtml || '',
        mood: selectedMood || null,
        weather: normalizeWeather(weather),
        companionIDs: selectedCompanionIDs,
        themeID: selectedThemeId ?? null,
    }), [contentHtml, effectiveTitle, selectedMood, selectedCompanionIDs, selectedThemeId, weather]);

    const hasUnsavedChanges = currentSnapshot !== initialSnapshot;
    const [preventRemove, setPreventRemove] = useState(false);
    const canSubmit = useMemo(() => {
        const hasContent = plainTextContent.trim().length > 0;
        if (!selectedMood || !hasContent) {
            return false;
        }
        // All themes now integrate title into content, so we don't require separate title input
        // Title will be extracted from content or auto-generated
        return true;
    }, [isChildTheme, isCyberpunkTheme, plainTextContent, selectedMood, title]);
    const saveEnabled = canSubmit && hasUnsavedChanges;

    useEffect(() => {
        setIsEditMode(!!existingDiary);
        setTitle(existingDiary?.title || '');
        setSelectedMood(existingDiary?.mood || null);
        setWeather(existingDiary?.weather || null);
        setSelectedCompanionIDs(existingCompanionIds);
    }, [existingDiary, existingCompanionIds]);

    // Keyboard listener - Update keyboardHeight animation value
    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (event) => {
                const kbHeight = event.endCoordinates.height;
                console.log('[AddEditDiaryScreen] Keyboard shown, height:', kbHeight);
                setIsKeyboardUp(true);
                
                const animationDuration = event.duration || 250;
                
                // Animate both drivers simultaneously
                Animated.parallel([
                    Animated.timing(keyboardHeight, {
                        toValue: kbHeight,
                        duration: animationDuration,
                        useNativeDriver: false, // bottom property doesn't support native driver
                    }),
                    Animated.timing(jsKeyboardDriver, {
                        toValue: 1, // Drive layout animations to 1 (fully contracted)
                        duration: animationDuration,
                        useNativeDriver: false, // Layout properties don't support native driver
                    }),
                ]).start();
            }
        );

        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (event) => {
                console.log('[AddEditDiaryScreen] Keyboard hidden');
                setIsKeyboardUp(false);
                
                const animationDuration = event.duration || 250;
                
                // Reset both drivers simultaneously
                Animated.parallel([
                    Animated.timing(keyboardHeight, {
                        toValue: 0,
                        duration: animationDuration,
                        useNativeDriver: false,
                    }),
                    Animated.timing(jsKeyboardDriver, {
                        toValue: 0, // Reset layout animations to 0 (fully expanded)
                        duration: animationDuration,
                        useNativeDriver: false,
                    }),
                ]).start();
            }
        );

        return () => {
            keyboardWillShowListener.remove();
            keyboardWillHideListener.remove();
        };
    }, [keyboardHeight, jsKeyboardDriver]);


    useEffect(() => {
        if (existingDiary && existingCompanionIds.length && !hasInitialPrimaryApplied) {
            setHasInitialPrimaryApplied(true);
        }
    }, [existingDiary, existingCompanionIds, hasInitialPrimaryApplied]);

    useEffect(() => {
        if (existingDiary) {
            setSelectedThemeId(existingDiary.themeID ?? existingDiary.themeId ?? null);
        }
    }, [existingDiary]);

    // Merge companions from both sources: CompanionContext (legacy) and userState.companions (new)
    useEffect(() => {
        const legacyCompanions = companionContext?.companions || [];
        const userCreatedCompanions = Object.values(userStateContext?.userState?.companions || {});
        // Convert userState companions to format compatible with existing code
        const formattedUserCompanions = userCreatedCompanions.map(comp => ({
            id: comp.id,
            name: comp.name,
            avatarIdentifier: comp.avatarUri || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }));
        // Merge both sources, prioritizing user-created companions
        const merged = [...formattedUserCompanions];
        legacyCompanions.forEach(legacy => {
            if (!merged.find(c => String(c.id) === String(legacy.id))) {
                merged.push(legacy);
        }
        });
        setAllCompanions(merged);
    }, [companionContext?.companions, userStateContext?.userState?.companions]);

    // CRITICAL: Removed heroVisual useEffect - visual is now derived on every render from live context

    // Load and restore HTML images for display
    useEffect(() => {
        const loadAndRestoreContent = async () => {
            if (!processedInitialContent) {
                setContentHtml('');
                initialContentRef.current = '';
                hasRemappedInitialHtml.current = false;
                setIsLoading(false); // CRITICAL: Set loading to false when no content to load
                return;
            }

            setIsLoading(true); // 显示加载指示器
            
            // ！！！关键修复：await 异步的还原过程！！！
            const restoredContent = await MediaService.restoreHtmlImagesForDisplay(processedInitialContent);
            
            setContentHtml(restoredContent); // 现在设置的是包含所有图片数据的完整 HTML
            initialContentRef.current = restoredContent;
            hasRemappedInitialHtml.current = false;
            
            setIsLoading(false); // 隐藏加载指示器
        };
        
        loadAndRestoreContent();
    }, [processedInitialContent, existingDiary?.id]); // 添加 existingDiary?.id 确保当日记数据加载时能正确触发

    // Note: ScrollView removed - RichEditor now handles internal scrolling automatically
    // No need to scroll to top on mount/focus since RichEditor manages its own scroll position

    useEffect(() => {
        isMountedRef.current = true;
        (async () => {
            await ensureStaticServer();
            if (!isMountedRef.current) return;

            if (!hasRemappedInitialHtml.current && initialContentRef.current) {
                const remapped = await remapHtmlImageSourcesToServer(initialContentRef.current);
                if (!isMountedRef.current) return;
                hasRemappedInitialHtml.current = true;
                setContentHtml((prev) => {
                    if (!prev) return remapped;
                    if (prev === initialContentRef.current) {
                        return remapped;
                    }
                    return prev;
                });
            }
        })();

        return () => {
            isMountedRef.current = false;
        };
    }, [processedInitialContent]);

    // --- Image insertion logic (Base64-free storage with MediaService) ---
    const handleInsertImage = async () => {
        try {
            await ensureStaticServer();

            // 1. Request permission to access photos
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Permission Required', 'Photo access is needed to insert images.');
                return;
            }

            // 2. Open the picker (no Base64 for performance)
            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
                base64: false,
                allowsMultipleSelection: true,
                selectionLimit: 0,
                exif: false,
            });

            const assets = pickerResult.assets || [];

            if (pickerResult.canceled || !assets.length) {
                return;
            }

            // 3. Process each selected image
            for (const asset of assets) {
                const sourceUri = asset?.uri;
                if (!sourceUri) {
                    continue;
                }

                let workingUri = sourceUri;
                let extension = (asset?.fileName || sourceUri).split('.').pop()?.split('?')[0] || 'jpg';

                // Convert HEIC/HEIF to JPEG if needed
                if (extension.toLowerCase() === 'heic' || extension.toLowerCase() === 'heif') {
                    try {
                        console.log('[handleInsertImage] Converting HEIC/HEIF to JPEG');
                        const manipulated = await ImageManipulator.manipulateAsync(
                            sourceUri,
                            [],
                            { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
                        );
                        workingUri = manipulated.uri;
                        extension = 'jpg';
                    } catch (conversionError) {
                        console.warn('[handleInsertImage] HEIC conversion failed, using original file', conversionError);
                        extension = 'jpg';
                    }
                }

                // 4. Save image to document directory using MediaService
                const filename = await MediaService.moveImageToDocumentDirectory(workingUri);
                console.log('[handleInsertImage] Image saved to document directory:', filename);

                // 5. Read file as Base64 for WebView display
                const base64DataUri = await MediaService.readImageAsBase64(filename);
                if (!base64DataUri) {
                    console.error('[handleInsertImage] Failed to read image as Base64:', filename);
                    continue;
                }

                // 6. Insert image into editor with Base64 (for display) and filename (for storage)
                if (editorRef.current) {
                    const style = 'max-width:100%; height:auto; display:block; margin:12px 0; border-radius:8px;';
                    // Insert with Base64 for immediate display
                    editorRef.current.insertImage(base64DataUri, style);

                    // Set data-filename attribute for storage reference
                    const escapedFilename = filename.replace(/"/g, '&quot;');
                    editorRef.current.commandDOM(`
                        (function() {
                            const register = window.whisperDiary && window.whisperDiary.bindImage;
                            const images = document.querySelectorAll('img');
                            const target = images[images.length - 1];
                            if (!target) { return; }
                            // Store filename in data-filename attribute for storage processing
                            target.setAttribute('data-filename', '${escapedFilename}');
                            target.style.maxWidth = '100%';
                            target.style.height = 'auto';
                            target.style.display = 'block';
                            target.style.margin = '12px 0';
                            target.style.borderRadius = '0px'; // Cyberpunk: square corners
                            if (register) { register(target); }
                            const scrollToBottom = () => {
                                const editorEl = document.querySelector('.pell-content');
                                if (editorEl) {
                                    editorEl.scrollTop = editorEl.scrollHeight;
                                }
                                window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
                            };
                            setTimeout(scrollToBottom, 50);
                            setTimeout(scrollToBottom, 200);
                            setTimeout(scrollToBottom, 400);
                        })();
                    `);
                    
                    // Ensure editor focus
                    const ensureEditorFocus = () => {
                        if (editorRef.current?.focusContentEditor) {
                            editorRef.current.focusContentEditor();
                        }
                    };
                    ensureEditorFocus();
                    const t1 = setTimeout(ensureEditorFocus, 180);
                    const t2 = setTimeout(() => {
                        ensureEditorFocus();
                        // RichEditor now handles internal scrolling automatically
                    }, 360);
                    const t3 = setTimeout(() => {
                        ensureEditorFocus();
                        // RichEditor now handles internal scrolling automatically
                    }, 600);
                    const t4 = setTimeout(() => {
                        ensureEditorFocus();
                        // RichEditor now handles internal scrolling automatically
                    }, 900);
                    setTimeout(() => {
                        clearTimeout(t1);
                        clearTimeout(t2);
                        clearTimeout(t3);
                        clearTimeout(t4);
                    }, 1200);
                }
            }
        } catch (error) {
            console.error('[handleInsertImage] Error:', error);
            Alert.alert('Error', error?.message || 'Failed to insert image. Please try again.');
        }
    };

    const handleInsertEmoji = () => {
        setEmojiPickerVisible(true);
    };

    const handleSelectEmoji = (emoji) => {
        setEmojiPickerVisible(false);
        if (emojiTarget === 'title') {
            setTitle((currentTitle) => {
                const { start, end } = titleSelection;
                const nextTitle = `${currentTitle.slice(0, start)}${emoji}${currentTitle.slice(end)}`;
                const cursor = start + emoji.length;
                requestAnimationFrame(() => {
                    titleInputRef.current?.focus();
                    setTitleSelection({ start: cursor, end: cursor });
                });
                return nextTitle;
            });
            return;
        }
        requestAnimationFrame(() => {
            if (editorRef.current?.focusContentEditor) {
                editorRef.current.focusContentEditor();
            }
            editorRef.current?.insertText(emoji);
        });
    };

    const handleCloseEmojiPicker = () => {
        setEmojiPickerVisible(false);
        setEmojiTarget('content');
    };

    const removeImageByIdentifier = useCallback((payload) => {
        if (!payload) {
            return;
        }
        const fileUri = typeof payload === 'object' ? payload.fileUri : payload;
        const srcUri = typeof payload === 'object' ? payload.src : '';
        const identifierFile = JSON.stringify(fileUri || '');
        const identifierSrc = JSON.stringify(srcUri || '');
        editorRef.current?.commandDOM(`
            (function() {
                const targetFile = ${identifierFile};
                const targetSrc = ${identifierSrc};
                const images = document.querySelectorAll('img');
                for (let i = 0; i < images.length; i += 1) {
                    const img = images[i];
                    const dataUri = img.getAttribute('data-file-uri') || '';
                    const srcAttr = img.getAttribute('src') || '';
                    if ((targetFile && dataUri === targetFile) || (targetSrc && srcAttr === targetSrc)) {
                        img.remove();
                        break;
                    }
                }
            })();
        `);
        setTimeout(() => {
            if (editorRef.current?.focusContentEditor) {
                editorRef.current.focusContentEditor();
            }
            // RichEditor now handles internal scrolling automatically
        }, 100);
    }, []);

    const handleEditorMessage = useCallback((event) => {
        try {
            const raw = event?.nativeEvent?.data;
            if (!raw) return;
            const parsed = JSON.parse(raw);
            
            // Handle cursor position tracking for automatic scroll
            if (parsed?.type === 'cursor-position') {
                const scrollY = parsed.scrollY;
                if (scrollY !== undefined && scrollY !== null) {
                    handleCursorPosition(scrollY);
                }
                return;
            }
            
            // Handle image tap
            if (parsed?.type === 'image-tap') {
                const payload = {
                    fileUri: parsed.fileUri || '',
                    src: parsed.src || '',
                };
                Alert.alert(
                    'Remove image?',
                    'This will delete the image from your entry.',
                    [
                        { text: 'Keep', style: 'cancel' },
                        {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => removeImageByIdentifier(payload),
                        },
                    ]
                );
            }
        } catch (err) {
            console.warn('handleEditorMessage parse error', err);
        }
    }, [removeImageByIdentifier, handleCursorPosition]);

    // --- Save logic ---
    const handleSave = useCallback(async () => {
        // Prevent duplicate saves
        if (isSaving) {
            console.log('handleSave: Already saving, ignoring duplicate call');
            return;
        }

        try {
            // Haptic Feedback: Provide subtle vibration when saving
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (error) {
                // Haptics may not be available on all devices, ignore errors
                console.log('Haptics not available:', error);
            }
            
            setIsSaving(true);
            console.log('handleSave called', {
                canSubmit,
                hasUnsavedChanges,
                selectedMood,
                hasContent: plainTextContent.trim().length > 0,
                title: title.trim(),
                isChildTheme,
                isCyberpunkTheme,
            });

            if (!canSubmit) {
                const missingContent = plainTextContent.trim().length === 0;
                let message = 'Please select a mood and add your entry.';
                if (missingContent) {
                    message = 'Please select a mood and write your entry.';
                }
                Alert.alert('Incomplete Entry', message);
                setIsSaving(false);
                return;
            }

            // Process HTML for storage: Replace Base64 images with file references
            // This ensures database stores lightweight references instead of large Base64 strings
            let contentToSave = MediaService.replaceHtmlImagesForStorage(contentHtml);
            
            console.log('[handleSave] Processed HTML for storage:', {
                originalLength: contentHtml.length,
                processedLength: contentToSave.length,
                reduction: contentHtml.length - contentToSave.length,
            });
            
            // --- USE UNIFIED saveDiary FUNCTION ---
            // The saveDiary function intelligently handles create vs update internally
            // Extract mood string if it's an object
            const moodString = selectedMood && typeof selectedMood === 'object' 
                ? selectedMood.name 
                : selectedMood;
            
            // Handle date parameter: if provided, use it to set createdAt
            // entryDateParam should be in YYYY-MM-DD format
            let createdAtOverride = undefined;
            if (!isEditMode && entryDateParam) {
                try {
                    // Parse the date string (YYYY-MM-DD) and set time to noon to avoid timezone issues
                    const dateParts = entryDateParam.split('-');
                    if (dateParts.length === 3) {
                        const year = parseInt(dateParts[0], 10);
                        const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
                        const day = parseInt(dateParts[2], 10);
                        // Create date at noon local time to avoid timezone conversion issues
                        const date = new Date(year, month, day, 12, 0, 0, 0);
                        createdAtOverride = date.toISOString();
                    } else {
                        // Fallback: try parsing as-is
                        createdAtOverride = new Date(entryDateParam).toISOString();
                    }
                } catch (error) {
                    console.warn('Failed to parse entryDateParam:', entryDateParam, error);
                    // Fallback to current time if parsing fails
                    createdAtOverride = undefined;
                }
            }
            
            // Use the unified saveDiary function
            // It will automatically determine create vs update based on entryId
            const savedEntry = await saveDiary({
                entryId: isEditMode ? existingDiary.id : undefined,
                htmlContent: contentToSave, // Content from editor (saveDiary handles title integration)
                selectedMood: moodString,
                weather: weather,
                companionIDs: selectedCompanionIDs,
                themeID: selectedThemeId ?? null,
                chapterId: selectedChapterId ?? null,
                createdAt: isEditMode ? existingDiary.createdAt : createdAtOverride,
            });
            
            console.log(isEditMode ? 'Diary entry updated successfully' : 'Diary entry created:', savedEntry?.id);
            
            // Handle theme assignment
            if (savedEntry?.id) {
                await themeAnalysisService.assignEntryToTheme(
                    savedEntry.id,
                    selectedThemeId ?? null,
                    savedEntry
                );
            }
            // Update state before navigation to prevent usePreventRemove from triggering
            setInitialSnapshot(currentSnapshot);
            setPreventRemove(false);
            console.log('Save completed, navigating back');
            // Use setTimeout to ensure state updates are processed before navigation
            setTimeout(() => {
            router.back(); // Return directly after saving
            }, 0);
        } catch (error) {
            console.error('Error saving diary:', error);
            Alert.alert('Error', `Failed to save diary: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    }, [
        addDiary,
        canSubmit,
        contentHtml,
        currentSnapshot,
        effectiveTitle,
        entryDateParam,
        existingDiary,
        isChildTheme,
        isCyberpunkTheme,
        isEditMode,
        isSaving,
        plainTextContent,
        router,
        selectedCompanionIDs,
        selectedMood,
        selectedThemeId,
        title,
        updateDiary,
        weather,
    ]);

    // --- Weather logic ---
    const handleGetWeather = useCallback(async () => {
        setIsFetchingWeather(true);
        try {
            console.log('Fetching weather and location...');
            const weatherData = await getCurrentWeather();
            if (weatherData) {
                console.log('Weather data received:', weatherData);
                setWeather(weatherData);
            }
        } catch (error) {
            console.error('Error fetching weather:', error);
            // Don't show alert here, fail silently as weather is optional
        } finally {
            setIsFetchingWeather(false);
        }
    }, []);

    // --- Mood selection handler with auto weather fetch ---
    const handleMoodSelect = useCallback(async (mood) => {
        // Haptic Feedback: Provide subtle vibration for better UX
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
            // Haptics may not be available on all devices, ignore errors
            console.log('Haptics not available:', error);
        }
        
        // Set the selected mood
        setSelectedMood(mood);
        
        // Automatically fetch weather and location when mood is selected
        // Weather is considered essential for diary entries
        // Only fetch if not already fetching to avoid duplicate requests
        if (!isFetchingWeather) {
            await handleGetWeather();
        }
    }, [isFetchingWeather, handleGetWeather]);

    // Clean up selectedCompanionIDs to ensure they reference valid companions
    const companionLookup = useMemo(() => {
        const map = new Map();
        allCompanions.forEach((companion) => {
            map.set(String(companion.id), companion);
        });
        return map;
    }, [allCompanions]);

    useEffect(() => {
        setSelectedCompanionIDs((prev) => prev.filter((id) => companionLookup.has(id)));
    }, [companionLookup]);

    // Initialize companion IDs: use existing diary companions in edit mode, or primary companion for new entries
    useEffect(() => {
        if (companionsLoading) {
            console.log('[InitializeCompanions] Waiting for companions to load...');
            return;
        }

        if (isEditMode) {
            console.log('[InitializeCompanions] Edit mode detected, existingCompanionIds:', existingCompanionIds);
            console.log('[InitializeCompanions] allCompanions loaded, count:', allCompanions.length);
            
            // In edit mode, use existing diary companions
            setSelectedCompanionIDs(existingCompanionIds);
            
            // CRITICAL: Ensure heroVisual is updated after companions are set
            // The heroVisual useEffect will handle the actual rendering, but we need to ensure
            // selectedCompanionIDs is set before it runs
            console.log('[InitializeCompanions] Set selectedCompanionIDs to:', existingCompanionIds);
            
            // Don't apply default hero here - let the companion useEffect handle it
            // If companions exist, they will be prioritized; if not, theme visual will be applied
            setHasInitialPrimaryApplied(true);
            return;
        }

        // CRITICAL: Detect if companions have changed to allow re-initialization
        // Create a hash of companion IDs and avatar URIs to detect changes
        const companionsHash = JSON.stringify(
            Object.values(userState?.companions || {}).map(c => ({
                id: c.id,
                avatarUri: c.avatarUri
            }))
        );
        
        // If companions haven't changed and we've already applied, skip re-initialization
        // BUT: Always allow re-initialization if companions have changed (avatar updated)
        const companionsChanged = prevCompanionsHashRef.current !== companionsHash;
        
        if (hasInitialPrimaryApplied && !companionsChanged) {
            return;
        }
        
        // Update the ref with current companions hash
        prevCompanionsHashRef.current = companionsHash;
        
        // Reset hasInitialPrimaryApplied if companions changed (to allow re-initialization)
        if (companionsChanged && hasInitialPrimaryApplied) {
            setHasInitialPrimaryApplied(false);
        }

        // CRITICAL: Unified Active Focus Model
        // primaryCompanionId is now managed by Zustand store (useUserStateStore)
        // No need for manual initialization - it's always available and reactive
        
        // For new entries: Use Active Focus (primaryCompanionId from store)
        // For edit mode: Use existing companions from diary, but visual still uses Active Focus
        if (!isEditMode && primaryCompanionId && userState?.companions?.[primaryCompanionId]) {
            // Set the Active Focus companion as selected for new entries
            setSelectedCompanionIDs([primaryCompanionId]);
            console.log('[AddEditDiaryScreen] ✅ Using Active Focus for new entry:', primaryCompanionId);
        }
        
        setHasInitialPrimaryApplied(true);

        return () => {
            isMountedRef.current = false;
        };
    }, [
        allCompanions,
        companionsLoading,
        existingCompanionIds,
        hasInitialPrimaryApplied,
        isEditMode,
        userState?.companions, // CRITICAL: Re-initialize when companions are updated in settings
    ]);

    useLayoutEffect(() => {
        const headerTitle = isChildTheme || isCyberpunkTheme ? '' : (isEditMode ? 'Edit Entry' : 'New Entry');

        // --- UNIFIED: Always show back button for all themes ---
        const renderHeaderLeft = () => {
            const backButtonColor = isCyberpunkTheme 
                ? '#39FF14' 
                : (isChildTheme ? '#7090AC' : (themeContext?.colors?.text || themeStyles.text));
            return (
            <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.childHeaderBack}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                    <Ionicons 
                        name="chevron-back" 
                        size={20} 
                        color={backButtonColor} 
                    />
            </TouchableOpacity>
        );
        };

        navigation.setOptions({
            headerBackTitleVisible: false,
            headerTitle,
            headerTransparent: isChildTheme,
            headerTintColor: isChildTheme ? '#7090AC' : (isCyberpunkTheme ? '#39FF14' : (themeContext?.colors?.text || themeStyles.text)),
            headerStyle: isChildTheme
                ? {
                    backgroundColor: 'transparent',
                    borderBottomWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                }
                : isCyberpunkTheme
                    ? {
                        backgroundColor: '#0A0A1A',
                        borderBottomWidth: 0,
                        elevation: 0,
                        shadowOpacity: 0,
                    }
                    : undefined,
            headerTitleStyle: isChildTheme
                ? {
                    fontFamily: headingFontFamily,
                    fontSize: 24,
                    color: '#7090AC',
                }
                : undefined,
            // --- CRITICAL FIX: Always show back button, not just for specific themes ---
            headerLeft: renderHeaderLeft,
            // Ensure header is always visible
            headerShown: true,
            headerRight: () => (
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={!saveEnabled || isSaving}
                    style={[
                        styles.headerSaveButton,
                        isChildTheme && {
                            backgroundColor: '#FFF6E4',
                            borderRadius: isCyberpunkTheme ? 0 : 30, // Cyberpunk: square corners
                            paddingHorizontal: 22,
                            paddingVertical: 6,
                            borderWidth: 1,
                            borderColor: '#E8CDAF',
                            opacity: (saveEnabled && !isSaving) ? 1 : 0.55,
                        },
                    ]}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text
                        style={[
                            styles.headerSaveText,
                            isChildTheme
                                ? {
                                    fontFamily: headingFontFamily,
                                    fontSize: 18,
                                    color: '#7090AC',
                                }
                                : {
                                    color: themeStyles.primary,
                                    opacity: (saveEnabled && !isSaving) ? 1 : 0.4,
                                },
                        ]}
                    >
                        {isSaving ? 'Saving...' : (isEditMode ? 'Save' : 'Done')}
                    </Text>
                </TouchableOpacity>
            ),
        });
    }, [
        navigation,
        isEditMode,
        handleSave,
        themeStyles.primary,
        saveEnabled,
        isChildTheme,
        isCyberpunkTheme,
        headingFontFamily,
        canSubmit,
        hasUnsavedChanges,
    ]);

    useEffect(() => {
        setPreventRemove(hasUnsavedChanges);
    }, [hasUnsavedChanges]);

    usePreventRemove(preventRemove, (event) => {
        if (!hasUnsavedChanges) {
            return;
        }

        if (typeof event?.preventDefault === 'function') {
            event.preventDefault();
        }

        Alert.alert(
            'Discard changes?',
            'You have unsaved edits. Are you sure you want to leave this entry?',
            [
                { text: 'Keep Writing', style: 'cancel' },
                {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => {
                        setPreventRemove(false);
                        const action = event?.data?.action;
                        if (action) {
                            navigation.dispatch(action);
                        }
                    },
                },
            ]
        );
    });

    // 2. 创建一个函数来处理 onLayout 事件
    const handleHeaderLayout = useCallback((event) => {
        const { height } = event.nativeEvent.layout;
        // 只有在高度值有效时才更新，防止不必要的重渲染
        if (height > 0 && height !== headerHeight) {
            console.log('[AddEditDiaryScreen] Header height measured:', height);
            setHeaderHeight(height);
        }
    }, [headerHeight]);

    // Note: keyboardVerticalOffset removed - no longer using KeyboardAvoidingView
    // Dynamic paddingBottom in Animated.ScrollView handles keyboard avoidance

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: themeStyles.background }}>
            {/* 1. Header - Animated for immersive editing experience with layout contraction */}
            <Animated.View
                style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: headerContainerHeight, // Physical height contraction
                    paddingVertical: headerPaddingVertical,
                    marginBottom: headerContainerMarginBottom, // Tightened spacing
                    transform: [{ scale: headerScale }], // Visual scale
                    opacity: headerOpacity, // Visual opacity
                    overflow: 'hidden', // Ensure content doesn't overflow when height shrinks
                }}
                onLayout={handleHeaderLayout}
            >
                <Pressable
                    onPress={() => setFocusModalVisible(true)}
                    style={heroContainerStyle}
                >
                    <Animated.View 
                        style={{ 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            transform: [{ scale: headerScale }],
                        }}
                    >
                        {getActiveFocusComponent()}
                    </Animated.View>
                </Pressable>
            </Animated.View>

            {/* Focus Mode: Subtle background overlay when keyboard is up */}
            <Animated.View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#000000',
                    opacity: backgroundOverlayOpacity,
                    pointerEvents: 'none', // Don't block touches
                    zIndex: 0,
                }}
            />

            {/* 2. Animated.ScrollView - Dynamic paddingBottom ensures content is always scrollable */}
            <Animated.ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={true}
                scrollEnabled={true}
                bounces={true}
            >
                {/* Content wrapper with dynamic paddingBottom */}
                <Animated.View
                    style={{
                        // ！！！关键修复：动态底部内边距 = 键盘高度 + 工具栏高度 + 缓冲空间
                        paddingBottom: Animated.add(keyboardHeight, 150),
                    }}
                >
                    {/* 1. MoodSelector - Now inside ScrollView for unified scrolling */}
                    <Animated.View
                        style={{
                            transform: [{ scale: moodSelectorScale }],
                            marginBottom: moodSelectorMarginBottom,
                        }}
                    >
                        <MoodSelector
                            onSelectMood={handleMoodSelect}
                            selectedMood={selectedMood}
                            titleStyle={moodLabelTitleStyle}
                            hideMoodLabels={isChildTheme}
                            hideTitle={isChildTheme || isCyberpunkTheme}
                            moodLabelStyle={{ fontFamily: bodyFontFamily }}
                            containerStyle={isChildTheme ? { marginBottom: 0 } : null}
                        />
                    </Animated.View>
                    
                    {/* Chapter Selector */}
                    <ChapterSelector
                        selectedChapterId={selectedChapterId}
                        onSelectChapter={setSelectedChapterId}
                        themeStyles={themeStyles}
                        headingFontFamily={headingFontFamily}
                    />
                    
                    {/* 2. RichEditor - Scrollable content */}
                    <Animated.View
                        style={{
                            paddingHorizontal: 16,
                            shadowColor: '#000000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowRadius: 8,
                            shadowOpacity: editorShadowOpacity,
                            elevation: editorElevation,
                        }}
                    >
                        {isLoading ? (
                            // Loading state: Show ActivityIndicator while images are being restored
                            <View style={{ marginTop: 50, alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                                <ActivityIndicator size="large" color={themeStyles.primary} />
                            </View>
                        ) : (
                            <RichEditor
                        ref={editorRef}
                        initialContentHTML={contentHtml}
                        onChange={(html) => {
                            setContentHtml(html);
                            // Sync title from content if h1 tag exists
                            const extracted = extractTitleFromContent(html);
                            if (extracted.title && extracted.title !== title.trim()) {
                                setTitle(extracted.title);
                            }
                        }}
                        onFocus={() => {
                            setIsEditorFocused(true);
                            setEmojiTarget('content');
                        }}
                        onBlur={() => setIsEditorFocused(false)}
                        onMessage={handleEditorMessage}
                        style={[
                            styles.editor,
                            {
                                borderColor: isCyberpunkTheme ? '#00FFFF' : themeStyles.border,
                                backgroundColor: isCyberpunkTheme ? 'transparent' : themeStyles.card,
                                borderRadius: isCyberpunkTheme ? 0 : themeStyles.cardRadius, // Cyberpunk: square corners
                                borderWidth: isCyberpunkTheme ? 1 : undefined,
                                minHeight: 300, // Minimum height for initial display
                                width: '100%', // Full width within ScrollView
                            },
                        ]}
                        editorStyle={{
                            backgroundColor: isCyberpunkTheme ? 'transparent' : themeStyles.card,
                            color: themeStyles.text,
                            placeholderColor: isChildTheme ? '#7090AC80' : themeStyles.inputPlaceholder,
                            caretColor: isCyberpunkTheme ? '#00FFFF' : undefined,
                            contentCSSText: `
                                font-family: '${bodyFontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                                font-size: 16px;
                                line-height: 1.6;
                                padding: 15px;
                                min-height: 300px;
                                height: auto;
                            `,
                            // Add CSS to ensure images and title display correctly
                            cssText: `
                                h1 {
                                    font-size: 24px;
                                    font-weight: bold;
                                    margin-top: 0;
                                    margin-bottom: 16px;
                                    padding-bottom: 8px;
                                    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                                }
                                img {
                                    max-width: 100%;
                                    height: auto;
                                    margin: 10px 0;
                                    display: block;
                                    border-radius: 8px;
                                }
                            `,
                        }}
                        // Inject JavaScript to fix local file image display in WebView and enhance editing ergonomics
                        injectedJavaScript={`
                            (function() {
                                var ns = window.whisperDiary = window.whisperDiary || {};
                                var zeroWidth = /\\u200B/g;

                                var isEmptyText = function(node) {
                                    if (!node) { return false; }
                                    if (node.nodeType !== Node.TEXT_NODE) { return false; }
                                    return node.textContent.replace(zeroWidth, '').trim().length === 0;
                                };

                                ns.bindImage = function(img) {
                                    if (!img || img.dataset.whisperTapBound) { return; }
                                    img.dataset.whisperTapBound = 'true';
                                    img.style.cursor = 'pointer';
                                    img.addEventListener('click', function(event) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                                type: 'image-tap',
                                                fileUri: img.getAttribute('data-file-uri') || '',
                                                src: img.getAttribute('src') || ''
                                            }));
                                        }
                                    });
                                };

                                var findAdjacentImage = function(direction) {
                                    var selection = window.getSelection();
                                    if (!selection || selection.rangeCount === 0) { return null; }
                                    var range = selection.getRangeAt(0);
                                    if (!range.collapsed) { return null; }

                                    var step = function(container, offset, dir) {
                                        if (!container) { return null; }

                                        if (container.nodeType === Node.TEXT_NODE) {
                                            var text = container.textContent || '';
                                            var before = text.slice(0, offset).replace(zeroWidth, '');
                                            var after = text.slice(offset).replace(zeroWidth, '');
                                            if ((dir === -1 && before.length > 0) || (dir === 1 && after.length > 0)) {
                                                return null;
                                            }
                                            var sibling = dir === -1 ? container.previousSibling : container.nextSibling;
                                            while (sibling && isEmptyText(sibling)) {
                                                sibling = dir === -1 ? sibling.previousSibling : sibling.nextSibling;
                                            }
                                            if (sibling) {
                                                if (sibling.nodeType === Node.ELEMENT_NODE && sibling.childNodes.length > 0 && sibling.tagName !== 'IMG') {
                                                    return step(sibling, dir === -1 ? sibling.childNodes.length : 0, dir);
                                                }
                                                return sibling;
                                            }
                                            var parent = container.parentNode;
                                            if (!parent) { return null; }
                                            var index = Array.prototype.indexOf.call(parent.childNodes, container);
                                            return step(parent, dir === -1 ? index : index + 1, dir);
                                        }

                                        if (container.nodeType === Node.ELEMENT_NODE) {
                                            var childIndex = dir === -1 ? offset - 1 : offset;
                                            if (childIndex >= 0 && childIndex < container.childNodes.length) {
                                                var child = container.childNodes[childIndex];
                                                if (child.nodeType === Node.ELEMENT_NODE && child.childNodes.length > 0 && child.tagName !== 'IMG') {
                                                    return step(child, dir === -1 ? child.childNodes.length : 0, dir);
                                                }
                                                if (!isEmptyText(child)) {
                                                    return child;
                                                }
                                            }
                                            var siblingEl = dir === -1 ? container.previousSibling : container.nextSibling;
                                            while (siblingEl && isEmptyText(siblingEl)) {
                                                siblingEl = dir === -1 ? siblingEl.previousSibling : siblingEl.nextSibling;
                                            }
                                            if (siblingEl) {
                                                if (siblingEl.nodeType === Node.ELEMENT_NODE && siblingEl.childNodes.length > 0 && siblingEl.tagName !== 'IMG') {
                                                    return step(siblingEl, dir === -1 ? siblingEl.childNodes.length : 0, dir);
                                                }
                                                return siblingEl;
                                            }
                                            if (container.parentNode) {
                                                var parentIndex = Array.prototype.indexOf.call(container.parentNode.childNodes, container);
                                                return step(container.parentNode, dir === -1 ? parentIndex : parentIndex + 1, dir);
                                            }
                                        }
                                        return null;
                                    };

                                    var candidate = step(range.startContainer, range.startOffset, direction);
                                    if (candidate && candidate.nodeType === Node.ELEMENT_NODE && candidate.tagName === 'BR') {
                                        candidate = direction === -1 ? candidate.previousSibling : candidate.nextSibling;
                                    }
                                    if (candidate && candidate.nodeType === Node.ELEMENT_NODE && candidate.tagName === 'IMG') {
                                        return candidate;
                                    }
                                    return null;
                                };

                                ns.removeAdjacentImage = function(direction) {
                                    var img = findAdjacentImage(direction);
                                    if (!img) { return false; }
                                    var parent = img.parentNode;
                                    img.remove();
                                    if (parent && parent.childNodes.length === 0) {
                                        parent.appendChild(document.createTextNode('\\u200B'));
                                    }
                                    return true;
                                };

                                var ensureKeyBindings = function() {
                                    var editorEl = document.querySelector('.pell-content');
                                    if (!editorEl || editorEl.dataset.whisperKeyBound) { return; }
                                    editorEl.dataset.whisperKeyBound = 'true';
                                    editorEl.addEventListener('keydown', function(event) {
                                        if (event.key === 'Backspace') {
                                            if (ns.removeAdjacentImage(-1)) {
                                                event.preventDefault();
                                            }
                                        } else if (event.key === 'Delete') {
                                            if (ns.removeAdjacentImage(1)) {
                                                event.preventDefault();
                                            }
                                        }
                                    });
                                };

                                var fixImages = function() {
                                    ensureKeyBindings();
                                    var images = document.querySelectorAll('img');
                                    console.log('WebView: Found', images.length, 'images to fix');
                                    images.forEach(function(img, index) {
                                        var src = img.getAttribute('src');
                                        var dataFileUri = img.getAttribute('data-file-uri');
                                        console.log('WebView: Image', index, 'src:', src, 'data-file-uri:', dataFileUri);
                                        if (src && (src.startsWith('file://') || src.startsWith('/') || src.startsWith('content://') || src.startsWith('data:'))) {
                                            if (!src.startsWith('data:')) {
                                                img.src = src;
                                            }
                                            img.style.maxWidth = '100%';
                                            img.style.width = '100%';
                                            img.style.height = 'auto';
                                            img.style.minHeight = '200px';
                                            img.style.margin = '10px 0';
                                            img.style.display = 'block';
                                            img.style.borderRadius = '0px'; // Cyberpunk: square corners
                                            img.style.backgroundColor = '#f5f5f5';
                                            ns.bindImage(img);
                                            img.onerror = function() {
                                                console.error('WebView: Image load error:', this.src);
                                            };
                                            img.onload = function() {
                                                console.log('WebView: Image loaded successfully:', this.src);
                                                console.log('WebView: Image dimensions:', this.naturalWidth, 'x', this.naturalHeight);
                                            };
                                        }
                                    });
                                };

                                fixImages();
                                var observer = new MutationObserver(function() {
                                    fixImages();
                                });
                                observer.observe(document.body, { childList: true, subtree: true });

                                // Cursor position tracking for automatic scroll
                                var trackCursorPosition = function() {
                                    var editorEl = document.querySelector('.pell-content');
                                    if (!editorEl) { return; }
                                    
                                    var getCursorPosition = function() {
                                        try {
                                            var selection = window.getSelection();
                                            if (!selection || selection.rangeCount === 0) { return null; }
                                            
                                            var range = selection.getRangeAt(0);
                                            var rect = range.getBoundingClientRect();
                                            var editorRect = editorEl.getBoundingClientRect();
                                            
                                            // Calculate cursor Y position relative to editor top
                                            var cursorY = rect.top - editorRect.top + editorEl.scrollTop;
                                            return cursorY;
                                        } catch (e) {
                                            return null;
                                        }
                                    };
                                    
                                    var sendCursorPosition = function() {
                                        var cursorY = getCursorPosition();
                                        if (cursorY !== null && cursorY !== undefined && window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                                type: 'cursor-position',
                                                scrollY: cursorY
                                            }));
                                        }
                                    };
                                    
                                    // Track cursor position on selection change (cursor movement)
                                    document.addEventListener('selectionchange', function() {
                                        // Debounce to avoid too many messages
                                        if (window.whisperDiaryCursorTimeout) {
                                            clearTimeout(window.whisperDiaryCursorTimeout);
                                        }
                                        window.whisperDiaryCursorTimeout = setTimeout(sendCursorPosition, 100);
                                    });
                                    
                                    // Track cursor position on input (typing)
                                    editorEl.addEventListener('input', function() {
                                        setTimeout(sendCursorPosition, 50);
                                    });
                                    
                                    // Track cursor position on click/tap
                                    editorEl.addEventListener('click', function() {
                                        setTimeout(sendCursorPosition, 50);
                                    });
                                    
                                    // Track cursor position on focus
                                    editorEl.addEventListener('focus', function() {
                                        setTimeout(sendCursorPosition, 100);
                                    });
                                };
                                
                                // Initialize cursor tracking after a short delay to ensure editor is ready
                                setTimeout(trackCursorPosition, 500);
                            })();
                        `}
                            placeholder={
                                isChildTheme 
                                    ? 'Title\n\nHow was your day?' 
                                    : isCyberpunkTheme 
                                        ? 'Title\n> How was your day?' 
                                        : 'How was your day?'
                            }
                            placeholderTextColor={isChildTheme ? '#7090AC80' : themeStyles.inputPlaceholder}
                        useContainer={true}
                        initialHeight={300} // Initial height, will grow with content
                        containerStyle={styles.editorContainerStyle}
                        />
                        )}
                    </Animated.View>
                    
                    {/* Bottom Spacer: Ensures content can always scroll to the bottom, even when keyboard is up */}
                    <Animated.View 
                        style={{ 
                            height: Animated.add(keyboardHeight, 100),
                            width: '100%',
                        }} 
                    />
                </Animated.View>
            </Animated.ScrollView>

            {/* 3. Floating Footer - Absolute positioned, driven by keyboardHeight */}
                <Animated.View 
                    style={[
                        styles.footer, 
                        { 
                            position: 'absolute',
                            bottom: keyboardHeight,
                            left: 0,
                            right: 0,
                            width: '100%',
                            zIndex: 9999,
                            backgroundColor: themeStyles.surface, 
                            borderTopColor: themeStyles.border,
                            paddingTop: 8,
                            paddingBottom: Math.max(insets.bottom, 12),
                            paddingHorizontal: 20,
                        }
                    ]}
                >
                    {/* RichToolbar - Shown when keyboard is up */}
                    <View 
                        style={[
                            styles.toolbarWrapper, 
                            toolbarContainerStyle,
                            { 
                                display: isKeyboardUp ? 'flex' : 'none',
                                height: 50,
                                width: '100%',
                            }
                        ]}
                    >
                        <RichToolbar
                            getEditor={() => editorRef.current}
                            actions={[
                                actions.setBold,
                                actions.setItalic,
                                actions.setUnderline,
                                actions.insertBulletsList,
                                actions.insertImage,
                                'insertEmoji',
                            ]}
                            iconMap={{
                                insertEmoji: ({ tintColor }) => (
                                    <Ionicons name="happy-outline" size={24} color={tintColor || themeStyles.text} />
                                ),
                            }}
                            onPressAddImage={handleInsertImage}
                            insertEmoji={handleInsertEmoji}
                            iconTint={isCyberpunkTheme ? '#00FFFF' : themeStyles.text}
                            selectedIconTint={themeStyles.primary}
                            iconGap={20}
                            unselectedButtonStyle={isCyberpunkTheme ? {
                                backgroundColor: 'transparent',
                            } : undefined}
                            selectedButtonStyle={isCyberpunkTheme ? {
                                backgroundColor: 'transparent',
                            } : undefined}
                            itemStyle={isCyberpunkTheme ? (cyberpunkToolbarItemStyle || {
                                flex: 0,
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 44,
                                height: 44,
                                backgroundColor: 'transparent',
                                marginHorizontal: 8,
                            }) : {
                                flex: 0,
                                minWidth: 44,
                                height: 50,
                                minHeight: 50,
                                maxHeight: 50,
                                justifyContent: 'center',
                                alignItems: 'center',
                                paddingVertical: 0,
                                paddingHorizontal: 12,
                                marginHorizontal: 8,
                                marginVertical: 0,
                            }}
                            flatContainerStyle={isCyberpunkTheme ? {
                                flexDirection: 'row',
                                minHeight: 50,
                                paddingLeft: 16,
                                paddingRight: 24,
                                paddingVertical: 0,
                                backgroundColor: 'transparent',
                            } : {
                                width: '100%',
                                height: 50,
                                minHeight: 50,
                                maxHeight: 50,
                                paddingLeft: 8,
                                paddingRight: 24,
                                marginHorizontal: 0,
                                paddingVertical: 0,
                                marginVertical: 0,
                                flexDirection: 'row',
                            }}
                            style={[
                                isCyberpunkTheme ? {
                                    minHeight: 50,
                                    margin: 0,
                                    padding: 0,
                                    backgroundColor: 'transparent',
                                } : {
                                    width: '100%',
                                    height: 50,
                                    minHeight: 50,
                                    maxHeight: 50,
                                    margin: 0,
                                    padding: 0,
                                },
                                {
                                    position: 'relative',
                                    bottom: 'auto',
                                    left: 'auto',
                                    right: 'auto',
                                }
                            ]}
                        />
                    </View>
                    
                    {/* Save Button - Shown when keyboard is down */}
                    <View style={{ display: isKeyboardUp ? 'none' : 'flex' }}>
                        <TouchableOpacity 
                            style={styles.saveButton}
                            onPress={handleSave}
                            activeOpacity={0.8}
                            disabled={!saveEnabled || isSaving}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                        {isChildTheme ? (
                            <LinearGradient
                                colors={['#FFAECC', '#FFD391']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[
                                    styles.saveButtonGradient,
                                    {
                                        opacity: (saveEnabled && !isSaving) ? 1 : 0.4,
                                        transform: isEditorFocused && saveEnabled && !isSaving ? [{ scale: 1.02 }] : [{ scale: 1 }],
                                    },
                                ]}
                            >
                                {isSaving ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        <ActivityIndicator size="small" color="#4F6586" style={{ marginRight: 8 }} />
                                        <Text
                                            style={[
                                                styles.saveButtonText,
                                                {
                                                    fontFamily: headingFontFamily,
                                                    fontSize: 26,
                                                    color: '#4F6586',
                                                },
                                            ]}
                                        >
                                            Saving...
                                        </Text>
                                    </View>
                                ) : (
                                    <Text
                                        style={[
                                            styles.saveButtonText,
                                            {
                                                fontFamily: headingFontFamily,
                                                fontSize: 26,
                                                color: '#4F6586',
                                            },
                                        ]}
                                    >
                                        {isEditMode ? "Save Changes" : "Save Diary"}
                                    </Text>
                                )}
                            </LinearGradient>
                        ) : isCyberpunkTheme ? (
                            <View
                                style={[
                                    styles.saveButtonContent,
                                    {
                                        backgroundColor: 'transparent',
                                        borderRadius: 0,
                                        borderWidth: 2,
                                        borderColor: isEditorFocused && saveEnabled && !isSaving ? '#00FFFF' : '#FF00FF',
                                        opacity: (saveEnabled && !isSaving) ? 1 : 0.4,
                                        transform: isEditorFocused && saveEnabled && !isSaving ? [{ scale: 1.02 }] : [{ scale: 1 }],
                                    },
                                ]}
                            >
                                {isSaving ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                                        <Text
                                            style={[
                                                styles.saveButtonText,
                                                {
                                                    color: '#FFFFFF',
                                                    fontFamily: buttonFontFamily,
                                                    fontSize: 20,
                                                },
                                            ]}
                                        >
                                            Saving...
                                        </Text>
                                    </View>
                                ) : (
                                    <Text
                                        style={[
                                            styles.saveButtonText,
                                            {
                                                color: '#FFFFFF',
                                                fontFamily: buttonFontFamily,
                                                fontSize: 20,
                                            },
                                        ]}
                                    >
                                        {isEditMode ? "Save Changes" : "Save Diary"}
                                    </Text>
                                )}
                            </View>
                        ) : (
                            <View
                                style={[
                                    styles.saveButtonContent,
                                    {
                                        backgroundColor: themeStyles.primary,
                                        borderRadius: themeStyles.buttonRadius,
                                        opacity: (saveEnabled && !isSaving) ? (isEditorFocused ? 1 : 0.9) : 0.4,
                                        transform: isEditorFocused && saveEnabled && !isSaving ? [{ scale: 1.02 }] : [{ scale: 1 }],
                                    },
                                ]}
                            >
                                {isSaving ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                        <ActivityIndicator size="small" color={themeStyles.primaryText} style={{ marginRight: 8 }} />
                                        <Text
                                            style={[
                                                styles.saveButtonText,
                                                {
                                                    color: themeStyles.primaryText,
                                                    fontFamily: buttonFontFamily,
                                                },
                                            ]}
                                        >
                                            Saving...
                                        </Text>
                                    </View>
                                ) : (
                                    <Text
                                        style={[
                                            styles.saveButtonText,
                                            {
                                                color: themeStyles.primaryText,
                                                fontFamily: buttonFontFamily,
                                            },
                                        ]}
                                    >
                                        {isEditMode ? "Save Changes" : "Save Diary"}
                                    </Text>
                                )}
                            </View>
                        )}
                        </TouchableOpacity>
                    </View>
                </Animated.View>

            <Modal
                    animationType="slide"
                    transparent
                    visible={isEmojiPickerVisible}
                    onRequestClose={handleCloseEmojiPicker}
                >
                    <TouchableWithoutFeedback onPress={handleCloseEmojiPicker}>
                        <View style={styles.emojiOverlay}>
                            <TouchableWithoutFeedback onPress={() => {}}>
                                <View style={[styles.emojiPicker, { backgroundColor: themeStyles.card }]}>
                                    <View style={styles.emojiHeader}>
                                        <Text style={[styles.emojiTitle, { color: themeStyles.text, fontFamily: headingFontFamily }]}>
                                            Choose an emoji
                                        </Text>
                                        <TouchableOpacity
                                            onPress={handleCloseEmojiPicker}
                                            style={styles.emojiCloseButton}
                                        >
                                            <Text style={[styles.emojiCloseText, { color: themeStyles.primary, fontFamily: buttonFontFamily }]}>
                                                Close
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView
                                        contentContainerStyle={styles.emojiGrid}
                                        showsVerticalScrollIndicator={false}
                                    >
                                        {EMOJI_OPTIONS.map((emoji) => (
                                            <TouchableOpacity
                                                key={emoji}
                                                style={styles.emojiButton}
                                                onPress={() => handleSelectEmoji(emoji)}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.emojiText}>{emoji}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

            {/* Focus Selection Modal */}
            {themeContext && (
                <FocusSelectionModal
                    isVisible={isFocusModalVisible}
                    onClose={() => setFocusModalVisible(false)}
                    onFocusSelect={handleFocusSelected}
                    colors={themeContext.colors}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 0, paddingTop: 0 }, // Content padding inside ScrollView (paddingBottom moved to ScrollView contentContainerStyle)
    heroContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
        minHeight: 200, // Ensure minimum height for visibility
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        marginBottom: 18,
    },
    headerAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50, // Make it a circle
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#EAE0D5', // A soft background color from your theme
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C6AC8F', // A subtle border
    },
    placeholderInitial: {
        fontSize: 40,
        color: '#5D5C61', // A darker color for the text
        fontWeight: 'bold',
    },
    headerImage: {
        // Style for the theme images like the chameleon
        width: 150,
        height: 150,
        resizeMode: 'contain',
    },
    avatarWrapper: { 
        alignItems: 'center', 
        justifyContent: 'center', 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.18, 
        shadowRadius: 9, 
        elevation: 6 
    },
    glow: { 
        alignItems: 'center', 
        justifyContent: 'center', 
        shadowColor: "#87CEEB", 
        shadowOffset: { width: 0, height: 0 }, 
        shadowOpacity: 0.55, 
        shadowRadius: 18, 
        elevation: 12,
        backgroundColor: '#EEF2FF',
    },
    stackedAvatar: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stackedSecondary: {
        position: 'absolute',
        top: 8,
        left: 8,
        borderWidth: 2,
        borderColor: '#FF0000', // Cyberpunk style: red border
        backgroundColor: '#fff',
        borderRadius: 0, // Cyberpunk style: square corners
    },
    stackedPrimary: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        borderWidth: 2,
        borderColor: '#FF0000', // Cyberpunk style: red border
        backgroundColor: '#fff',
        borderRadius: 0, // Cyberpunk style: square corners
    },
    weatherContainer: { alignItems: 'center', padding: 15, marginBottom: 20, borderRadius: 0, borderWidth: StyleSheet.hairlineWidth }, // Cyberpunk: square corners
    titleInputStandalone: {
        marginBottom: 20,
    },
    // Removed carousel styles - companion selection moved to settings
    input: { borderWidth: 1, borderRadius: 0, padding: 15, fontSize: 16, marginBottom: 20 }, // Cyberpunk: square corners
    editor: { 
        width: '100%',
        minHeight: 300, // CRITICAL: 减少最小高度，让编辑器更灵活，节省空间
        borderWidth: 1, 
        borderRadius: 0, // Cyberpunk: square corners
        marginBottom: 20,
        overflow: 'hidden',
    },
    editorContainerStyle: {
        minHeight: 300, // CRITICAL: 与 editor 的 minHeight 保持一致
    },
    footer: {
        borderTopWidth: 1,
        paddingHorizontal: 0,
        paddingTop: 12,
        paddingBottom: 0, // Will be set dynamically with safe area insets
        // CRITICAL FIX: 移除所有破坏性样式（zIndex, elevation, position, bottom, left, right）
        // Footer 使用绝对定位，由 keyboardHeight 动画值驱动
        width: '100%',
        alignSelf: 'stretch',
        flexDirection: 'column',
        alignItems: 'stretch',
    },
    toolbar: {
        marginBottom: 0,
        alignItems: 'stretch',
        justifyContent: 'space-evenly',
        flexDirection: 'row',
        width: '100%',
        alignSelf: 'stretch',
        minHeight: 50,
        height: 50,
        maxHeight: 50,
        paddingHorizontal: 0,
        marginHorizontal: 0,
        overflow: 'hidden',
    },
    toolbarWrapper: {
        width: '100%',
        alignSelf: 'stretch',
        marginBottom: 12,
        overflow: 'hidden',
        minHeight: 50,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 4,
        paddingRight: 8,
    },
    saveButton: {
        width: '100%',
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 15,
        zIndex: 1002,
        height: 52,
        marginTop: 0,
    },
    saveButtonContent: {
        width: '100%',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 0, // Cyberpunk: square corners
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonGradient: {
        width: '100%',
        paddingHorizontal: 20,
        borderRadius: 0, // Cyberpunk: square corners
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    headerSaveButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    headerSaveText: {
        fontSize: 16,
        fontWeight: '600',
    },
    childHeaderBack: {
        backgroundColor: '#FFF1DC',
        borderRadius: 0, // Cyberpunk: square corners
        paddingHorizontal: 14,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#E5C9A9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emojiOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'flex-end',
    },
    emojiPicker: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 32,
        maxHeight: '65%',
    },
    emojiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    emojiTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    emojiCloseButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    emojiCloseText: {
        fontSize: 16,
        fontWeight: '500',
    },
    emojiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingBottom: 12,
    },
    emojiButton: {
        width: '18%',
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderRadius: 0, // Cyberpunk: square corners
        backgroundColor: 'rgba(120,120,120,0.12)',
    },
    emojiText: {
        fontSize: 28,
    },
});

export default AddEditDiaryScreen;