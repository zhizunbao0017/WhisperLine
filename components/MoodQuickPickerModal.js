import React from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MOODS } from '../data/moods';

const MoodQuickPickerModal = ({ visible, onClose, onSelectMood, colors }) => {
  const handleMoodPress = (mood) => {
    Haptics.selectionAsync().catch(() => {});
    onSelectMood?.(mood);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.card, { backgroundColor: colors?.card ?? '#fff' }]}>
              <Text style={[styles.title, { color: colors?.text ?? '#222' }]}>
                How are you feeling?
              </Text>
              <View style={styles.grid}>
                {MOODS.map((mood) => (
                  <TouchableOpacity
                    key={mood.name}
                    style={[
                      styles.moodItem,
                      {
                        backgroundColor: colors?.background ?? '#f6f6f6',
                      },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => handleMoodPress(mood.name)}
                  >
                    <View style={styles.moodImageWrapper}>
                      {mood.image ? (
                        <Image source={mood.image} style={styles.moodImage} />
                      ) : (
                        <Text style={styles.moodFallback}>😊</Text>
                      )}
                    </View>
                    <Text style={[styles.moodLabel, { color: colors?.text ?? '#222' }]}>
                      {mood.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moodItem: {
    width: '47%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  moodImageWrapper: {
    width: 42,
    height: 42,
    marginBottom: 8,
  },
  moodImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  moodFallback: {
    fontSize: 32,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MoodQuickPickerModal;


