import { useContext, useMemo } from 'react';

import { getThemeDefinition, type ThemeName } from '@/constants/themes';
import { ThemeContext } from '@/context/ThemeContext';

export interface ThemeStyles {
  background: string;
  surface: string;
  card: string;
  text: string;
  secondaryText: string;
  muted: string;
  primary: string;
  primaryText: string;
  accent: string;
  border: string;
  inputBackground: string;
  inputText: string;
  inputPlaceholder: string;
  inputBorder: string;
  buttonRadius: number;
  inputRadius: number;
  cardRadius: number;
  chipRadius: number;
  tagBackground: string;
  tagText: string;
  headingFontFamily: string;
  bodyFontFamily: string;
  buttonFontFamily: string;
  fontFamily: string;
  toolbarBackground: string;
  toolbarRadius: number;
  toolbarStyle?: {
    flexDirection: 'row';
    width: string;
    justifyContent: 'space-evenly' | 'space-between' | 'space-around' | 'flex-start' | 'flex-end' | 'center';
    alignItems: 'center' | 'flex-start' | 'flex-end' | 'stretch';
    backgroundColor: string;
    borderWidth: number;
    borderColor: string;
    borderRadius: number;
    paddingVertical: number;
    paddingHorizontal: number;
  };
}

export const getThemeStyles = (themeName: ThemeName): ThemeStyles => {
  const definition = getThemeDefinition(themeName);
  const { palette, radius, typography } = definition;

  const baseStyles: ThemeStyles = {
    background: palette.background,
    surface: palette.surface,
    card: palette.card,
    text: palette.text,
    secondaryText: palette.secondaryText,
    muted: palette.muted,
    primary: palette.primary,
    primaryText: palette.primaryText,
    accent: palette.accent,
    border: palette.border,
    inputBackground: palette.inputBackground,
    inputText: palette.inputText,
    inputPlaceholder: palette.inputPlaceholder,
    inputBorder: palette.inputBorder,
    buttonRadius: radius.button,
    inputRadius: radius.input,
    cardRadius: radius.card,
    chipRadius: radius.chip,
    tagBackground: palette.tagBackground,
    tagText: palette.tagText,
    headingFontFamily: typography.headingFontFamily ?? typography.fontFamily ?? 'System',
    bodyFontFamily: typography.bodyFontFamily ?? typography.fontFamily ?? 'System',
    buttonFontFamily: typography.buttonFontFamily ?? typography.fontFamily ?? 'System',
    fontFamily: typography.fontFamily ?? 'System',
    toolbarBackground: palette.surface,
    toolbarRadius: radius.button,
  };

  // --- 赛博朋克主题的完整工具栏样式 ---
  if (themeName === 'cyberpunk') {
    return {
      ...baseStyles,
      toolbarStyle: {
        // --- 完整的、高优先级的Flexbox布局 ---
        flexDirection: 'row',
        width: '100%', // 改为100%以撑满宽度
        alignSelf: 'stretch', // 添加stretch确保对齐
        justifyContent: 'space-evenly',
        alignItems: 'center',
        // --- 保留原有的赛博朋克视觉风格 ---
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#FFFF00', // 保留黄色边框
        borderRadius: 100,       // 确保是胶囊形状
        paddingVertical: 8,      // 增加一些垂直内边距，让它看起来更舒服
        paddingHorizontal: 16    // 增加一些水平内边距
      },
    };
  }

  return baseStyles;
};

export const useThemeStyles = (): ThemeStyles => {
  const context = useContext(ThemeContext);
  const themeName = context?.theme ?? 'default';
  return useMemo(() => getThemeStyles(themeName), [themeName]);
};

