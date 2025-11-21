import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect, useNavigation, usePreventRemove } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- 核心依赖 ---
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- 组件和 Context ---
import MoodSelector from '../components/MoodSelector';
// Removed CompanionSelectorCarousel import - companion selection moved to settings
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { CompanionContext } from '../context/CompanionContext';
import { useUserState } from '../context/UserStateContext';
import { ThemedText as Text } from '../components/ThemedText';
import { getCurrentWeather } from '../services/weatherService';
// TEMPORARILY DISABLED: StaticServer removed due to build failures
// import { ensureStaticServer, getPublicUrlForFileUri } from '../services/staticServer';
// import { ensureStaticServer, getPublicUrlForFileUri } from '../services/staticServer';
import themeAnalysisService from '../services/ThemeAnalysisService';
import { useThemeStyles } from '@/hooks/useThemeStyles';

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

            // TEMPORARILY DISABLED: StaticServer removed - using original URI
            // const publicUrl = await getPublicUrlForFileUri(fileUri);
            // const publicUrl = await getPublicUrlForFileUri(fileUri); // Still works, returns data: URI fallback
            const publicUrl = fileUri; // Fallback to original URI
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
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    
    const entryDateParam = useMemo(() => {
        const raw = params?.date;
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
    const scrollViewRef = useRef(null);
 
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
    // CRITICAL: Removed heroVisual state - will derive from live context data on every render
    const [hasInitialPrimaryApplied, setHasInitialPrimaryApplied] = useState(false);
    // CRITICAL: Track primary companion ID from AsyncStorage for new entries
    const [primaryCompanionId, setPrimaryCompanionId] = useState(null);
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

    useEffect(() => {
        setContentHtml(processedInitialContent);
        initialContentRef.current = processedInitialContent;
        hasRemappedInitialHtml.current = false;
    }, [processedInitialContent]);

    // --- CRITICAL: Ensure ScrollView scrolls to top when component mounts or when editing existing diary ---
    useEffect(() => {
        // Scroll to top when component first mounts or when switching to edit mode
        const scrollToTop = () => {
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
            }
        };
        
        // Use a small delay to ensure ScrollView is fully rendered
        const timeoutId = setTimeout(scrollToTop, 100);
        
        return () => clearTimeout(timeoutId);
    }, [isEditMode, existingDiary?.id]); // Re-scroll when entering edit mode or diary changes

    // --- CRITICAL: Also scroll to top when screen gains focus (e.g., navigating from detail screen) ---
    useFocusEffect(
        useCallback(() => {
            // Scroll to top when screen comes into focus
            const scrollToTop = () => {
                if (scrollViewRef.current) {
                    scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
                }
            };
            
            // Use a delay to ensure ScrollView is fully rendered after navigation
            const timeoutId = setTimeout(scrollToTop, 150);
            
            return () => clearTimeout(timeoutId);
        }, [])
    );

    useEffect(() => {
        let isMounted = true;
        (async () => {
            // TEMPORARILY DISABLED: StaticServer removed - no-op call
            // await ensureStaticServer(); // Still works, returns null immediately
            if (!isMounted) return;

            if (!hasRemappedInitialHtml.current && initialContentRef.current) {
                const remapped = await remapHtmlImageSourcesToServer(initialContentRef.current);
                if (!isMounted) return;
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
            isMounted = false;
    };
    }, [processedInitialContent]);

    // --- Image insertion logic (persistent file URI + ID passing) ---
    const handleInsertImage = async () => {
        try {
            // TEMPORARILY DISABLED: StaticServer removed - no-op call
            // await ensureStaticServer(); // Still works, returns null immediately

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

            const imagesDir = new Directory(Paths.document, 'images');
            if (!imagesDir.exists) {
                await imagesDir.create({ intermediates: true });
            }

            for (const asset of assets) {
                const sourceUri = asset?.uri;
                if (!sourceUri) {
                    continue;
                }

                let workingUri = sourceUri;
                let extension = (asset?.fileName || sourceUri).split('.').pop()?.split('?')[0] || 'jpg';

                if (extension.toLowerCase() === 'heic' || extension.toLowerCase() === 'heif') {
                    try {
                        console.log('handleInsertImage: converting HEIC/HEIF to JPEG');
                        const manipulated = await ImageManipulator.manipulateAsync(
                            sourceUri,
                            [],
                            { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
                        );
                        workingUri = manipulated.uri;
                        extension = 'jpg';
                    } catch (conversionError) {
                        console.warn('handleInsertImage: HEIC conversion failed, attempting copy with original file', conversionError);
                        extension = 'jpg';
                    }
                }

                const sourceFile = new File(workingUri);
                if (!sourceFile.exists) {
                    continue;
                }

                const timeStamp = Date.now();
                const random = Math.random().toString(36).slice(2, 8);

                const fileName = `image_${timeStamp}_${random}.${extension}`;
                const destinationFile = new File(imagesDir, fileName);
                await sourceFile.copy(destinationFile);

                let finalUri = destinationFile.uri;
                if (Platform.OS === 'android') {
                    // eslint-disable-next-line import/namespace
                    const canMakeContentUri = typeof FileSystem.makeContentUriAsync === 'function';
                    if (canMakeContentUri) {
                        try {
                            // eslint-disable-next-line import/namespace
                            finalUri = await FileSystem.makeContentUriAsync(destinationFile.uri);
                        } catch (androidUriError) {
                            console.warn('makeContentUriAsync failed, falling back to file URI', androidUriError);
                            finalUri = destinationFile.uri.startsWith('file://')
                                ? destinationFile.uri
                                : `file://${destinationFile.uri}`;
                        }
                    } else {
                        finalUri = destinationFile.uri.startsWith('file://')
                            ? destinationFile.uri
                            : `file://${destinationFile.uri}`;
                    }
                } else {
                    const clean = destinationFile.uri.replace(/^file:\/\//, '');
                    finalUri = `file://${clean}`;
                }

                console.log('handleInsertImage: finalUri ->', finalUri, 'type:', typeof finalUri);

                if (editorRef.current) {
                    // TEMPORARILY DISABLED: StaticServer removed - still works, returns data: URI fallback
                    // const publicUri = await getPublicUrlForFileUri(destinationFile.uri);
                    const publicUri = destinationFile.uri; // Fallback to original URI
                    const style = 'max-width:100%; height:auto; display:block; margin:12px 0; border-radius:8px;';
                    editorRef.current.insertImage(publicUri, style);

                    const fileAttrValue = JSON.stringify(finalUri);
                    editorRef.current.commandDOM(`
                        (function() {
                            const register = window.whisperDiary && window.whisperDiary.bindImage;
                            const images = document.querySelectorAll('img');
                            const target = images[images.length - 1];
                            if (!target) { return; }
                            target.setAttribute('data-file-uri', ${fileAttrValue});
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
                    const ensureEditorFocus = () => {
                        if (editorRef.current?.focusContentEditor) {
                            editorRef.current.focusContentEditor();
                        }
                    };
                    ensureEditorFocus();
                    const t1 = setTimeout(ensureEditorFocus, 180);
                    const t2 = setTimeout(() => {
                        ensureEditorFocus();
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 360);
                    const t3 = setTimeout(() => {
                        ensureEditorFocus();
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 600);
                    const t4 = setTimeout(() => {
                        ensureEditorFocus();
                        scrollViewRef.current?.scrollToEnd({ animated: true });
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
            console.error('handleInsertImage error:', error);
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
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, []);

    const handleEditorMessage = useCallback((event) => {
        try {
            const raw = event?.nativeEvent?.data;
            if (!raw) return;
            const parsed = JSON.parse(raw);
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
    }, [removeImageByIdentifier]);

    // --- Save logic ---
    const handleSave = useCallback(async () => {
        // Prevent duplicate saves
        if (isSaving) {
            console.log('handleSave: Already saving, ignoring duplicate call');
            return;
        }

        try {
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

            // Save content directly - already using file URIs (no Base64 conversion needed)
            // This is the production-ready, scalable approach
            let contentToSave = contentHtml;

            // Clean up any temporary attributes or fix any URI issues before saving
            // Ensure all file URIs are properly formatted
            contentToSave = contentToSave.replace(/<img([^>]*?)>/gi, (match) => {
                const dataMatch = match.match(/data-file-uri="([^"]*)"/i);
                if (!dataMatch) {
                    return match;
                }

                const fileUri = dataMatch[1].replace(/&quot;/g, '"');
                const sanitized = fileUri.replace(/"/g, '&quot;');

                let updated = match.replace(/data-file-uri="[^"]*"/i, '');

                if (updated.match(/src="[^"]*"/i)) {
                    updated = updated.replace(/src="[^"]*"/i, `src="${sanitized}"`);
                } else {
                    updated = updated.replace('<img', `<img src="${sanitized}"`);
                }

                return updated;
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

        let isMounted = true;
        const initializePrimaryCompanion = async () => {
            try {
                // For new entries, use primary companion if set
                const storedPrimary = await AsyncStorage.getItem('primaryCompanionID');
                if (!isMounted) {
                    return;
                }

                // Handle "No default companion" case: 'none', null, undefined, 'null', 'undefined'
                if (!storedPrimary || 
                    storedPrimary === 'null' || 
                    storedPrimary === 'undefined' || 
                    storedPrimary === 'none') {
                    // No primary companion set or "No default companion" selected
                    setPrimaryCompanionId(null);
                    setSelectedCompanionIDs([]);
                    setHasInitialPrimaryApplied(true);
                    return;
                }

                // CRITICAL: Store the primary companion ID for use in render
                // The visual will be derived from live context data on every render
                setPrimaryCompanionId(String(storedPrimary));
                
                // CRITICAL: Check userState.companions first (most up-to-date)
                const userStateCompanion = userState?.companions?.[String(storedPrimary)];
                
                if (userStateCompanion) {
                    // Set primary companion as selected
                    setSelectedCompanionIDs([String(userStateCompanion.id)]);
                    console.log('[AddEditDiaryScreen] ✅ Loaded primary companion from userState:', {
                        id: userStateCompanion.id,
                        name: userStateCompanion.name,
                        hasAvatar: !!(userStateCompanion.avatar?.source || userStateCompanion.avatarUri),
                    });
                } else {
                    // Fallback to allCompanions (for legacy companions)
                    const matched = allCompanions.find(
                        (item) => String(item.id) === String(storedPrimary)
                    );
                    if (matched) {
                        setSelectedCompanionIDs([String(matched.id)]);
                        console.log('[AddEditDiaryScreen] ⚠️ Using legacy companion (not in userState):', matched.id);
                    } else {
                        // Primary companion not found, clear it
                        console.warn('[AddEditDiaryScreen] ⚠️ Primary companion not found, clearing selection');
                        setPrimaryCompanionId(null);
                        setSelectedCompanionIDs([]);
                        await AsyncStorage.removeItem('primaryCompanionID');
                    }
                }
            } catch (error) {
                console.warn('[AddEditDiaryScreen] Failed to load primary companion for editor', error);
                setPrimaryCompanionId(null);
                setSelectedCompanionIDs([]);
            } finally {
                if (isMounted) {
                    setHasInitialPrimaryApplied(true);
                }
            }
        };

        // Only initialize for new entries (not edit mode)
        if (!isEditMode) {
            initializePrimaryCompanion();
        } else {
            // For edit mode, use existing companions from diary
            setHasInitialPrimaryApplied(true);
        }

        return () => {
            isMounted = false;
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

    return (
        <View style={[styles.container, { backgroundColor: themeStyles.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={90}
            >
                    <View style={heroContainerStyle}>
                        {(() => {
                            // --- CRITICAL: Derive hero visual from live context data on every render ---
                            // This ensures the visual always reflects the current state from UserStateContext
                            
                            // Determine the primary companion object from the live state
                            // Priority: Edit mode companion > Primary companion > None
                            let primaryCompanion = null;
                            
                            if (existingDiary && userState?.companions) {
                                // EDIT MODE: Use companion from diary
                                const companionIds = existingDiary.companionIDs || 
                                                    existingDiary.companionIds || 
                                                    existingDiary.companions || 
                                                    [];
                                const firstCompanionId = Array.isArray(companionIds) ? companionIds[0] : companionIds;
                                if (firstCompanionId) {
                                    primaryCompanion = userState.companions[String(firstCompanionId)];
                                }
                            } else if (!existingDiary && primaryCompanionId && userState?.companions) {
                                // CREATE MODE: Use primary companion from settings
                                primaryCompanion = userState.companions[String(primaryCompanionId)];
                            }
                            
                            // Derive hero visual source based on priority
                            let heroVisualSource;
                            
                            if (primaryCompanion && primaryCompanion.avatar?.type === 'image' && primaryCompanion.avatar?.source) {
                                // Case 1: Primary companion exists and has a custom image avatar
                                const avatarSource = primaryCompanion.avatar.source;
                                
                                // CRITICAL: Validate that the path is NOT a temporary ImagePicker cache path
                                if (avatarSource.includes('Caches/ImagePicker')) {
                                    console.error('[AddEditDiaryScreen] ⚠️ CRITICAL: Found temporary ImagePicker cache path!');
                                    // Fall through to theme fallback
                                } else {
                                    try {
                                        heroVisualSource = resolveImageSource(avatarSource);
                                        console.log('[AddEditDiaryScreen] ✅ Using primary companion image avatar:', avatarSource);
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
                                        // Fall through to theme fallback
                                    }
                                }
                            } else if (primaryCompanion && primaryCompanion.avatar?.type === 'lottie' && primaryCompanion.avatar?.source) {
                                // Case 2: Primary companion exists and has a default Lottie avatar
                                heroVisualSource = primaryCompanion.avatar.source;
                                console.log('[AddEditDiaryScreen] ✅ Using primary companion Lottie avatar:', heroVisualSource);
                                return (
                                    <CompanionAvatarView 
                                        size={150} 
                                        visual={{ 
                                            type: 'lottie', 
                                            source: heroVisualSource 
                                        }} 
                                    />
                                );
                            } else if (primaryCompanion && (primaryCompanion.avatarUri || primaryCompanion.avatarIdentifier)) {
                                // Case 2b: Legacy format - companion has avatarUri or avatarIdentifier
                                const avatarSource = primaryCompanion.avatarUri || primaryCompanion.avatarIdentifier;
                                if (avatarSource && avatarSource.trim() && !avatarSource.includes('Caches/ImagePicker')) {
                                    try {
                                        heroVisualSource = resolveImageSource(avatarSource);
                                        console.log('[AddEditDiaryScreen] ✅ Using primary companion legacy avatar:', avatarSource);
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
                                        console.error('[AddEditDiaryScreen] Error resolving legacy avatar:', error);
                                        // Fall through to theme fallback
                                    }
                                }
                            }
                            
                            // Case 3 (Fallback): No primary companion or no avatar - use theme's default avatar
                            if (currentAvatar?.type === 'custom' && currentAvatar.image) {
                                heroVisualSource = resolveImageSource(currentAvatar.image);
                                console.log('[AddEditDiaryScreen] ✅ Using theme custom avatar');
                                return (
                                    <CompanionAvatarView 
                                        size={150} 
                                        visual={{ 
                                            type: 'image', 
                                            source: heroVisualSource 
                                        }} 
                                    />
                                );
                            } else if (currentAvatar?.type === 'system' && currentAvatar.source) {
                                heroVisualSource = currentAvatar.source;
                                console.log('[AddEditDiaryScreen] ✅ Using theme system avatar');
                                return (
                                    <CompanionAvatarView 
                                        size={150} 
                                        visual={{ 
                                            type: 'lottie', 
                                            source: heroVisualSource 
                                        }} 
                                    />
                                );
                            }
                            
                            // Final fallback: DEFAULT_HERO_IMAGE
                            console.log('[AddEditDiaryScreen] ✅ Using default hero image');
                            return (
                                <CompanionAvatarView 
                                    size={150} 
                                    visual={{ type: 'image', source: DEFAULT_HERO_IMAGE }} 
                                />
                            );
                        })()}
                    </View>

            {/* --- 2. Scrollable content area --- */}
            <ScrollView 
                    ref={scrollViewRef}
                style={styles.scrollContainer} 
                contentContainerStyle={styles.scrollContent} 
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    scrollEnabled={true}
                    bounces={true}
                    contentOffset={{ x: 0, y: 0 }}
                    automaticallyAdjustContentInsets={false}
                >
                    <MoodSelector
                        onSelectMood={handleMoodSelect}
                        selectedMood={selectedMood}
                        titleStyle={moodLabelTitleStyle}
                        hideMoodLabels={isChildTheme}
                        hideTitle={isChildTheme || isCyberpunkTheme}
                        moodLabelStyle={{ fontFamily: bodyFontFamily }}
                        containerStyle={isChildTheme ? { marginBottom: 28 } : null}
                    />
                    {/* Title input removed: all themes now integrate title into content */}
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
                        onFocus={() => setEmojiTarget('content')}
                        onMessage={handleEditorMessage}
                        style={[
                            styles.editor,
                            {
                                borderColor: isCyberpunkTheme ? '#00FFFF' : themeStyles.border,
                                backgroundColor: isCyberpunkTheme ? 'transparent' : themeStyles.card,
                                borderRadius: isCyberpunkTheme ? 0 : themeStyles.cardRadius, // Cyberpunk: square corners
                                borderWidth: isCyberpunkTheme ? 1 : undefined,
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
                                min-height: 400px;
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
                        initialHeight={400}
                        containerStyle={styles.editorContainerStyle}
                        />
                </ScrollView>
                
                {/* --- 2. Fixed footer action area --- */}
                <View style={[
                    styles.footer, 
                    { 
                        backgroundColor: themeStyles.surface, 
                        borderTopColor: themeStyles.border,
                        paddingTop: 12,
                        paddingBottom: Math.max(insets.bottom, 16),
                        paddingHorizontal: 20,
                        width: '100%',
                        alignSelf: 'stretch',
                    }
                ]}>
                    {/* Rich Text Toolbar */}
                    <View style={[styles.toolbarWrapper, toolbarContainerStyle]}>
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
                                paddingLeft: 8, // 左移图标以对齐（基础模版和儿童模版）
                                paddingRight: 24,
                                marginHorizontal: 0,
                                paddingVertical: 0,
                                marginVertical: 0,
                                flexDirection: 'row',
                            }}
                            style={isCyberpunkTheme ? {
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
                            }}
                        />
                    </View>
                    
                    {/* Save Button */}
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
                                    },
                                ]}
                            >
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
                                    {isSaving ? "Saving..." : (isEditMode ? "Save Changes" : "Save Diary")}
                                </Text>
                            </LinearGradient>
                        ) : isCyberpunkTheme ? (
                            <View
                                style={[
                                    styles.saveButtonContent,
                                    {
                                        backgroundColor: 'transparent',
                                        borderRadius: 0, // Cyberpunk style: square corners
                                        borderWidth: 2,
                                        borderColor: '#FF00FF',
                                        opacity: (saveEnabled && !isSaving) ? 1 : 0.4,
                                    },
                                ]}
                            >
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
                                    {isSaving ? "Saving..." : (isEditMode ? "Save Changes" : "Save Diary")}
                                </Text>
                            </View>
                        ) : (
                            <View
                                style={[
                                    styles.saveButtonContent,
                                    {
                                        backgroundColor: themeStyles.primary,
                                        borderRadius: isCyberpunkTheme ? 0 : themeStyles.buttonRadius, // Cyberpunk: square corners
                                        opacity: (saveEnabled && !isSaving) ? 1 : 0.4,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.saveButtonText,
                                        {
                                            color: themeStyles.primaryText,
                                            fontFamily: buttonFontFamily,
                                        },
                                    ]}
                                >
                                    {isSaving ? "Saving..." : (isEditMode ? "Save Changes" : "Save Diary")}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

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
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 40, paddingTop: 0 },
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
        minHeight: 400, 
        borderWidth: 1, 
        borderRadius: 0, // Cyberpunk: square corners
        marginBottom: 20,
        overflow: 'hidden',
    },
    editorContainerStyle: {
        minHeight: 400,
    },
    footer: {
        borderTopWidth: 1,
        paddingHorizontal: 0,
        paddingTop: 12,
        paddingBottom: 0, // Will be set dynamically with safe area insets
        zIndex: 1000,
        elevation: 10,
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