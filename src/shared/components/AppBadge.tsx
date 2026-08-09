import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../design/tokens';

type AppBadgeProps = {
  label: string;
  tone?: 'success' | 'warning' | 'neutral';
};

export function AppBadge({ label, tone = 'neutral' }: AppBadgeProps) {
  return (
    <View style={[styles.badge, tone === 'success' && styles.success, tone === 'warning' && styles.warning]}>
      <Text style={[styles.label, tone === 'success' && styles.successText, tone === 'warning' && styles.warningText]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
