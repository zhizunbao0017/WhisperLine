import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { ThemedText as Text } from '../components/ThemedText';
import { getCurrentWeather } from '../services/weatherService';
import { ensureStaticServer, getPublicUrlForFileUri } from '../services/staticServer';
import themeAnalysisService from '../services/ThemeAnalysisService';
import { useThemeStyles } from '@/hooks/useThemeStyles';

const DEFAULT_HERO_IMAGE = require('../assets/images/ai_avatar.png');


// Helper function to extract plain text from HTML
const extractTextFromHTML = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '');
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
const CompanionAvatarView = ({ size = 80, visual }) => {
    const config = visual || { type: 'image', source: DEFAULT_HERO_IMAGE };

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
        return (
            <View style={[styles.avatarWrapper, { width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}>
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

    return null;
};

const AddEditDiaryScreen = () => {
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const entryDateParam = useMemo(() => {
        const raw = params?.date;
        if (!raw) return undefined;
        return Array.isArray(raw) ? raw[0] : raw;
    }, [params]);
    const existingDiary = useMemo(() => {
        return params.diary ? JSON.parse(params.diary) : null;
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
    const { addDiary, updateDiary } = useContext(DiaryContext);
    const companionContext = useContext(CompanionContext);
    const companionsLoading = companionContext?.isLoading;
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

    // --- State ---
    const [isEditMode, setIsEditMode] = useState(!!existingDiary);
    const [title, setTitle] = useState(
        existingDiary?.title ||
            (intentDraft?.text ? intentDraft.text.split('\n')[0].slice(0, 60) : '')
    );
 
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
    const initialContent = existingDiary
        ? (existingDiary.content || existingDiary.contentHTML || '')
        : intentDraft?.contentHtml || '';

    const processedInitialContent = useMemo(() => (
        initialContent ? processContentForEditor(initialContent) : ''
    ), [initialContent]);

    const [contentHtml, setContentHtml] = useState(processedInitialContent);
    const initialContentRef = useRef(processedInitialContent);
    const hasRemappedInitialHtml = useRef(false);
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
    const [selectedThemeId, setSelectedThemeId] = useState(
        existingDiary?.themeID ?? existingDiary?.themeId ?? null
    );
    const [heroVisual, setHeroVisual] = useState({ type: 'image', source: DEFAULT_HERO_IMAGE });
    const [hasInitialPrimaryApplied, setHasInitialPrimaryApplied] = useState(false);
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
    const effectiveTitle = useMemo(() => {
        if (isChildTheme || isCyberpunkTheme) {
            return deriveTitleFromText(plainTextContent);
        }
        return title.trim();
    }, [isChildTheme, isCyberpunkTheme, deriveTitleFromText, plainTextContent, title]);

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

    const applyDefaultHero = useCallback(() => {
        if (currentAvatar?.type === 'custom' && currentAvatar.image) {
            setHeroVisual({
                type: 'image',
                source: resolveImageSource(currentAvatar.image),
            });
        } else if (currentAvatar?.type === 'system' && currentAvatar.source) {
            setHeroVisual({
                type: 'lottie',
                source: currentAvatar.source,
            });
        } else {
            setHeroVisual({ type: 'image', source: DEFAULT_HERO_IMAGE });
        }
    }, [currentAvatar, resolveImageSource]);

    const baselineSnapshot = useMemo(() => JSON.stringify({
        title: isChildTheme
            ? deriveTitleFromText(processedInitialPlainText)
            : (existingDiary?.title || '').trim(),
        content: processedInitialContent || '',
        mood: existingDiary?.mood || null,
        weather: normalizeWeather(existingDiary?.weather),
        companionIDs: existingCompanionIds,
        themeID: existingDiary?.themeID ?? existingDiary?.themeId ?? null,
    }), [
        deriveTitleFromText,
        existingDiary,
        existingCompanionIds,
        isChildTheme,
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
        // Child and Cyberpunk themes don't require title
        if (!isChildTheme && !isCyberpunkTheme && !title.trim()) {
            return false;
        }
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

    useEffect(() => {
        if (companionContext?.companions) {
            setAllCompanions(companionContext.companions);
        }
    }, [companionContext?.companions]);

    // Update hero visual based on selected companions
    useEffect(() => {
        const selectedCompanionsData = selectedCompanionIDs
            .map((id) => allCompanions.find((item) => String(item.id) === String(id)))
            .filter(Boolean);

        if (selectedCompanionsData.length === 1) {
            const companion = selectedCompanionsData[0];
            if (companion?.avatarIdentifier) {
                setHeroVisual({
                    type: 'image',
                    source: resolveImageSource(companion.avatarIdentifier),
                });
            } else {
                applyDefaultHero();
            }
        } else if (selectedCompanionsData.length > 1) {
            const primaryCompanion = selectedCompanionsData[0];
            const secondaryCompanion = selectedCompanionsData[1] || selectedCompanionsData[0];

            const primarySource = resolveImageSource(primaryCompanion?.avatarIdentifier);
            const secondarySource = resolveImageSource(secondaryCompanion?.avatarIdentifier);

            setHeroVisual({
                type: 'stacked',
                primary: { source: primarySource },
                secondary: { source: secondarySource },
            });
        } else {
            applyDefaultHero();
        }
    }, [allCompanions, selectedCompanionIDs, applyDefaultHero, resolveImageSource]);

    useEffect(() => {
        setContentHtml(processedInitialContent);
        initialContentRef.current = processedInitialContent;
        hasRemappedInitialHtml.current = false;
    }, [processedInitialContent]);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            await ensureStaticServer();
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
                    const publicUri = await getPublicUrlForFileUri(destinationFile.uri);
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
        try {
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
                const missingTitle = !isChildTheme && !isCyberpunkTheme && !title.trim();
                const missingContent = plainTextContent.trim().length === 0;
                let message = 'Please select a mood and add your entry.';
                if (missingTitle && missingContent) {
                    message = 'Please select a mood, add a title, and write your entry.';
                } else if (missingTitle) {
                    message = 'Please select a mood and add a title.';
                } else if (missingContent) {
                    message = 'Please select a mood and write your entry.';
                }
                Alert.alert('Incomplete Entry', message);
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
            
            console.log('Saving content with file URIs (production-ready format)', {
                title: effectiveTitle,
                contentLength: contentToSave.length,
                mood: selectedMood,
                companionIDs: selectedCompanionIDs,
                themeID: selectedThemeId,
            });

            const diaryData = {
                title: effectiveTitle,
                content: contentToSave, // Use processed content with file URIs
                mood: selectedMood,
                weather,
                companionIDs: selectedCompanionIDs,
                themeID: selectedThemeId ?? null,
            };

            if (isEditMode) {
                console.log('Updating diary entry:', existingDiary.id);
                await updateDiary({ ...diaryData, id: existingDiary.id, createdAt: existingDiary.createdAt });
                await themeAnalysisService.assignEntryToTheme(
                    existingDiary.id,
                    selectedThemeId ?? null,
                    { ...diaryData, id: existingDiary.id }
                );
                console.log('Diary entry updated successfully');
            } else {
                const createdAtOverride = entryDateParam ? new Date(entryDateParam).toISOString() : undefined;
                console.log('Adding new diary entry', { createdAtOverride });
                const createdEntry = await addDiary({ ...diaryData, ...(createdAtOverride && { createdAt: createdAtOverride }) });
                console.log('Diary entry created:', createdEntry?.id);
                if (createdEntry?.id) {
                    await themeAnalysisService.assignEntryToTheme(
                        createdEntry.id,
                        selectedThemeId ?? null,
                        createdEntry
                    );
                }
            }
            setInitialSnapshot(currentSnapshot);
            setPreventRemove(false);
            console.log('Save completed, navigating back');
            router.back(); // Return directly after saving
        } catch (error) {
            console.error('Error saving diary:', error);
            Alert.alert('Error', `Failed to save diary: ${error.message || 'Unknown error'}`);
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
            return;
        }

        if (isEditMode) {
            // In edit mode, use existing diary companions
            setSelectedCompanionIDs(existingCompanionIds);
            setHasInitialPrimaryApplied(true);
            return;
        }

        if (hasInitialPrimaryApplied) {
            return;
        }

        let isMounted = true;
        const initializePrimaryCompanion = async () => {
            try {
                // For new entries, use primary companion if set
                const storedPrimary = await AsyncStorage.getItem('primaryCompanionID');
                if (!isMounted) {
                    return;
                }

                if (!storedPrimary || storedPrimary === 'null' || storedPrimary === 'undefined') {
                    // No primary companion set, use empty array
                    setSelectedCompanionIDs([]);
                    applyDefaultHero();
                    setHasInitialPrimaryApplied(true);
                    return;
                }

                const matched = allCompanions.find(
                    (item) => String(item.id) === String(storedPrimary)
                );

                if (matched) {
                    // Set primary companion as selected
                    setSelectedCompanionIDs([String(matched.id)]);
                } else {
                    // Primary companion not found, clear it
                    setSelectedCompanionIDs([]);
                    await AsyncStorage.removeItem('primaryCompanionID');
                    applyDefaultHero();
                }
            } catch (error) {
                console.warn('Failed to load primary companion for editor', error);
                setSelectedCompanionIDs([]);
                applyDefaultHero();
            } finally {
                if (isMounted) {
                    setHasInitialPrimaryApplied(true);
                }
            }
        };

        initializePrimaryCompanion();

        return () => {
            isMounted = false;
        };
    }, [
        allCompanions,
        applyDefaultHero,
        companionsLoading,
        existingCompanionIds,
        hasInitialPrimaryApplied,
        isEditMode,
    ]);

    useLayoutEffect(() => {
        const headerTitle = isChildTheme || isCyberpunkTheme ? '' : (isEditMode ? 'Edit Entry' : 'New Entry');

        const childHeaderLeft = () => (
            <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.childHeaderBack}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Ionicons name="chevron-back" size={20} color={isCyberpunkTheme ? '#39FF14' : '#7090AC'} />
            </TouchableOpacity>
        );

        navigation.setOptions({
            headerBackTitleVisible: false,
            headerTitle,
            headerTransparent: isChildTheme,
            headerTintColor: isChildTheme ? '#7090AC' : (isCyberpunkTheme ? '#39FF14' : undefined),
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
            headerLeft: isChildTheme || isCyberpunkTheme ? childHeaderLeft : undefined,
            headerRight: () => (
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={!saveEnabled}
                    style={[
                        styles.headerSaveButton,
                        isChildTheme && {
                            backgroundColor: '#FFF6E4',
                            borderRadius: isCyberpunkTheme ? 0 : 30, // Cyberpunk: square corners
                            paddingHorizontal: 22,
                            paddingVertical: 6,
                            borderWidth: 1,
                            borderColor: '#E8CDAF',
                            opacity: saveEnabled ? 1 : 0.55,
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
                                    opacity: saveEnabled ? 1 : 0.4,
                                },
                        ]}
                    >
                        {isEditMode ? 'Save' : 'Done'}
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
                        <CompanionAvatarView size={150} visual={heroVisual} />
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
                    {!isChildTheme && !isCyberpunkTheme && (
                        <TextInput
                            ref={titleInputRef}
                            style={[
                                styles.input,
                                styles.titleInputStandalone,
                                {
                                    backgroundColor: themeStyles.card,
                                    color: themeStyles.text,
                                    borderColor: themeStyles.border,
                                    borderRadius: isCyberpunkTheme ? 0 : themeStyles.inputRadius, // Cyberpunk: square corners
                                    fontFamily: headingFontFamily,
                                },
                            ]}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Title"
                            placeholderTextColor={themeStyles.inputPlaceholder}
                            onFocus={() => {
                                setEmojiTarget('title');
                                const cursor = title.length;
                                setTitleSelection({ start: cursor, end: cursor });
                            }}
                            onSelectionChange={(event) => setTitleSelection(event.nativeEvent.selection)}
                        />
                    )}
                    <RichEditor
                            ref={editorRef}
                        initialContentHTML={contentHtml}
                            onChange={setContentHtml}
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
                            // Add CSS to ensure images display correctly
                            cssText: `
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
                        paddingHorizontal: 16,
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
                            iconGap={0}
                            unselectedButtonStyle={isCyberpunkTheme ? {
                                backgroundColor: 'transparent',
                            } : undefined}
                            selectedButtonStyle={isCyberpunkTheme ? {
                                backgroundColor: 'transparent',
                            } : undefined}
                            itemStyle={isCyberpunkTheme ? (cyberpunkToolbarItemStyle || {
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 44,
                                height: 44,
                                backgroundColor: 'transparent',
                            }) : {
                                flex: 1,
                                minWidth: 0,
                                height: 50,
                                minHeight: 50,
                                maxHeight: 50,
                                justifyContent: 'center',
                                alignItems: 'center',
                                paddingVertical: 0,
                                paddingHorizontal: 0,
                                marginHorizontal: 0,
                                marginVertical: 0,
                            }}
                            flatContainerStyle={isCyberpunkTheme ? {
                                flexDirection: 'row',
                                minHeight: 50,
                                paddingHorizontal: 0,
                                paddingVertical: 0,
                                backgroundColor: 'transparent',
                            } : {
                                width: '100%',
                                height: 50,
                                minHeight: 50,
                                maxHeight: 50,
                                paddingHorizontal: 0,
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
                        disabled={!saveEnabled}
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
                                        opacity: saveEnabled ? 1 : 0.4,
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
                                    {isEditMode ? "Save Changes" : "Save Diary"}
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
                                        opacity: saveEnabled ? 1 : 0.4,
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
                                    {isEditMode ? "Save Changes" : "Save Diary"}
                                </Text>
                            </View>
                        ) : (
                            <View
                                style={[
                                    styles.saveButtonContent,
                                    {
                                        backgroundColor: themeStyles.primary,
                                        borderRadius: isCyberpunkTheme ? 0 : themeStyles.buttonRadius, // Cyberpunk: square corners
                                        opacity: saveEnabled ? 1 : 0.4,
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
                                    {isEditMode ? "Save Changes" : "Save Diary"}
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