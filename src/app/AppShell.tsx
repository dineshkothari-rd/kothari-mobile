import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { firebaseConfigStatus } from '../config/firebaseConfig';
import { SignInScreen } from '../features/auth/SignInScreen';
import { useAdminSession } from '../features/auth/useAdminSession';
import { WorkspaceScreen } from '../features/admin/WorkspaceScreen';
import { AppErrorBoundary } from '../shared/components/AppErrorBoundary';
import { colors, radius, spacing, typography } from '../design/tokens';

export function AppShell() {
  const session = useAdminSession();

  return (
    <AppErrorBoundary>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        {!firebaseConfigStatus.ready ? (
          <MissingConfigScreen />
        ) : session.status === 'checking' ? (
          <CheckingScreen />
        ) : session.admin ? (
          <WorkspaceScreen admin={session.admin} onSignOut={session.signOut} />
        ) : (
          <SignInScreen error={session.error} loading={session.submitting} onSignIn={session.signIn} />
        )}
      </SafeAreaView>
    </AppErrorBoundary>
  );
}

function CheckingScreen() {
  return (
    <View style={styles.centered}>
      <View style={styles.brandMark}>
        <Text style={styles.brandMarkText}>K</Text>
      </View>
      <ActivityIndicator color={colors.brand} style={styles.loader} />
      <Text style={styles.centerTitle}>Checking admin access</Text>
      <Text style={styles.centerText}>Preparing the secure operations workspace.</Text>
    </View>
  );
}

function MissingConfigScreen() {
  return (
    <View style={styles.centered}>
      <View style={styles.warningMark}>
        <Text style={styles.warningMarkText}>!</Text>
      </View>
      <Text style={styles.centerTitle}>Firebase is not configured</Text>
      <Text style={styles.centerText}>
        Add the Expo public Firebase environment variables before signing in.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
