import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, shadow, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { useLanguage } from '../../shared/i18n/LanguageProvider';

export function SettingsScreen() {
  const { colors } = useAppTheme();
  const { language, languages, setLanguage, t } = useLanguage();
  const styles = createStyles(colors);

  return (
    <View>
      <View style={styles.hero}>
        <Text style={styles.kicker}>{t('Settings')}</Text>
        <Text style={styles.title}>{t('Language')}</Text>
        <Text style={styles.subtitle}>{t('Choose the language you want to use in the app.')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('App language')}</Text>
        <Text style={styles.sectionText}>{t('Your choice is saved on this device.')}</Text>
        <View style={styles.options}>
          {languages.map((item) => {
            const active = item.code === language;

            return (
              <Pressable
                accessibilityRole="button"
                key={item.code}
                onPress={() => setLanguage(item.code)}
                style={[styles.option, active && styles.optionActive]}
              >
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>{item.nativeLabel}</Text>
                <Text style={[styles.optionMeta, active && styles.optionMetaActive]}>{item.label}</Text>
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
