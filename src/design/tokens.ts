import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, createElement, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

export const lightColors = {
  canvas: '#EEF3F7',
  surface: '#FFFFFF',
  surfaceMuted: '#F4F7FA',
  surfaceRaised: '#FAFCFE',
  ink: '#26303D',
  text: '#26303D',
  muted: '#667789',
  subtle: '#9AB3CB',
  border: '#DCE5EE',
  borderSoft: '#E8EEF4',
  brand: '#4294CF',
  onBrand: '#FFFFFF',
  copper: '#B46842',
  copperSoft: '#F4E3D9',
  success: '#248568',
  successSoft: '#DDF2EB',
  warning: '#B8791D',
  warningSoft: '#F7E9CC',
  danger: '#B94A48',
  dangerSoft: '#F7DEDD',
  accent: '#516D98',
  accentSoft: '#E1E9F3',
  sky: '#658DAE',
  skySoft: '#E4EEF6',
  panelText: '#F7FBFF',
  panelMuted: '#C8D4DE',
  panelSubtle: '#A9B8C7',
  panelAccent: '#D8C3A5',
  overlayFaint: 'rgba(255,255,255,0.08)',
  overlaySubtle: 'rgba(255,255,255,0.10)',
};

export const darkColors: typeof lightColors = {
  canvas: '#070B10',
  surface: '#101820',
  surfaceMuted: '#16212B',
  surfaceRaised: '#1B2834',
  ink: '#05080D',
  text: '#F2F7FB',
  muted: '#A7B5C2',
  subtle: '#6F8194',
  border: '#263441',
  borderSoft: '#1E2A35',
  brand: '#65C7F7',
  onBrand: '#FFFFFF',
  copper: '#F0A36F',
  copperSoft: '#35241D',
  success: '#5FE0A4',
  successSoft: '#102C25',
  warning: '#F1C45D',
  warningSoft: '#332716',
  danger: '#FF8D88',
  dangerSoft: '#351D1D',
  accent: '#A7C7F2',
  accentSoft: '#17283C',
  sky: '#7DC9F5',
  skySoft: '#122A3D',
  panelText: '#F7FBFF',
  panelMuted: '#B5C5D4',
  panelSubtle: '#8195AA',
  panelAccent: '#F3C58F',
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
  sm: 6,
  md: 8,
  lg: 8,
};

export const shadow = {
  card: {
    elevation: 2,
    shadowColor: colors.ink,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  dock: {
    elevation: 8,
    shadowColor: colors.ink,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
  },
};

export const typography = {
  weight: {
    medium: '500' as const,
    bold: '700' as const,
    black: '900' as const,
  },
};
