// components/MoodSelector.js
import { useContext } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

// Define our mood options, each mood is an object containing name and emoji
const MOODS = [
  { name: 'Happy', emoji: '😊' },
  { name: 'Sad', emoji: '😢' },
  { name: 'Angry', emoji: '😠' },
  { name: 'Calm', emoji: '😌' },
  { name: 'Excited', emoji: '🤩' },
];

const MoodSelector = ({ onSelectMood, selectedMood }) => {
  const { colors } = useContext(ThemeContext);

  if (!colors) {
    return null;
  }

  const themedStyles = StyleSheet.create({
    container: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 10,
      color: colors.text,
    },
    moodsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    mood: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 50, // Circular
      padding: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedMood: {
      borderColor: colors.primary,
      backgroundColor: colors.card,
    },
    emoji: {
      fontSize: 30,
    },
  });

  return (
    <View style={themedStyles.container}>
      <Text style={themedStyles.label}>How are you feeling?</Text>
      <View style={themedStyles.moodsContainer}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.name}
            style={[
              themedStyles.mood,
              selectedMood?.name === mood.name && themedStyles.selectedMood,
            ]}
            onPress={() => onSelectMood(mood)}
          >
            <Text style={themedStyles.emoji}>{mood.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default MoodSelector;