import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { firebaseConfigStatus } from '../config/firebaseConfig';
import { SignInScreen } from '../features/auth/SignInScreen';
import { useAdminSession } from '../features/auth/useAdminSession';
import { WorkspaceScreen } from '../features/admin/WorkspaceScreen';
import { AppErrorBoundary } from '../shared/components/AppErrorBoundary';
import { AppThemeProvider, radius, spacing, typography, useAppTheme, type AppColors } from '../design/tokens';
import { LanguageProvider, useLanguage } from '../shared/i18n/LanguageProvider';

export function AppShell() {
  return (
    <AppThemeProvider>
      <LanguageProvider>
        <AppShellContent />
      </LanguageProvider>
    </AppThemeProvider>
  );
}

function AppShellContent() {
  const session = useAdminSession();
  const { colors, isDark } = useAppTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.canvas).catch(() => undefined);
    NavigationBar.setBackgroundColorAsync(colors.surface).catch(() => undefined);
    NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark').catch(() => undefined);
  }, [colors.canvas, colors.surface, isDark]);

  return (
    <AppErrorBoundary>
      <View style={styles.safeArea}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {!firebaseConfigStatus.ready ? (
          <MissingConfigScreen />
        ) : session.status === 'checking' ? (
          <CheckingScreen styles={styles} colors={colors} />
        ) : session.admin ? (
          <WorkspaceScreen admin={session.admin} onSignOut={session.signOut} />
        ) : (
          <SignInScreen error={session.error} loading={session.submitting} onSignIn={session.signIn} />
        )}
      </View>
    </AppErrorBoundary>
  );
}

function CheckingScreen({ colors, styles }: { colors: AppColors; styles: ReturnType<typeof createStyles> }) {
  const { t } = useLanguage();

  return (
    <View style={styles.centered}>
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>K</Text>
      </View>
      <ActivityIndicator color={colors.brand} style={styles.loader} />
      <Text style={styles.centerTitle}>{t('Getting things ready')}</Text>
      <Text style={styles.centerText}>{t('Opening your dashboard.')}</Text>
    </View>
  );
}

function MissingConfigScreen() {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);

  return (
    <View style={styles.centered}>
      <View style={styles.warningMark}>
        <Text style={styles.warningMarkText}>!</Text>
      </View>
      <Text style={styles.centerTitle}>{t('Setup needed')}</Text>
      <Text style={styles.centerText}>
        {t('Please complete app setup before signing in.')}
      </Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  brandMarkText: {
    color: colors.onBrand,
    fontSize: 28,
    fontWeight: typography.weight.black,
  },
  warningMark: {
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  warningMarkText: {
    color: colors.warning,
    fontSize: 28,
    fontWeight: typography.weight.black,
  },
  loader: {
    marginTop: spacing.xl,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  centerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: typography.weight.black,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  centerText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  });
}
