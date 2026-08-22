import { useMemo, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, shadow, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { featureModules } from '../featureModules';
import { CustomersScreen } from '../customers/CustomersScreen';
import { MoreScreen } from '../more/MoreScreen';
import { MoneyScreen } from '../money/MoneyScreen';
import { OperationsOverviewScreen } from '../operations/OperationsOverviewScreen';
import type { AdminProfile } from '../../shared/types/admin';
import { AppBadge } from '../../shared/components/AppBadge';
import { ModuleCard } from '../../shared/components/ModuleCard';
import { useLanguage } from '../../shared/i18n/LanguageProvider';
import { FirestoreRefreshContext } from '../../shared/hooks/useFirestoreCollection';

const primaryTabs = [
  { id: 'overview', label: 'Home', mark: 'H' },
  { id: 'tenants', label: 'Rooms', mark: 'R' },
  { id: 'payments', label: 'Money', mark: 'M' },
  { id: 'more', label: 'More', mark: '••' },
];

type WorkspaceScreenProps = {
  admin: AdminProfile;
  onSignOut: () => void;
};

export function WorkspaceScreen({ admin, onSignOut }: WorkspaceScreenProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const activeModules = useMemo(() => {
    if (activeTab === 'overview') return featureModules;
    if (activeTab === 'more') return featureModules.filter((feature) => !['overview', 'tenants', 'payments'].includes(feature.id));
    return featureModules.filter((feature) => feature.id === activeTab);
  }, [activeTab]);

  function refreshPage() {
    setRefreshing(true);
    setRefreshKey((current) => current + 1);
    setTimeout(() => setRefreshing(false), 900);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top + spacing.sm, spacing.lg) }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>K</Text>
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Kothari</Text>
            <Text style={styles.title}>{t('Hi')}, {admin.name}</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.exitButton}>
          <Text style={styles.exitText}>{t('Logout')}</Text>
        </Pressable>
      </View>

      <FirestoreRefreshContext.Provider value={refreshKey}>
        <ScrollView
          alwaysBounceVertical
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
          refreshControl={<RefreshControl colors={[colors.brand]} onRefresh={refreshPage} refreshing={refreshing} tintColor={colors.brand} />}
          style={styles.scroller}
        >
          {activeTab === 'overview' ? (
            <OperationsOverviewScreen />
          ) : activeTab === 'tenants' ? (
            <CustomersScreen />
          ) : activeTab === 'payments' ? (
            <MoneyScreen />
          ) : activeTab === 'more' ? (
            <MoreScreen />
          ) : (
            <>
              <View style={styles.heroPanel}>
                <View style={styles.heroTop}>
                  <Text style={styles.heroTitle}>{t('Almost ready')}</Text>
                  <AppBadge label="Soon" />
                </View>
                <Text style={styles.heroText}>
                  {t('This section is being prepared for day-to-day use.')}
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
      </FirestoreRefreshContext.Provider>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 48 : spacing.sm) }]}>
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
                <Text style={[styles.navMark, active && styles.navMarkActive]}>{tab.mark}</Text>
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>{t(tab.label)}</Text>
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
  screen: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  brandRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.md,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.copper,
    borderRadius: radius.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  brandMarkText: {
    color: colors.onBrand,
    fontSize: 20,
    fontWeight: typography.weight.black,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.panelSubtle,
    fontSize: 12,
    fontWeight: typography.weight.bold,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.onBrand,
    fontSize: 19,
    fontWeight: typography.weight.black,
    marginTop: 2,
  },
  exitButton: {
    backgroundColor: colors.overlaySubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  exitText: {
    color: colors.onBrand,
    fontSize: 13,
    fontWeight: typography.weight.black,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  scroller: {
    flex: 1,
  },
  heroPanel: {
    backgroundColor: colors.ink,
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
    color: colors.panelMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.md,
  },
  moduleList: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  nav: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    ...shadow.dock,
  },
  navItem: {
    alignItems: 'center',
    borderRadius: radius.md,
    flex: 1,
    gap: 3,
    minHeight: 50,
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: colors.ink,
  },
  navMark: {
    color: colors.subtle,
    fontSize: 12,
    fontWeight: typography.weight.black,
  },
  navMarkActive: {
    color: colors.panelAccent,
  },
  navLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: typography.weight.black,
  },
  navLabelActive: {
    color: colors.onBrand,
  },
  });
}
