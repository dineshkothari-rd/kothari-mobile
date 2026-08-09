import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../design/tokens';
import { AppBadge } from './AppBadge';
import type { FeatureModule } from '../../features/featureModules';

const statusLabel = {
  ready: 'Ready',
  next: 'Next',
  planned: 'Planned',
};

export function ModuleCard({ feature }: { feature: FeatureModule }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{feature.title}</Text>
        <AppBadge label={statusLabel[feature.status]} tone={feature.status === 'ready' ? 'success' : 'neutral'} />
      </View>
      <Text style={styles.description}>{feature.description}</Text>
      {feature.sourceCollection ? (
        <Text style={styles.collection}>Firestore: {feature.sourceCollection}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: typography.weight.black,
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  collection: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    marginTop: spacing.md,
  },
});
