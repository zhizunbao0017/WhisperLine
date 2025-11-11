import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
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
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- 核心依赖 ---
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { Ionicons } from '@expo/vector-icons';

// --- 组件和 Context ---
import MoodSelector from '../components/MoodSelector';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { getCurrentWeather } from '../services/weatherService';
import { ensureStaticServer, getPublicUrlForFileUri } from '../services/staticServer';


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

// Companion avatar component
const CompanionAvatarView = ({ size = 80 }) => {
    const { currentAvatar } = useContext(ThemeContext);
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
    if (currentAvatar.type === 'custom' && currentAvatar.image) {
        return (
            <View style={[styles.avatarWrapper, { width: size, height: size, alignItems: 'center', justifyContent: 'center' }]}>
                <View style={[styles.glow, { width: size + 24, height: size + 24, borderRadius: (size + 24) / 2, backgroundColor: currentAvatar.glowColor || '#87CEEB' }]}>
                    <Image 
                        source={{ uri: currentAvatar.image }} 
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
    const params = useLocalSearchParams();
    const existingDiary = useMemo(() => {
        return params.diary ? JSON.parse(params.diary) : null;
    }, [params.diary]);

    // --- Hooks and Context ---
    const { addDiary, updateDiary } = useContext(DiaryContext);
    const { colors } = useContext(ThemeContext);
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets(); // Get safe area insets
    const editorRef = useRef(null); // Create ref for rich text editor

    // --- State ---
    const [isEditMode, setIsEditMode] = useState(!!existingDiary);
    const [title, setTitle] = useState(existingDiary?.title || '');
 
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
        : '';

    const processedInitialContent = useMemo(() => (
        initialContent ? processContentForEditor(initialContent) : ''
    ), [initialContent]);

    const [contentHtml, setContentHtml] = useState(processedInitialContent);
    const initialContentRef = useRef(processedInitialContent);
    const hasRemappedInitialHtml = useRef(false);
    const [selectedMood, setSelectedMood] = useState(existingDiary?.mood || null);
    const [weather, setWeather] = useState(existingDiary?.weather || null);
    const [isFetchingWeather, setIsFetchingWeather] = useState(false);
    const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
 
    useEffect(() => {
        setIsEditMode(!!existingDiary);
        setTitle(existingDiary?.title || '');
        setSelectedMood(existingDiary?.mood || null);
        setWeather(existingDiary?.weather || null);
    }, [existingDiary]);

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
                    try {
                        finalUri = await FileSystem.makeContentUriAsync(destinationFile.uri);
                    } catch (err) {
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
                            const images = document.querySelectorAll('img');
                            const target = images[images.length - 1];
                            if (!target) { return; }
                            target.setAttribute('data-file-uri', ${fileAttrValue});
                            target.style.maxWidth = '100%';
                            target.style.height = 'auto';
                            target.style.display = 'block';
                            target.style.margin = '12px 0';
                            target.style.borderRadius = '8px';
                            const scrollToBottom = () => {
                                const editorEl = document.querySelector('.pell-content');
                                if (editorEl) {
                                    editorEl.scrollTop = editorEl.scrollHeight;
                                }
                                window.scrollTo(0, document.body.scrollHeight || document.documentElement.scrollHeight);
                            };
                            setTimeout(scrollToBottom, 50);
                            setTimeout(scrollToBottom, 200);
                        })();
                    `);
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
        requestAnimationFrame(() => {
            if (editorRef.current?.focusContentEditor) {
                editorRef.current.focusContentEditor();
            }
            editorRef.current?.insertText(emoji);
        });
    };

    const handleCloseEmojiPicker = () => {
        setEmojiPickerVisible(false);
    };

    // --- Save logic ---
    const handleSave = async () => {
        try {
            const plainTextContent = extractTextFromHTML(contentHtml);

            if (!title.trim() || !plainTextContent.trim() || !selectedMood) {
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
            };

            if (isEditMode) {
                updateDiary({ ...diaryData, id: existingDiary.id, createdAt: existingDiary.createdAt });
            } else {
                const dateParam = params?.date;
                const createdAtOverride = dateParam ? new Date(dateParam).toISOString() : undefined;
                addDiary({ ...diaryData, ...(createdAtOverride && { createdAt: createdAtOverride }) });
            }
            
            router.back(); // Return directly after saving
        } catch (error) {
            console.error('Error saving diary:', error);
            Alert.alert('Error', `Failed to save diary: ${error.message || 'Unknown error'}`);
        }
    };

    // --- Weather logic ---
    const handleGetWeather = async () => {
        setIsFetchingWeather(true);
        const weatherData = await getCurrentWeather();
        if (weatherData) setWeather(weatherData);
        setIsFetchingWeather(false);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={90}
            >
                {/* --- 1. Scrollable content area --- */}
                <ScrollView 
                    style={styles.scrollContainer} 
                    contentContainerStyle={styles.scrollContent} 
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                    scrollEnabled={true}
                    bounces={true}
                >
                    <View style={styles.avatarSection}>
                        <CompanionAvatarView size={150} />
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
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Title"
                        placeholderTextColor="gray"
                    />
                    <RichEditor
                        ref={editorRef}
                        initialContentHTML={contentHtml}
                        onChange={setContentHtml}
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
                        // Inject JavaScript to fix local file image display in WebView
                        injectedJavaScript={`
                            (function() {
                                // Fix images after page loads
                                function fixImages() {
                                    const images = document.querySelectorAll('img');
                                    console.log('WebView: Found', images.length, 'images to fix');
                                    images.forEach(function(img, index) {
                                        const src = img.getAttribute('src');
                                        const dataFileUri = img.getAttribute('data-file-uri');
                                        console.log('WebView: Image', index, 'src:', src, 'data-file-uri:', dataFileUri);
                                        if (src && (src.startsWith('file://') || src.startsWith('/') || src.startsWith('content://'))) {
                                            // Ensure image path is correct
                                            img.src = src;
                                            img.style.maxWidth = '100%';
                                            img.style.width = '100%';
                                            img.style.height = 'auto';
                                            img.style.minHeight = '200px';
                                            img.style.margin = '10px 0';
                                            img.style.display = 'block';
                                            img.style.borderRadius = '8px';
                                            img.style.backgroundColor = '#f5f5f5';
                                            
                                            // Add error and load handlers for debugging
                                            img.onerror = function() {
                                                console.error('WebView: Image load error:', this.src);
                                            };
                                            img.onload = function() {
                                                console.log('WebView: Image loaded successfully:', this.src);
                                                console.log('WebView: Image dimensions:', this.naturalWidth, 'x', this.naturalHeight);
                                            };
                                        }
                                    });
                                }
                                // Execute immediately
                                fixImages();
                                // Listen for content changes
                                const observer = new MutationObserver(fixImages);
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
                        style={[styles.saveButton, { backgroundColor: colors.primary }]}
                        onPress={handleSave}
                        activeOpacity={0.8}
                        disabled={false}
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
        elevation: 12 
    },
    weatherContainer: { alignItems: 'center', padding: 15, marginBottom: 20, borderRadius: 8 },
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