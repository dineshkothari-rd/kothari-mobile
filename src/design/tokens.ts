import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, createElement, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

export const lightColors = {
  canvas: '#F5F7F4',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF3F0',
  surfaceRaised: '#FAFCFA',
  ink: '#142C26',
  text: '#183029',
  muted: '#64756F',
  subtle: '#9AABA5',
  border: '#D9E2DE',
  borderSoft: '#E8EEEB',
  brand: '#147D64',
  onBrand: '#FFFFFF',
  copper: '#D9773F',
  copperSoft: '#FCE9DC',
  success: '#147D64',
  successSoft: '#DDF3EB',
  warning: '#A9690E',
  warningSoft: '#FFF0CF',
  danger: '#B84040',
  dangerSoft: '#FBE4E2',
  accent: '#5369A8',
  accentSoft: '#E8ECF8',
  sky: '#397B8E',
  skySoft: '#E2F0F2',
  panelText: '#F8FCFA',
  panelMuted: '#C5D8D2',
  panelSubtle: '#91AEA5',
  panelAccent: '#F5B989',
  overlayFaint: 'rgba(255,255,255,0.08)',
  overlaySubtle: 'rgba(255,255,255,0.10)',
};

export const darkColors: typeof lightColors = {
  canvas: '#08110E',
  surface: '#101C18',
  surfaceMuted: '#17251F',
  surfaceRaised: '#1B2B25',
  ink: '#050B09',
  text: '#F0F7F4',
  muted: '#A5B8B1',
  subtle: '#708A80',
  border: '#2A3D36',
  borderSoft: '#20322C',
  brand: '#55D6B1',
  onBrand: '#FFFFFF',
  copper: '#F5A06D',
  copperSoft: '#35251C',
  success: '#55D6B1',
  successSoft: '#103128',
  warning: '#F1C45D',
  warningSoft: '#332716',
  danger: '#FF8D88',
  dangerSoft: '#351D1D',
  accent: '#B4C1F5',
  accentSoft: '#222A45',
  sky: '#7AC7D1',
  skySoft: '#123039',
  panelText: '#F8FCFA',
  panelMuted: '#B9CEC7',
  panelSubtle: '#7F9D93',
  panelAccent: '#F5B989',
  overlayFaint: 'rgba(255,255,255,0.08)',
  overlaySubtle: 'rgba(255,255,255,0.10)',
};

export type AppColorScheme = 'light' | 'dark';
export type ThemePreference = 'system' | AppColorScheme;
export type AppColors = typeof lightColors;

const THEME_STORAGE_KEY = 'kothari.theme';

type ThemeContextValue = {
  colors: AppColors;
  isDark: boolean;
  scheme: AppColorScheme;
  setThemePreference: (preference: ThemePreference) => void;
  themeOptions: Array<{ label: string; value: ThemePreference }>;
  themePreference: ThemePreference;
};

const themeOptions: Array<{ label: string; value: ThemePreference }> = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function getColors(scheme: AppColorScheme) {
  return scheme === 'dark' ? darkColors : lightColors;
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const deviceScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const systemScheme: AppColorScheme = deviceScheme === 'dark' ? 'dark' : 'light';
  const scheme: AppColorScheme = themePreference === 'system' ? systemScheme : themePreference;
  const colors = getColors(scheme);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((value) => {
        if (value === 'system' || value === 'light' || value === 'dark') setThemePreferenceState(value);
      })
      .catch(() => undefined);
  }, []);

  function setThemePreference(nextPreference: ThemePreference) {
    setThemePreferenceState(nextPreference);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextPreference).catch(() => undefined);
  }

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors,
      isDark: scheme === 'dark',
      scheme,
      setThemePreference,
      themeOptions,
      themePreference,
    }),
    [colors, scheme, themePreference],
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useAppTheme() {
  const deviceScheme = useColorScheme();
  const context = useContext(ThemeContext);

  if (context) return context;

  const scheme: AppColorScheme = deviceScheme === 'dark' ? 'dark' : 'light';

  return {
    colors: getColors(scheme),
    isDark: scheme === 'dark',
    scheme,
    setThemePreference: () => undefined,
    themeOptions,
    themePreference: 'system' as ThemePreference,
  };
}

export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 22,
};

export const shadow = {
  card: {
    elevation: 1,
    shadowColor: colors.ink,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
  },
  dock: {
    elevation: 6,
    shadowColor: colors.ink,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
  },
};

export const typography = {
  weight: {
    medium: '500' as const,
    bold: '700' as const,
    black: '900' as const,
  },
};
