// components/MoodPicker.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

const moods = [
  { name: "Happy", color: "#FFD60A", icon: "happy" },
  { name: "Calm", color: "#06D6A0", icon: "leaf" },
  { name: "Excited", color: "#FF6B6B", icon: "flame" },
  { name: "Grateful", color: "#A0C4FF", icon: "heart-circle" },
  { name: "Sad", color: "#9CA3AF", icon: "cloud" },
  { name: "Anxious", color: "#6C757D", icon: "bulb" },
  { name: "Angry", color: "#FF6B6B", icon: "flame" },
  { name: "Tired", color: "#6C757D", icon: "bed" },
  { name: "Inspired", color: "#B5179E", icon: "bulb" },
  { name: "Lonely", color: "#495057", icon: "moon" },
  { name: "Proud", color: "#F72585", icon: "trophy" },
  { name: "Neutral", color: "#E9ECEF", icon: "remove" }
];

export default function MoodPicker({ onMoodSelect }: { onMoodSelect: (html: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const handlePress = (mood: typeof moods[0], index: number) => {
    setSelected(mood.name);
    onMoodSelect(`<span style="color:${mood.color}">[${mood.name}]</span>`);
    scrollRef.current?.scrollTo({ x: index * 90 - 150, animated: true });
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {moods.map((mood, i) => (
        <TouchableOpacity
          key={mood.name}
          style={[styles.item, selected === mood.name && styles.selected]}
          onPress={() => handlePress(mood, i)}
        >
          <Ionicons name={mood.icon as any} size={32} color={mood.color} />
          <Text style={styles.label}>{mood.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: 20 },
  item: { alignItems: 'center', marginHorizontal: 8, width: 80 },
  selected: { borderWidth: 3, borderColor: '#007AFF', borderRadius: 40 },
  label: { marginTop: 4, fontSize: 12 }
});