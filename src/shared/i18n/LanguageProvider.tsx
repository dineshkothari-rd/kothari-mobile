import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { AppState, NativeModules, Platform } from 'react-native';

import { languages, translations, type AppLanguage } from './translations';

const STORAGE_KEY = 'kothari.language';

export type LanguagePreference = 'system' | AppLanguage;

const languageOptions: Array<{ code: LanguagePreference; label: string; nativeLabel: string }> = [
  { code: 'system', label: 'System', nativeLabel: 'System' },
  ...languages,
];

type LanguageContextValue = {
  language: AppLanguage;
  languageOptions: typeof languageOptions;
  languagePreference: LanguagePreference;
  languages: typeof languages;
  setLanguage: (language: AppLanguage) => void;
  setLanguagePreference: (language: LanguagePreference) => void;
  t: (text: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getDeviceLanguage(): AppLanguage {
  const locale =
    Platform.OS === 'ios'
      ? NativeModules.SettingsManager?.settings?.AppleLocale || NativeModules.SettingsManager?.settings?.AppleLanguages?.[0]
      : NativeModules.I18nManager?.localeIdentifier || Intl.DateTimeFormat().resolvedOptions().locale;

  return String(locale || '').toLowerCase().startsWith('hi') ? 'hi' : 'en';
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [deviceLanguage, setDeviceLanguage] = useState<AppLanguage>(getDeviceLanguage);
  const [languagePreference, setLanguagePreferenceState] = useState<LanguagePreference>('system');
  const language: AppLanguage = languagePreference === 'system' ? deviceLanguage : languagePreference;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value === 'system' || value === 'en' || value === 'hi') setLanguagePreferenceState(value);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDeviceLanguage(getDeviceLanguage());
    });

    return () => subscription.remove();
  }, []);

  function setLanguage(nextLanguage: AppLanguage) {
    setLanguagePreference(nextLanguage);
  }

  function setLanguagePreference(nextPreference: LanguagePreference) {
    setLanguagePreferenceState(nextPreference);
    AsyncStorage.setItem(STORAGE_KEY, nextPreference).catch(() => undefined);
  }

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      languageOptions,
      languagePreference,
      languages,
      setLanguage,
      setLanguagePreference,
      t: (text: string) => translations[language][text] || text,
    }),
    [language, languagePreference],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }

  return context;
}
