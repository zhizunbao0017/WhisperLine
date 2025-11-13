// components/RichTextEditor.js
import { Ionicons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import React, { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

// 动态导入 RichEditor 以避免启动时崩溃
let RichEditor, RichToolbar, actions;
let isRichEditorLoaded = false;
let loadError = null;

try {
  const richEditorModule = require('react-native-pell-rich-editor');
  RichEditor = richEditorModule.RichEditor;
  RichToolbar = richEditorModule.RichToolbar;
  actions = richEditorModule.actions;
  isRichEditorLoaded = true;
} catch (error) {
  console.error('Failed to load react-native-pell-rich-editor:', error);
  loadError = error;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const EDITOR_HEIGHT = SCREEN_HEIGHT * 0.6;

const RichTextEditor = forwardRef(({ 
  content = '', 
  onChange, 
  placeholder = "How was your day?",
  editorHeight = EDITOR_HEIGHT,
  onInsertImage 
}, ref) => {
  const richTextRef = useRef(null);
  const { colors } = useContext(ThemeContext);
  const [error, setError] = useState(null);

  // 检查 RichEditor 是否可用
  useEffect(() => {
    if (loadError) {
      setError('Rich text editor failed to load. Native module may not be linked correctly. Please rebuild the app.');
      return;
    }
    if (!isRichEditorLoaded || !RichEditor || !RichToolbar) {
      setError('Rich text editor components are not available. Please ensure react-native-webview is properly installed and rebuild the app.');
    }
  }, []);

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    insertHTML: (html) => {
      if (richTextRef.current) {
        try {
          richTextRef.current.insertHTML(html);
        } catch (error) {
          console.error('Error inserting HTML:', error);
        }
      }
    },
    insertImage: (imageUrl) => {
      if (richTextRef.current) {
        try {
          richTextRef.current.insertImage(imageUrl);
        } catch (error) {
          console.error('Error inserting image:', error);
        }
      }
    },
    setContentHTML: (html) => {
      if (richTextRef.current) {
        try {
          richTextRef.current.setContentHTML(html);
        } catch (error) {
          console.error('Error setting content HTML:', error);
        }
      }
    },
    getContentHTML: async () => {
      if (richTextRef.current) {
        try {
          return await richTextRef.current.getContentHTML();
        } catch (error) {
          console.error('Error getting content HTML:', error);
          return '';
        }
      }
      return '';
    },
  }));

  // 处理内容变化
  const handleChange = useCallback(
    (html) => {
      if (onChange) {
        onChange(html);
      }
    },
    [onChange]
  );

  // 处理插入图片
  const handleInsertImage = useCallback(() => {
    if (onInsertImage) {
      onInsertImage();
    } else {
      console.log('Insert image pressed - no handler provided');
    }
  }, [onInsertImage]);

  // 处理编辑器初始化错误
  const handleEditorInitialized = useCallback(() => {
    console.log('RichEditor initialized successfully');
    setError(null);
  }, []);

  const handleEditorError = useCallback((error) => {
    console.error('RichEditor error:', error);
    setError('Editor failed to initialize. Please restart the app or rebuild with native modules.');
  }, []);

  if (!colors) {
    return null;
  }

  // 如果检测到错误，显示错误信息
  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
        <Text style={[styles.errorHint, { color: colors.text }]}>
          Please rebuild the app using: npx expo run:ios
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <RichEditor
        ref={richTextRef}
        onChange={handleChange}
        placeholder={placeholder}
        initialContentHTML={content || ''}
        editorInitializedCallback={handleEditorInitialized}
        onError={handleEditorError}
        editorStyle={{
          backgroundColor: colors.card,
          color: colors.text,
          placeholderColor: 'gray',
          contentCSSText: `
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
            padding: 15px;
            min-height: 200px;
          `,
        }}
        containerStyle={[styles.editorContainer, { height: editorHeight, minHeight: 200 }]}
        useContainer={true}
        initialHeight={editorHeight}
        onHeightChange={(height) => {
          console.log('Editor height changed:', height);
        }}
      />
      <RichToolbar
        editor={richTextRef}
        actions={[
          actions.setBold,
          actions.setItalic,
          actions.setUnderline,
          actions.insertBulletsList,
          'insertImage',
        ]}
        iconTint={colors.text}
        selectedIconTint={colors.primary}
        selectedButtonStyle={{ backgroundColor: colors.border }}
        style={[styles.toolbar, { backgroundColor: colors.card, borderColor: colors.border }]}
        iconMap={{
          insertImage: () => (
            <Ionicons 
              name="image-outline" 
              size={24} 
              color={colors.text} 
            />
          ),
        }}
        onPressAddImage={handleInsertImage}
      />
    </View>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

// PropTypes 定义
RichTextEditor.propTypes = {
  content: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  editorHeight: PropTypes.number,
  onInsertImage: PropTypes.func,
};

RichTextEditor.defaultProps = {
  content: '',
  placeholder: 'How was your day?',
  editorHeight: EDITOR_HEIGHT,
  onInsertImage: null,
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
    minHeight: 300,
  },
  editorContainer: {
    borderRadius: 12,
    flex: 1,
  },
  toolbar: {
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: 50,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  errorHint: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
});

export default RichTextEditor;
