// components/MoodSelector.js
import { useContext } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
// --- 1. Import our new mood data source ---
import { MOODS } from '../data/moods';

const MoodSelector = ({ onSelectMood, selectedMood }) => {
    const { colors } = useContext(ThemeContext);

    // If theme colors haven't loaded yet, don't render anything
    if (!colors) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.text }]}>How are you feeling?</Text>
            <View style={styles.moodsContainer}>
                {MOODS.map((mood) => {
                    // --- 2. Check if current mood is selected ---
                    // Compatible with selectedMood being either a string or an object
                    const isSelected = typeof selectedMood === 'string' 
                        ? selectedMood === mood.name 
                        : selectedMood?.name === mood.name;

                    return (
                        <TouchableOpacity
                            key={mood.name}
                            // Pass full mood object when clicked
                            onPress={() => onSelectMood(mood)}
                            // accessibility analytics - a11y
                            accessibilityLabel={mood.name}
                            accessibilityState={{ selected: isSelected }}
                            accessibilityRole="button"
                            activeOpacity={isSelected ? 0.9 : 0.7} // Keep high brightness when selected, reduce dimming on press
                        >
                            <View 
                                style={[
                                    styles.moodWrapper,
                                    // Apply styles directly when selected to ensure high brightness persists
                                    isSelected && styles.moodWrapperSelected,
                                    { opacity: isSelected ? 1 : 0.35 } // Reduce opacity when not selected for contrast
                                ]}
                            >
                                {/* Background highlight circle when selected - maintains high brightness */}
                                {isSelected && (
                                    <View style={[styles.selectedBackground, { backgroundColor: colors.primary + '45' }]} />
                                )}
                                <View 
                                    style={[
                                        styles.imageContainer,
                                        { 
                                            // Use brighter theme color background when selected, maintains high brightness
                                            backgroundColor: isSelected ? colors.primary + '40' : colors.card,
                                        },
                                        // --- 4. Add prominent border and highlight effect for selected icon, maintains ---
                                        isSelected && {
                                            borderColor: colors.primary,
                                            borderWidth: 3.5,
                                            shadowColor: colors.primary,
                                            shadowOffset: { width: 0, height: 0 },
                                            shadowOpacity: 0.8,
                                            shadowRadius: 14,
                                            elevation: 14,
                                        }
                                    ]}
                                >
                                    {/* --- 5. Use Image component to render our icon --- */}
                                    <Image 
                                        source={mood.image} 
                                        style={[
                                            styles.moodImage,
                                            isSelected && styles.moodImageSelected // Icon brighter when selected, maintains
                                        ]} 
                                    />
                                </View>
                                <Text style={[styles.moodLabel, { 
                                    color: isSelected ? colors.primary : colors.text,
                                    fontWeight: isSelected ? '700' : '400', // Bolder when selected, maintains
                                    fontSize: isSelected ? 13 : 12, // Slightly larger when selected, maintains
                                }]}>
                                    {mood.name}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

// --- We move styles outside the component, this is React Native best practice ---
const styles = StyleSheet.create({
    container: {
        marginBottom: 25,
    },
    label: {
        fontSize: 18,
        fontWeight: '600', // Use 600 (semibold) instead of 'bold', looks softer
        marginBottom: 15,
        textAlign: 'center', // Center labels
    },
    moodsContainer: {
        flexDirection: 'row',
        justifyContent: 'center', // Center alignment
        alignItems: 'flex-start',
        flexWrap: 'nowrap', // Ensure no wrapping, six labels in one row
        paddingHorizontal: 10, // Appropriate left/right padding, ensure labels aren't obscured
        width: '100%', // Ensure container takes full width
    },
    moodWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 58, // Fixed width, ensure six labels can display in one row
        marginHorizontal: 3, // Spacing between labels, appropriate gap
        position: 'relative', // Position for selected background
    },
    moodWrapperSelected: {
        transform: [{ scale: 1.1 }], // Slightly larger when selected, maintains
    },
    selectedBackground: {
        position: 'absolute',
        width: 72,
        height: 72,
        borderRadius: 36,
        top: -6,
        left: -7,
        zIndex: -1, // Behind icon
    },
    imageContainer: {
        width: 56, // Slightly smaller to fit six in one row
        height: 56,
        borderRadius: 28, // Perfect circle
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        position: 'relative', // Position for selected marker
        // Shadow effect when not selected
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    moodImage: {
        width: '70%', // Image takes 70% of container, leave some margin
        height: '70%',
        resizeMode: 'contain',
    },
    moodImageSelected: {
        opacity: 1.0, // Icon fully opaque when selected, brighter
    },
    moodLabel: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default MoodSelector;