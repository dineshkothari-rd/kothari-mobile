import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../design/tokens';
import { featureModules } from '../featureModules';
import { OperationsOverviewScreen } from '../operations/OperationsOverviewScreen';
import type { AdminProfile } from '../../shared/types/admin';
import { AppBadge } from '../../shared/components/AppBadge';
import { ModuleCard } from '../../shared/components/ModuleCard';

const primaryTabs = [
  { id: 'overview', label: 'Home' },
  { id: 'tenants', label: 'Rooms' },
  { id: 'payments', label: 'Money' },
  { id: 'more', label: 'More' },
];

type WorkspaceScreenProps = {
  admin: AdminProfile;
  onSignOut: () => void;
};

export function WorkspaceScreen({ admin, onSignOut }: WorkspaceScreenProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const activeModules = useMemo(() => {
    if (activeTab === 'overview') return featureModules;
    if (activeTab === 'more') return featureModules.filter((feature) => !['overview', 'tenants', 'payments'].includes(feature.id));
    return featureModules.filter((feature) => feature.id === activeTab);
  }, [activeTab]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Workspace</Text>
          <Text style={styles.title}>Good to see you, {admin.name}.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.exitButton}>
          <Text style={styles.exitText}>Exit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'overview' ? (
          <OperationsOverviewScreen />
        ) : (
          <>
            <View style={styles.heroPanel}>
              <View style={styles.heroTop}>
                <Text style={styles.heroTitle}>Feature staging</Text>
                <AppBadge label="Coming next" />
              </View>
              <Text style={styles.heroText}>
                This section will be rebuilt from pg-mobile with a new flow and interface.
              </Text>
            </View>

            <View style={styles.moduleList}>
              {activeModules.map((feature) => (
                <ModuleCard feature={feature} key={feature.id} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.nav}>
        {primaryTabs.map((tab) => {
          const active = tab.id === activeTab;

          return (
            <Pressable
              accessibilityRole="button"
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.navItem, active && styles.navItemActive]}
            >
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: typography.weight.black,
    marginTop: 2,
  },
  exitButton: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exitText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: typography.weight.black,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 104,
  },
  heroPanel: {
    backgroundColor: colors.text,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  heroTop: {
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroTitle: {
    color: colors.onBrand,
    fontSize: 24,
    fontWeight: typography.weight.black,
    lineHeight: 30,
  },
  heroText: {
    color: '#D0D5DD',
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.md,
  },
  moduleList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  nav: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    bottom: spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    left: spacing.lg,
    padding: spacing.sm,
    position: 'absolute',
    right: spacing.lg,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: colors.brand,
  },
  navLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: typography.weight.black,
  },
  navLabelActive: {
    color: colors.onBrand,
  },
});
