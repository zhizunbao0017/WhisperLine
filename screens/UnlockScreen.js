// screens/UnlockScreen.js
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 1. Ensure component correctly receives onUnlock prop
const UnlockScreen = ({ onUnlock }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={64} color="white" />
      
      {/* 2. We use TouchableOpacity for more flexible styling */}
      <TouchableOpacity 
        style={styles.button} 
        // 3. This is the key step: bind button's onPress event to the passed onUnlock function
        onPress={onUnlock}
      >
        <Text style={styles.buttonText}>Unlock My Diary</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212', // Use our dark mode background color
  },
  button: {
    marginTop: 40,
    backgroundColor: '#0A84FF', // Use our dark mode primary color
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 30,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default UnlockScreen;