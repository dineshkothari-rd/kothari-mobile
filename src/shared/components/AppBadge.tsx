import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { useLanguage } from '../i18n/LanguageProvider';

type AppBadgeProps = {
  label: string;
  tone?: 'success' | 'warning' | 'neutral';
};

export function AppBadge({ label, tone = 'neutral' }: AppBadgeProps) {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);

  return (
    <View style={[styles.badge, tone === 'success' && styles.success, tone === 'warning' && styles.warning]}>
      <Text style={[styles.label, tone === 'success' && styles.successText, tone === 'warning' && styles.warningText]}>
        {t(label)}
      </Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  badge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: typography.weight.bold,
  },
  success: {
    backgroundColor: colors.successSoft,
  },
  successText: {
    color: colors.success,
  },
  warning: {
    backgroundColor: colors.warningSoft,
  },
  warningText: {
    color: colors.warning,
  },
  });
}
