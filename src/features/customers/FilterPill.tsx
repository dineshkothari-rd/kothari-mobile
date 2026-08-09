import { Pressable, StyleSheet, Text } from 'react-native';

import { radius, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';

type FilterPillProps = {
  active: boolean;
  label: string;
  onPress: () => void;
};

export function FilterPill({ active, label, onPress }: FilterPillProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pill, active && styles.active, pressed && styles.pressed]}
    >
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  pill: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  active: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: typography.weight.black,
  },
  activeLabel: {
    color: colors.panelText,
  },
  });
}
