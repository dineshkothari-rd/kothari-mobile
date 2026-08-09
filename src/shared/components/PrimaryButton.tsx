import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typography } from '../../design/tokens';

type PrimaryButtonProps = {
  label: string;
  loading?: boolean;
  onPress: () => void;
};

export function PrimaryButton({ label, loading = false, onPress }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && !loading && styles.pressed, loading && styles.loading]}
    >
      {loading ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.label}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.84,
  },
  loading: {
    opacity: 0.72,
  },
  label: {
    color: colors.onBrand,
    fontSize: 15,
    fontWeight: typography.weight.black,
  },
});
