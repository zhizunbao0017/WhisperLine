export type ThemeName = 'default' | 'child' | 'cyberpunk' | 'mature' | 'elegant';

export interface ThemePalette {
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
  tagBackground: string;
  tagText: string;
}

export interface ThemeTypography {
  heading: number;
  subheading: number;
  body: number;
  button: number;
  caption: number;
  rounded?: boolean;
  fontFamily?: string;
  headingFontFamily?: string;
  bodyFontFamily?: string;
  buttonFontFamily?: string;
}

export interface ThemeDefinition {
  id: ThemeName;
  displayName: string;
  description: string;
  previewGradient: [string, string];
  palette: ThemePalette;
  typography: ThemeTypography;
  radius: {
    card: number;
    button: number;
    input: number;
    chip: number;
  };
  shadow: {
    opacity: number;
    radius: number;
    elevation: number;
  };
}

export const FALLBACK_THEME_NAME: ThemeName = 'default';

export const THEME_DEFINITIONS: Record<ThemeName, ThemeDefinition> = {
  default: {
    id: 'default',
    displayName: 'Balanced',
    description: 'Soft neutrals and calming primary blue for everyday journaling.',
    previewGradient: ['#EFF3FF', '#D9E3FF'],
    palette: {
      background: '#F5F7FB',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      text: '#1B1E28',
      secondaryText: '#4B5563',
      muted: '#6B7280',
      primary: '#4A6CF7',
      primaryText: '#FFFFFF',
      accent: '#FFD166',
      border: '#E0E6F0',
      inputBackground: '#FFFFFF',
      inputText: '#1B1E28',
      inputPlaceholder: '#9DA7BE',
      inputBorder: '#CED6E4',
      tagBackground: '#E6EDFF',
      tagText: '#2945B5',
    },
    typography: {
      heading: 28,
      subheading: 20,
      body: 16,
      button: 16,
      caption: 13,
      fontFamily: 'System',
      headingFontFamily: 'System',
      bodyFontFamily: 'System',
      buttonFontFamily: 'System',
    },
    radius: {
      card: 20,
      button: 16,
      input: 16,
      chip: 14,
    },
    shadow: {
      opacity: 0.1,
      radius: 12,
      elevation: 6,
    },
  },
  child: {
    id: 'child',
    displayName: 'Playful',
    description: 'Bright candy colors with pill-shaped elements for delighted exploration.',
    previewGradient: ['#FFEAF5', '#FFE0C6'],
    palette: {
      background: '#FDEBD6',
      surface: '#FFFCF8',
      card: '#FFFCF8',
      text: '#5E4B68',
      secondaryText: '#7090AC',
      muted: '#A1849A',
      primary: '#7090AC',
      primaryText: '#2F3A56',
      accent: '#FFD391',
      border: '#F3D5C1',
      inputBackground: '#FFFCF8',
      inputText: '#5E4B68',
      inputPlaceholder: '#7090AC',
      inputBorder: '#F3D5C1',
      tagBackground: '#FFE7D6',
      tagText: '#8E6C7A',
    },
    typography: {
      heading: 30,
      subheading: 22,
      body: 17,
      button: 17,
      caption: 14,
      rounded: true,
      fontFamily: 'HanziPen TC',
      headingFontFamily: 'HanziPen TC',
      bodyFontFamily: 'HanziPen TC',
      buttonFontFamily: 'HanziPen TC',
    },
    radius: {
      card: 30,
      button: 30,
      input: 30,
      chip: 20,
    },
    shadow: {
      opacity: 0.18,
      radius: 18,
      elevation: 8,
    },
  },
  cyberpunk: {
    id: 'cyberpunk',
    displayName: 'Cyberpunk',
    description: 'High contrast neon accents over dark futuristic surfaces.',
    previewGradient: ['#1B0036', '#003052'],
    palette: {
      background: '#050510',
      surface: '#0E0F1F',
      card: '#141529',
      text: '#E5E8FF',
      secondaryText: '#A5A5CC',
      muted: '#6D6F9A',
      primary: '#7A5CFF',
      primaryText: '#0E021C',
      accent: '#00E5FF',
      border: '#272A4A',
      inputBackground: '#101128',
      inputText: '#F0F3FF',
      inputPlaceholder: '#646891',
      inputBorder: '#2E3358',
      tagBackground: '#1B1F3A',
      tagText: '#7A9EFF',
    },
    typography: {
      heading: 28,
      subheading: 20,
      body: 16,
      button: 15,
      caption: 12,
      fontFamily: 'System',
      headingFontFamily: 'System',
      bodyFontFamily: 'System',
      buttonFontFamily: 'System',
    },
    radius: {
      card: 18,
      button: 18,
      input: 18,
      chip: 16,
    },
    shadow: {
      opacity: 0.35,
      radius: 16,
      elevation: 12,
    },
  },
  mature: {
    id: 'mature',
    displayName: 'Mature',
    description: 'Muted earthy palette with refined typography and gentle contrast.',
    previewGradient: ['#ECE4DB', '#D3C7BA'],
    palette: {
      background: '#F1ECE6',
      surface: '#FFFFFF',
      card: '#FDFBF8',
      text: '#2C2A27',
      secondaryText: '#4F4A45',
      muted: '#82796F',
      primary: '#8C6A4F',
      primaryText: '#FFFFFF',
      accent: '#C6A664',
      border: '#DDD2C3',
      inputBackground: '#FFFFFF',
      inputText: '#2C2A27',
      inputPlaceholder: '#A5988A',
      inputBorder: '#D4C6B5',
      tagBackground: '#EEE3D4',
      tagText: '#6A4E36',
    },
    typography: {
      heading: 27,
      subheading: 20,
      body: 16,
      button: 15,
      caption: 13,
      fontFamily: 'System',
      headingFontFamily: 'System',
      bodyFontFamily: 'System',
      buttonFontFamily: 'System',
    },
    radius: {
      card: 18,
      button: 18,
      input: 16,
      chip: 16,
    },
    shadow: {
      opacity: 0.12,
      radius: 14,
      elevation: 5,
    },
  },
  elegant: {
    id: 'elegant',
    displayName: 'Elegant',
    description: 'Minimal high-contrast monochrome with soft glassmorphism surfaces.',
    previewGradient: ['#F9FAFB', '#E2E5EA'],
    palette: {
      background: '#F7F8FC',
      surface: '#FFFFFF',
      card: '#FFFFFF',
      text: '#1A1D23',
      secondaryText: '#4A4F5C',
      muted: '#7A7F8C',
      primary: '#2D3748',
      primaryText: '#F7FAFC',
      accent: '#A0AEC0',
      border: '#D8DCE6',
      inputBackground: '#FFFFFF',
      inputText: '#1A1D23',
      inputPlaceholder: '#9EA4B4',
      inputBorder: '#C5CAD6',
      tagBackground: '#E4E7EF',
      tagText: '#2D3748',
    },
    typography: {
      heading: 28,
      subheading: 21,
      body: 16,
      button: 16,
      caption: 13,
      fontFamily: 'System',
      headingFontFamily: 'System',
      bodyFontFamily: 'System',
      buttonFontFamily: 'System',
    },
    radius: {
      card: 22,
      button: 18,
      input: 18,
      chip: 14,
    },
    shadow: {
      opacity: 0.12,
      radius: 20,
      elevation: 10,
    },
  },
};

export const AVAILABLE_THEMES: ThemeDefinition[] = Object.values(THEME_DEFINITIONS);

export const isValidThemeName = (value: string | null | undefined): value is ThemeName => {
  if (!value) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(THEME_DEFINITIONS, value);
};

export const getThemeDefinition = (themeName: ThemeName | null | undefined): ThemeDefinition => {
  if (!themeName || !isValidThemeName(themeName)) {
    return THEME_DEFINITIONS[FALLBACK_THEME_NAME];
  }
  return THEME_DEFINITIONS[themeName];
};

