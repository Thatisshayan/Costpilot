/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0B0C10',
    background: '#F8F9FC',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    // New accents for Light Mode
    accentAction: '#00A396',
    accentAI: '#7048A3',
    accentWarning: '#CC3333',
    accentAWS: '#FF9900',
    accentAzure: '#007FFF',
    accentGCP: '#34A853',
    accentOpenAI: '#8A2BE2',
  },
  dark: {
    text: '#ffffff',
    background: '#050508',
    backgroundElement: '#12121A',
    backgroundSelected: '#2E3135',
    textSecondary: '#9499C3',
    // New accents for Dark Mode
    accentAction: '#66FCF1',
    accentAI: '#C397EB',
    accentWarning: '#FF4D4D',
    accentAWS: '#FF9900',
    accentAzure: '#007FFF',
    accentGCP: '#34A853',
    accentOpenAI: '#8A2BE2',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  clashDisplay: Platform.select({
    ios: 'Clash Display',
    default: 'Clash Display',
    web: 'Clash Display',
  }),
  plusJakartaSans: Platform.select({
    ios: 'Plus Jakarta Sans',
    default: 'Plus Jakarta Sans',
    web: 'Plus Jakarta Sans',
  }),
  jetBrainsMono: Platform.select({
    ios: 'JetBrains Mono',
    default: 'JetBrains Mono',
    web: 'JetBrains Mono',
  }),
};

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
