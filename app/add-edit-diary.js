import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- 核心依赖 ---
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';

// --- 组件和 Context ---
import MoodSelector from '../components/MoodSelector';
import { DiaryContext } from '../context/DiaryContext';
import { ThemeContext } from '../context/ThemeContext';
import { getCurrentWeather } from '../services/weatherService';


// Helper function to extract plain text from HTML
const extractTextFromHTML = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>?/gm, '');
};

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
        // Convert file:// URI to WebView-accessible format
        // WebView requires special handling to access local files
        return html.replace(/src="file:\/\/([^"]+)"/g, (match, path) => {
            // Keep original URI but ensure correct format
            return `src="file://${path}"`;
        });
    };
    
    const [contentHtml, setContentHtml] = useState(
        existingDiary ? processContentForEditor(existingDiary.content || existingDiary.contentHTML || '') : ''
    );
    const [selectedMood, setSelectedMood] = useState(existingDiary?.mood || null);
    const [weather, setWeather] = useState(existingDiary?.weather || null);
    const [isFetchingWeather, setIsFetchingWeather] = useState(false);
    
    // Fix image paths after editor loads to ensure local files can be displayed
    useEffect(() => {
        if (editorRef.current && contentHtml && isEditMode) {
            // Delay execution to ensure editor is fully loaded
            const timer = setTimeout(() => {
                try {
                    // Inject JavaScript to fix image paths
                    const script = `
                        (function() {
                            function fixImages() {
                                const images = document.querySelectorAll('img');
                                images.forEach(function(img) {
                                    const src = img.getAttribute('src');
                                    if (src && (src.startsWith('file://') || src.startsWith('/'))) {
                                        // Reset src to ensure image loads
                                        const newSrc = src;
                                        if (img.src !== newSrc) {
                                            img.src = newSrc;
                                        }
                                        // Set styles
                                        img.style.maxWidth = '100%';
                                        img.style.height = 'auto';
                                        img.style.margin = '10px 0';
                                        img.style.display = 'block';
                                        img.style.borderRadius = '8px';
                                        // Add error handling
                                        img.onerror = function() {
                                            console.log('Image load error:', newSrc);
                                        };
                                    }
                                });
                            }
                            // Execute immediately
                            fixImages();
                            // Listen for DOM changes
                            if (typeof MutationObserver !== 'undefined') {
                                const observer = new MutationObserver(fixImages);
                                observer.observe(document.body, { 
                                    childList: true, 
                                    subtree: true,
                                    attributes: true,
                                    attributeFilter: ['src']
                                });
                            }
                        })();
                    `;
                    if (editorRef.current && typeof editorRef.current.injectJavaScript === 'function') {
                        editorRef.current.injectJavaScript(script);
                    }
                } catch (error) {
                    console.error('Error fixing image paths:', error);
                }
            }, 1500); // Delay 1.5 seconds to ensure editor is fully loaded
            
            return () => clearTimeout(timer);
        }
    }, [contentHtml, isEditMode]);

    // --- Image insertion logic (optimized: performance-first, supports large images) ---
    const handleInsertImage = async () => {
        try {
            // 1. Request permission
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert("Permission Required", "You need to allow access to your photos to add images.");
                return;
            }

            // 2. Open image library, don't get Base64 (optimize performance)
            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                quality: 0.8, // Balance quality and file size
                allowsEditing: false, // Disable editing for speed
                base64: false, // Don't get Base64, use file system directly
                selectionLimit: 1,
                exif: false, // Don't read EXIF data for speed
            });

            // 3. Check if user canceled
            if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
                return; // User canceled, exit silently
            }

            // 4. Safely get image data
            const asset = pickerResult.assets[0];
            if (!asset || !asset.uri) {
                return;
            }

            const sourceUri = asset.uri;

            // 5. Save image to permanent directory (using file system, not Base64)
            // 5.1. Ensure images directory exists
            const imagesDirectory = new Directory(Paths.document, 'images');
            if (!imagesDirectory.exists) {
                imagesDirectory.create({ intermediates: true });
            }

            // 5.2. Generate unique filename
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 9);
            const fileExtension = sourceUri.split('.').pop()?.split('?')[0] || 'jpg';
            const fileName = `image_${timestamp}_${random}.${fileExtension}`;
            
            // 5.3. Copy image to permanent directory
            const destinationFile = new File(imagesDirectory, fileName);
            const sourceFile = new File(sourceUri);
            sourceFile.copy(destinationFile);
            
            // 5.4. Get permanent file URI (for HTML reference)
            const permanentUri = destinationFile.uri;
            
            // 6. Insert image into editor using file URI (instead of Base64 data URI)
            if (editorRef.current) {
                // Use file:// protocol or direct file path
                // React Native WebView and react-native-render-html can both handle local file URIs
                const imgHtml = `<img src="${permanentUri}" style="max-width: 100%; height: auto; margin: 10px 0; display: block; border-radius: 8px;" />`;
                editorRef.current.insertHTML(imgHtml);
            }

        } catch (error) {
            console.error("Error picking image:", error);
            Alert.alert("Error", `Failed to pick image: ${error.message || 'Unknown error'}`);
        }
    };


    // --- Save logic ---
    const handleSave = async () => {
        try {
            const plainTextContent = extractTextFromHTML(contentHtml);

            if (!title.trim() || !plainTextContent.trim() || !selectedMood) {
                Alert.alert('Incomplete Entry', 'Please select a mood and fill in the title and content.');
                return;
            }

            const diaryData = {
                title,
                content: contentHtml,
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
                        // Inject JavaScript to fix local file image display
                        injectedJavaScript={`
                            (function() {
                                // Fix images after page loads
                                function fixImages() {
                                    const images = document.querySelectorAll('img');
                                    images.forEach(function(img) {
                                        const src = img.getAttribute('src');
                                        if (src && (src.startsWith('file://') || src.startsWith('/'))) {
                                            // Ensure image path is correct
                                            img.src = src;
                                            img.style.maxWidth = '100%';
                                            img.style.height = 'auto';
                                            img.style.margin = '10px 0';
                                            img.style.display = 'block';
                                            img.style.borderRadius = '8px';
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
                        getEditor={() => editorRef.current} // Correct connection method
                        actions={[
                            actions.setBold,
                            actions.setItalic,
                            actions.setUnderline,
                            actions.insertBulletsList,
                            actions.insertImage, // Keep to show image button icon, but use custom onPressAddImage handler
                        ]}
                        onPressAddImage={handleInsertImage} // Custom image handler function, overrides default behavior
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
    }
});

export default AddEditDiaryScreen;