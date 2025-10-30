// screens/UnlockScreen.js
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 1. 确保组件正确地接收 onUnlock 这个 prop
const UnlockScreen = ({ onUnlock }) => {
  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={64} color="white" />
      
      {/* 2. 我们使用TouchableOpacity来实现更灵活的样式 */}
      <TouchableOpacity 
        style={styles.button} 
        // 3. 这是最关键的一步：将按钮的 onPress 事件绑定到传入的 onUnlock 函数
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
    backgroundColor: '#121212', // 使用我们的暗黑模式背景色
  },
  button: {
    marginTop: 40,
    backgroundColor: '#0A84FF', // 使用我们的暗黑模式主色
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