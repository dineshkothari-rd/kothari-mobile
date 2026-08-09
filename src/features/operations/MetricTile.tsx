import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../design/tokens';

type MetricTileProps = {
  label: string;
  tone?: 'brand' | 'blue' | 'green' | 'orange' | 'red';
  value: string | number;
};

const toneStyles = {
  blue: { backgroundColor: colors.accentSoft, color: colors.accent },
  brand: { backgroundColor: '#CCFBF1', color: colors.brand },
  green: { backgroundColor: colors.successSoft, color: colors.success },
  orange: { backgroundColor: colors.warningSoft, color: colors.warning },
  red: { backgroundColor: '#FEE4E2', color: '#B42318' },
};

export function MetricTile({ label, tone = 'brand', value }: MetricTileProps) {
  const toneStyle = toneStyles[tone];

  return (
    <View style={styles.tile}>
      <View style={[styles.marker, { backgroundColor: toneStyle.backgroundColor }]}>
        <Text style={[styles.markerText, { color: toneStyle.color }]}>{String(label).slice(0, 1)}</Text>
      </View>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    minHeight: 132,
    padding: spacing.md,
    width: '48%',
  },
  marker: {
    alignItems: 'center',
    borderRadius: radius.sm,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  markerText: {
    fontSize: 13,
    fontWeight: typography.weight.black,
  },
  value: {
    color: colors.text,
    fontSize: 22,
    fontWeight: typography.weight.black,
    marginTop: spacing.lg,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    marginTop: 3,
  },
});
