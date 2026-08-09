import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, shadow, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { useLanguage } from '../../shared/i18n/LanguageProvider';

export function SettingsScreen() {
  const { colors, scheme, setThemePreference, themeOptions, themePreference } = useAppTheme();
  const { language, languageOptions, languagePreference, setLanguagePreference, t } = useLanguage();
  const styles = createStyles(colors);

  return (
    <View>
      <View style={styles.hero}>
        <Text style={styles.kicker}>{t('Settings')}</Text>
        <Text style={styles.title}>{t('Preferences')}</Text>
        <Text style={styles.subtitle}>{t('Choose how the app should look and read on this device.')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('App language')}</Text>
        <Text style={styles.sectionText}>
          {t(languagePreference === 'system' ? 'Following your device language.' : 'Using a fixed app language.')}
        </Text>
        <View style={styles.options}>
          {languageOptions.map((item) => {
            const active = item.code === languagePreference;
            const isSystem = item.code === 'system';

            return (
              <Pressable
                accessibilityRole="button"
                key={item.code}
                onPress={() => setLanguagePreference(item.code)}
                style={[styles.option, active && styles.optionActive]}
              >
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>{t(item.label)}</Text>
                <Text style={[styles.optionMeta, active && styles.optionMetaActive]}>
                  {isSystem ? `${t('Current')}: ${language === 'hi' ? 'हिंदी' : 'English'}` : item.nativeLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('Theme')}</Text>
        <Text style={styles.sectionText}>
          {t(themePreference === 'system' ? 'Following your device theme.' : 'Using a fixed app theme.')}
        </Text>
        <View style={styles.options}>
          {themeOptions.map((item) => {
            const active = item.value === themePreference;

            return (
              <Pressable
                accessibilityRole="button"
                key={item.value}
                onPress={() => setThemePreference(item.value)}
                style={[styles.option, active && styles.optionActive]}
              >
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>{t(item.label)}</Text>
                <Text style={[styles.optionMeta, active && styles.optionMetaActive]}>
                  {item.value === 'system' ? `${t('Current')}: ${t(scheme === 'dark' ? 'Dark' : 'Light')}` : t(item.value === 'dark' ? 'Dark mode' : 'Light mode')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    hero: {
      backgroundColor: colors.ink,
      borderRadius: radius.lg,
      padding: spacing.lg,
      ...shadow.card,
    },
    kicker: {
      color: colors.panelAccent,
      fontSize: 12,
      fontWeight: typography.weight.black,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.onBrand,
      fontSize: 30,
      fontWeight: typography.weight.black,
      marginTop: spacing.xs,
    },
    subtitle: {
      color: colors.panelMuted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: spacing.sm,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.borderSoft,
      borderRadius: radius.lg,
      borderWidth: 1,
      marginTop: spacing.lg,
      padding: spacing.lg,
      ...shadow.card,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: typography.weight.black,
    },
    sectionText: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.xs,
    },
    options: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    option: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.md,
    },
    optionActive: {
      backgroundColor: colors.ink,
      borderColor: colors.ink,
    },
    optionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: typography.weight.black,
    },
    optionTitleActive: {
      color: colors.onBrand,
    },
    optionMeta: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: typography.weight.bold,
      marginTop: spacing.xs,
    },
    optionMetaActive: {
      color: colors.panelMuted,
    },
  });
}
