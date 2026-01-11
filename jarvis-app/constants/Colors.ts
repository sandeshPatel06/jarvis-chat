const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    primary: '#4A90E2',
    secondary: '#8022d9',
    accent: '#20E1B2',
    glass: 'rgba(255, 255, 255, 0.2)',
    inputBackground: '#f0f0f0',
    itemSeparator: '#eee',
    messageBubbleThem: '#e5e5ea',
  },
  dark: {
    text: '#fff',
    background: '#0F0F1A', // Deep midnight blue
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
    primary: '#6C63FF',
    secondary: '#B030B0',
    accent: '#00D4FF',
    glass: 'rgba(20, 20, 30, 0.6)',
    inputBackground: '#1E1E2E',
    itemSeparator: 'rgba(255, 255, 255, 0.1)',
    messageBubbleThem: '#333',
  },
};
