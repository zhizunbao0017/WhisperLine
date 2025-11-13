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
    Text,
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
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- 组件和 Context ---
import MoodSelector from '../components/MoodSelector';
import CompanionSelectorCarousel from '../components/CompanionSelectorCarousel';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { CompanionContext } from '../context/CompanionContext';
import { getCurrentWeather } from '../services/weatherService';
import { ensureStaticServer, getPublicUrlForFileUri } from '../services/staticServer';
import themeAnalysisService from '../services/ThemeAnalysisService';

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

const COMPANION_COLOR_PALETTE = [
    '#6C5CE7',
    '#E17055',
    '#00CEC9',
    '#0984E3',
    '#FF7675',
    '#00B894',
    '#FAB1A0',
    '#74B9FF',
    '#D63031',
    '#636EFA',
];

const getCompanionColor = (name = '') => {
    if (!name) {
        return COMPANION_COLOR_PALETTE[0];
    }
    const code = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return COMPANION_COLOR_PALETTE[code % COMPANION_COLOR_PALETTE.length];
};

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
                                borderRadius: (size * 0.7) / 2,
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
                                borderRadius: (size * 0.8) / 2,
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
                <View style={[styles.glow, { width: size + 24, height: size + 24, borderRadius: (size + 24) / 2 }]}>
                    <Image
                        source={config.source}
                        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: '#fff', backgroundColor: '#fff' }}
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
    const { colors, currentAvatar } = useContext(ThemeContext);
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
    const [isCompanionPickerVisible, setCompanionPickerVisible] = useState(false);
    const [emojiTarget, setEmojiTarget] = useState('content');
    const titleInputRef = useRef(null);
    const [titleSelection, setTitleSelection] = useState({ start: 0, end: 0 });
    const [allCompanions, setAllCompanions] = useState([]);
    const [selectedCompanionIDs, setSelectedCompanionIDs] = useState(existingCompanionIds);
    const [tempSelectedCompanionIDs, setTempSelectedCompanionIDs] = useState(existingCompanionIds);
    const [selectedThemeId, setSelectedThemeId] = useState(
        existingDiary?.themeID ?? existingDiary?.themeId ?? null
    );
    const [heroVisual, setHeroVisual] = useState({ type: 'image', source: DEFAULT_HERO_IMAGE });
    const [hasInitialPrimaryApplied, setHasInitialPrimaryApplied] = useState(false);

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
        title: (existingDiary?.title || '').trim(),
        content: processedInitialContent || '',
        mood: existingDiary?.mood || null,
        weather: normalizeWeather(existingDiary?.weather),
        companionIDs: existingCompanionIds,
        themeID: existingDiary?.themeID ?? existingDiary?.themeId ?? null,
    }), [existingDiary, processedInitialContent, existingCompanionIds]);

    const [initialSnapshot, setInitialSnapshot] = useState(baselineSnapshot);

    useEffect(() => {
        setInitialSnapshot(baselineSnapshot);
    }, [baselineSnapshot]);
    
    const currentSnapshot = useMemo(() => JSON.stringify({
        title: title.trim(),
        content: contentHtml || '',
        mood: selectedMood || null,
        weather: normalizeWeather(weather),
        companionIDs: selectedCompanionIDs,
        themeID: selectedThemeId ?? null,
    }), [title, contentHtml, selectedMood, weather, selectedCompanionIDs, selectedThemeId]);

    const hasUnsavedChanges = currentSnapshot !== initialSnapshot;
    const [preventRemove, setPreventRemove] = useState(false);
    const plainTextContent = useMemo(() => extractTextFromHTML(contentHtml), [contentHtml]);
    const canSubmit = Boolean(selectedMood && title.trim() && plainTextContent.trim());
    const saveEnabled = canSubmit && hasUnsavedChanges;

    useEffect(() => {
        setIsEditMode(!!existingDiary);
        setTitle(existingDiary?.title || '');
        setSelectedMood(existingDiary?.mood || null);
        setWeather(existingDiary?.weather || null);
        setSelectedCompanionIDs(existingCompanionIds);
        setTempSelectedCompanionIDs(existingCompanionIds);
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
                            target.style.borderRadius = '8px';
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
            if (!canSubmit) {
                Alert.alert('Incomplete Entry', 'Please select a mood and fill in the title and content.');
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
            
            console.log('Saving content with file URIs (production-ready format)');

            const diaryData = {
                title,
                content: contentToSave, // Use processed content with file URIs
                mood: selectedMood,
                weather,
                companionIDs: selectedCompanionIDs,
                themeID: selectedThemeId ?? null,
            };

            if (isEditMode) {
                await updateDiary({ ...diaryData, id: existingDiary.id, createdAt: existingDiary.createdAt });
                await themeAnalysisService.assignEntryToTheme(
                    existingDiary.id,
                    selectedThemeId ?? null,
                    { ...diaryData, id: existingDiary.id }
                );
            } else {
                const createdAtOverride = entryDateParam ? new Date(entryDateParam).toISOString() : undefined;
                const createdEntry = await addDiary({ ...diaryData, ...(createdAtOverride && { createdAt: createdAtOverride }) });
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
            router.back(); // Return directly after saving
        } catch (error) {
            console.error('Error saving diary:', error);
            Alert.alert('Error', `Failed to save diary: ${error.message || 'Unknown error'}`);
        }
    }, [
        addDiary,
        contentHtml,
        currentSnapshot,
        canSubmit,
        entryDateParam,
        existingDiary,
        isEditMode,
        router,
        selectedMood,
        title,
        updateDiary,
        weather,
        selectedCompanionIDs,
        selectedThemeId,
    ]);

    // --- Weather logic ---
    const handleGetWeather = async () => {
        setIsFetchingWeather(true);
        const weatherData = await getCurrentWeather();
        if (weatherData) setWeather(weatherData);
        setIsFetchingWeather(false);
    };

    const companionLookup = useMemo(() => {
        const map = new Map();
        allCompanions.forEach((companion) => {
            map.set(String(companion.id), companion);
        });
        return map;
    }, [allCompanions]);

    useEffect(() => {
        setSelectedCompanionIDs((prev) => prev.filter((id) => companionLookup.has(id)));
        setTempSelectedCompanionIDs((prev) => prev.filter((id) => companionLookup.has(id)));
    }, [companionLookup]);

    const toggleTempCompanion = (id) => {
        setTempSelectedCompanionIDs((prev) => {
            if (prev.includes(id)) {
                return prev.filter((existingId) => existingId !== id);
            }
            return [...prev, id];
        });
    };

    const handleConfirmCompanions = () => {
        const selected = allCompanions.filter((companion) =>
            tempSelectedCompanionIDs.includes(String(companion.id))
        );
        handleCompanionSelectionChange(selected);
        setCompanionPickerVisible(false);
    };

    const handleCancelCompanions = () => {
        setTempSelectedCompanionIDs(selectedCompanionIDs);
        setCompanionPickerVisible(false);
    };

    const handleCompanionSelectionChange = useCallback(
        (selectedCompanions = []) => {
            const ids = selectedCompanions.map((companion) => String(companion.id));
            setSelectedCompanionIDs(ids);

            if (selectedCompanions.length === 1) {
                const avatar = selectedCompanions[0]?.avatarIdentifier;
                if (avatar) {
                    setHeroVisual({
                        type: 'image',
                        source: resolveImageSource(avatar),
                    });
                } else {
                    applyDefaultHero();
                }
            } else if (selectedCompanions.length > 1) {
                const primaryCompanion = selectedCompanions[0];
                const secondaryCompanion = selectedCompanions[1] || selectedCompanions[0];

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
        },
        [applyDefaultHero, resolveImageSource]
    );

    useEffect(() => {
        if (isEditMode || hasInitialPrimaryApplied) {
            return;
        }
        if (companionsLoading) {
            return;
        }

        let isMounted = true;
        const initializePrimaryCompanion = async () => {
            try {
                const storedPrimary = await AsyncStorage.getItem('primaryCompanionID');
                if (!isMounted) {
                    return;
                }

                if (!storedPrimary || storedPrimary === 'null' || storedPrimary === 'undefined') {
                    applyDefaultHero();
                    setHasInitialPrimaryApplied(true);
                    return;
                }

                const matched = allCompanions.find(
                    (item) => String(item.id) === String(storedPrimary)
                );

                if (!matched) {
                    applyDefaultHero();
                    await AsyncStorage.removeItem('primaryCompanionID');
                }
            } catch (error) {
                console.warn('Failed to load primary companion for editor', error);
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
        hasInitialPrimaryApplied,
        isEditMode,
    ]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerBackTitleVisible: false,
            headerTitle: isEditMode ? 'Edit Entry' : 'New Entry',
            headerRight: () => (
                    <TouchableOpacity
                    onPress={handleSave}
                    disabled={!saveEnabled}
                    style={styles.headerSaveButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Text style={[styles.headerSaveText, { color: colors.primary, opacity: saveEnabled ? 1 : 0.4 }]}>
                        {isEditMode ? 'Save' : 'Done'}
                    </Text>
                    </TouchableOpacity>
            ),
        });
    }, [navigation, isEditMode, handleSave, colors.primary, saveEnabled]);

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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={90}
            >
                {/* --- 1. Scrollable content area --- */}
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
                    <View style={styles.avatarSection}>
                        <CompanionAvatarView size={150} visual={heroVisual} />
                    </View>
                    <MoodSelector onSelectMood={setSelectedMood} selectedMood={selectedMood} />
                    <View style={[styles.weatherContainer, { backgroundColor: colors.card }]}>
                        {isFetchingWeather ? <ActivityIndicator /> : weather ? (
                            <Text style={{ color: colors.text }}>
                                {`Weather: ${weather.city}, ${weather.temperature}°C, ${weather.description}`}
                            </Text>
                        ) : (
                            <Button title="Add Current Weather" onPress={handleGetWeather} />
                        )}
                    </View>
                    <View style={styles.carouselWrapper}>
                        <View style={styles.carouselHeader}>
                            <Ionicons name="people-outline" size={18} color={colors.text} style={{ marginRight: 8 }} />
                            <Text style={[styles.carouselTitle, { color: colors.text }]}>
                                Companions
                            </Text>
                        </View>
                        {allCompanions.length === 0 ? (
                            <TouchableOpacity
                                style={styles.emptyCarouselCallout}
                                onPress={() => router.push('/companions')}
                                activeOpacity={0.85}
                            >
                                <Ionicons name="sparkles-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                                <Text style={{ color: colors.primary, fontWeight: '500' }}>
                                    Add your first companion
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <CompanionSelectorCarousel
                                allCompanions={allCompanions}
                                selectedIDs={selectedCompanionIDs}
                                onSelectionChange={handleCompanionSelectionChange}
                            />
                        )}
                    </View>
                    <TextInput
                        ref={titleInputRef}
                        style={[styles.input, styles.titleInputStandalone, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Title"
                        placeholderTextColor="gray"
                        onFocus={() => {
                            setEmojiTarget('title');
                            const cursor = title.length;
                            setTitleSelection({ start: cursor, end: cursor });
                        }}
                        onSelectionChange={(event) => setTitleSelection(event.nativeEvent.selection)}
                    />
                    <RichEditor
                            ref={editorRef}
                        initialContentHTML={contentHtml}
                            onChange={setContentHtml}
                        onFocus={() => setEmojiTarget('content')}
                        onMessage={handleEditorMessage}
                        style={[styles.editor, { borderColor: colors.border, backgroundColor: colors.card }]}
                        editorStyle={{
                            backgroundColor: colors.card,
                            color: colors.text,
                            placeholderColor: 'gray',
                            contentCSSText: `
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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
                                            img.style.borderRadius = '8px';
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
                            placeholder="How was your day?"
                        useContainer={true}
                        initialHeight={400}
                        containerStyle={styles.editorContainerStyle}
                        />
                </ScrollView>
                
                {/* --- 2. Fixed footer action area --- */}
                <View style={[
                    styles.footer, 
                    { 
                        backgroundColor: colors.card, 
                        borderTopColor: colors.border,
                        paddingBottom: Math.max(insets.bottom, 16), // Use safe area insets or at least 16px
                    }
                ]}>
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
                                <Ionicons name="happy-outline" size={24} color={tintColor || colors.text} />
                            ),
                        }}
                        onPressAddImage={handleInsertImage}
                        insertEmoji={handleInsertEmoji}
                        iconTint={colors.text}
                        selectedIconTint={colors.primary}
                        style={styles.toolbar}
                    />
                    <TouchableOpacity 
                        style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saveEnabled ? 1 : 0.4 }]}
                            onPress={handleSave}
                        activeOpacity={0.8}
                        disabled={!saveEnabled}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Text style={styles.saveButtonText}>
                            {isEditMode ? "Save Changes" : "Save Diary"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Modal
                    animationType="slide"
                    transparent
                    visible={isCompanionPickerVisible}
                    onRequestClose={handleCancelCompanions}
                >
                    <TouchableWithoutFeedback onPress={handleCancelCompanions}>
                        <View style={styles.companionModalOverlay}>
                            <TouchableWithoutFeedback onPress={() => {}}>
                                <View style={[styles.companionModalCard, { backgroundColor: colors.card }]}>
                                    <Text style={[styles.companionModalTitle, { color: colors.text }]}>
                                        Link companions
                                    </Text>
                                    {allCompanions.length === 0 ? (
                                        <View style={styles.companionModalEmpty}>
                                            <Text style={[styles.companionModalEmptyText, { color: colors.text }]}>
                                                You haven&apos;t created any companions yet.
                                            </Text>
                                            <TouchableOpacity
                                                style={[styles.companionModalCreateButton, { backgroundColor: colors.primary }]}
                                                onPress={() => {
                                                    handleCancelCompanions();
                                                    router.push('/companions');
                                                }}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.companionModalCreateButtonText}>Create companion</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <ScrollView
                                            style={styles.companionPickerList}
                                            contentContainerStyle={{ paddingBottom: 8 }}
                                        >
                                        {allCompanions.map((companion) => {
                                                const isSelected = tempSelectedCompanionIDs.includes(companion.id);
                                                const initials = companion.name
                                                    ? companion.name
                                                          .split(' ')
                                                          .map((part) => part[0])
                                                          .join('')
                                                          .slice(0, 2)
                                                          .toUpperCase()
                                                    : '?';
                                                return (
                                                    <TouchableOpacity
                                                        key={companion.id}
                                                        style={[
                                                            styles.companionPickerRow,
                                                            {
                                                                borderColor: colors.border,
                                                                backgroundColor: isSelected ? colors.background : colors.card,
                                                            },
                                                        ]}
                                                        onPress={() => toggleTempCompanion(companion.id)}
                                                        activeOpacity={0.85}
                                                    >
                                                        {companion.avatarIdentifier ? (
                                                            <Image
                                                                source={{ uri: companion.avatarIdentifier }}
                                                                style={styles.companionPickerAvatar}
                                                            />
                                                        ) : (
                                                            <View
                                                                style={[
                                                                    styles.companionPickerPlaceholder,
                                                                    { backgroundColor: getCompanionColor(companion.name) },
                                                                ]}
                                                            >
                                                                <Text style={styles.companionPickerPlaceholderText}>{initials}</Text>
                                                            </View>
                                                        )}
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[styles.companionPickerName, { color: colors.text }]} numberOfLines={1}>
                                                                {companion.name}
                                                            </Text>
                                                            <Text style={[styles.companionPickerMeta, { color: colors.text }]}>
                                                                Added {new Date(companion.createdAt).toLocaleDateString()}
                                                            </Text>
                                                        </View>
                                                        <Ionicons
                                                            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                                                            size={22}
                                                            color={isSelected ? colors.primary : colors.border}
                                                        />
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    )}
                                    <View style={styles.companionModalActions}>
                                        <TouchableOpacity
                                            style={[styles.secondaryButton, { borderColor: colors.border }]}
                                            onPress={handleCancelCompanions}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Cancel</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.primaryButton,
                                                {
                                                    backgroundColor: colors.primary,
                                                },
                                            ]}
                                            onPress={handleConfirmCompanions}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.primaryButtonText}>Done</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableWithoutFeedback>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                <Modal
                    animationType="slide"
                    transparent
                    visible={isEmojiPickerVisible}
                    onRequestClose={handleCloseEmojiPicker}
                >
                    <TouchableWithoutFeedback onPress={handleCloseEmojiPicker}>
                        <View style={styles.emojiOverlay}>
                            <TouchableWithoutFeedback onPress={() => {}}>
                                <View style={[styles.emojiPicker, { backgroundColor: colors.card }]}>
                                    <View style={styles.emojiHeader}>
                                        <Text style={[styles.emojiTitle, { color: colors.text }]}>
                                            Choose an emoji
                                        </Text>
                                        <TouchableOpacity
                                            onPress={handleCloseEmojiPicker}
                                            style={styles.emojiCloseButton}
                                        >
                                            <Text style={[styles.emojiCloseText, { color: colors.primary }]}>
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
    scrollContent: { padding: 20, paddingBottom: 40 },
    avatarSection: { 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 18 
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
        borderColor: '#fff',
        backgroundColor: '#fff',
    },
    stackedPrimary: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: '#fff',
    },
    weatherContainer: { alignItems: 'center', padding: 15, marginBottom: 20, borderRadius: 8 },
    titleInputStandalone: {
        marginBottom: 20,
    },
    carouselWrapper: {
        marginBottom: 20,
    },
    carouselHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    carouselTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    emptyCarouselCallout: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#D0D3FF',
        backgroundColor: 'rgba(74,108,247,0.08)',
    },
    companionEmptyText: {
        marginTop: 12,
        fontSize: 13,
        opacity: 0.6,
    },
    input: { borderWidth: 1, borderRadius: 8, padding: 15, fontSize: 16, marginBottom: 20 },
    editor: { 
        width: '100%',
        minHeight: 400, 
        borderWidth: 1, 
        borderRadius: 8, 
        marginBottom: 20,
        overflow: 'hidden',
    },
    editorContainerStyle: {
        minHeight: 400,
    },
    footer: {
        borderTopWidth: 1,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 16, // Base bottom padding, will be overridden by safe area insets
        zIndex: 1000, // Ensure footer is on top
        elevation: 10, // Android shadow level
    },
    toolbar: {
        marginBottom: 12,
    },
    saveButton: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1001, // Ensure button is on top
        minHeight: 48, // Ensure sufficient touch area
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    companionModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        padding: 24,
    },
    companionModalCard: {
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    companionModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
    },
    companionModalEmpty: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    companionModalEmptyText: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 12,
    },
    companionModalCreateButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    companionModalCreateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    companionPickerList: {
        maxHeight: 320,
        marginBottom: 16,
    },
    companionPickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
    },
    companionPickerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: 12,
    },
    companionPickerPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    companionPickerPlaceholderText: {
        color: '#fff',
        fontWeight: '600',
    },
    companionPickerName: {
        fontSize: 16,
        fontWeight: '600',
    },
    companionPickerMeta: {
        marginTop: 2,
        fontSize: 12,
        opacity: 0.7,
    },
    companionModalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    secondaryButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    primaryButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        marginLeft: 12,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    headerSaveButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    headerSaveText: {
        fontSize: 16,
        fontWeight: '600',
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
        borderRadius: 12,
        backgroundColor: 'rgba(120,120,120,0.12)',
    },
    emojiText: {
        fontSize: 28,
    },
});

export default AddEditDiaryScreen;