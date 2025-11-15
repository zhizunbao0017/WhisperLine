import React, { useContext } from 'react';
import { Text, type TextProps } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { getThemeStyles } from '../hooks/useThemeStyles';

export type ThemedTextProps = TextProps;

export const ThemedText: React.FC<ThemedTextProps> = ({ style, ...rest }) => {
  const themeContext = useContext(ThemeContext);
  const themeName = themeContext?.theme ?? 'default';
  const styles = getThemeStyles(themeName);

  return (
    <Text
      style={[{ fontFamily: styles.fontFamily }, style]}
      {...rest}
    />
  );
};

export default ThemedText;

