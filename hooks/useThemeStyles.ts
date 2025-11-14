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
  toolbarBackground: string;
  toolbarRadius: number;
}

export const getThemeStyles = (themeName: ThemeName): ThemeStyles => {
  const definition = getThemeDefinition(themeName);
  const { palette, radius, typography } = definition;

  return {
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
    toolbarBackground: palette.surface,
    toolbarRadius: radius.button,
  };
};

export const useThemeStyles = (): ThemeStyles => {
  const context = useContext(ThemeContext);
  const themeName = context?.theme ?? 'default';
  return useMemo(() => getThemeStyles(themeName), [themeName]);
};

