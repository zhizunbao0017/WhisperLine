import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FloatingIntentCatcher = ({
  visible,
  onDismiss,
  value,
  onChangeText,
  onSubmit,
  onAddPhoto,
  onAddMood,
  onExpand,
  selectedMood,
  selectedPhoto,
  onRemoveMood,
  onRemovePhoto,
  colors,
}) => {
  const translateY = useRef(new Animated.Value(360)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 120);
      });
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 360,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, translateY]);

  if (!visible) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <Animated.View style={[styles.overlay, { opacity }]} />
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors?.card ?? '#fff',
            transform: [{ translateY }],
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder="Capture a thought…"
          placeholderTextColor={colors?.text ? colors.text + '66' : '#999'}
          style={[
            styles.input,
            {
              color: colors?.text ?? '#111',
              borderColor: colors?.border ?? '#ddd',
            },
          ]}
          multiline
          maxLength={280}
        />
        <View style={styles.previewRow}>
          {selectedMood ? (
            <TouchableOpacity
              style={[
                styles.previewChip,
                {
                  backgroundColor: colors?.primary ? colors.primary + '18' : 'rgba(74,108,247,0.12)',
                },
              ]}
              onPress={onRemoveMood}
              activeOpacity={0.8}
            >
              <Text style={{ color: colors?.primary ?? '#4a6cf7', fontWeight: '600' }}>
                😊 {selectedMood}
              </Text>
            </TouchableOpacity>
          ) : null}
          {selectedPhoto ? (
            <TouchableOpacity style={styles.photoThumb} onPress={onRemovePhoto} activeOpacity={0.85}>
              <View
                style={[
                  styles.photoPreview,
                  {
                    backgroundColor: colors?.border ?? '#ddd',
                  },
                ]}
              >
                <Ionicons name="close" size={14} color="#fff" style={styles.photoClose} />
                <Image source={{ uri: selectedPhoto }} style={styles.photoImage} />
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.actionsRow}>
          <View style={styles.tools}>
            <TouchableOpacity onPress={onAddPhoto} style={styles.toolButton} activeOpacity={0.85}>
              <Ionicons name="image-outline" size={22} color={colors?.primary ?? '#4a6cf7'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onAddMood} style={styles.toolButton} activeOpacity={0.85}>
              <Ionicons name="happy-outline" size={22} color={colors?.primary ?? '#4a6cf7'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onExpand} style={styles.toolButton} activeOpacity={0.85}>
              <Ionicons name="expand-outline" size={22} color={colors?.primary ?? '#4a6cf7'} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={onSubmit}
            style={[
              styles.saveButton,
              {
                backgroundColor: colors?.primary ?? '#4a6cf7',
              },
            ]}
            activeOpacity={0.9}
          >
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  input: {
    minHeight: 48,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  previewRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  previewChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  photoThumb: {
    width: 58,
    height: 58,
  },
  photoPreview: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
    padding: 2,
    overflow: 'hidden',
  },
  actionsRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tools: {
    flexDirection: 'row',
    gap: 16,
  },
  toolButton: {
    padding: 6,
    borderRadius: 12,
  },
  saveButton: {
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FloatingIntentCatcher;


