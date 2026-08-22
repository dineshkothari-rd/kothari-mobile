import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { ActivityIndicator, AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { firebaseConfigStatus } from '../config/firebaseConfig';
import { SignInScreen } from '../features/auth/SignInScreen';
import { useAppSession } from '../features/auth/useAdminSession';
import { WorkspaceScreen } from '../features/admin/WorkspaceScreen';
import { CustomerWorkspaceScreen } from '../features/customer/CustomerWorkspaceScreen';
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
  const session = useAppSession();
  const { colors, isDark } = useAppTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.canvas).catch(() => undefined);
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark').catch(() => undefined);
    }
  }, [colors.canvas, isDark]);

  return (
    <AppErrorBoundary>
      <View style={styles.safeArea}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {!firebaseConfigStatus.ready ? (
          <MissingConfigScreen />
        ) : session.status === 'checking' ? (
          <CheckingScreen styles={styles} colors={colors} />
        ) : session.profile && (session.profile.accessStatus === 'suspended' || session.profile.accessStatus === 'revoked') ? (
          <AccountAccessScreen accessStatus={session.profile.accessStatus} onSignOut={session.signOut} />
        ) : session.profile && !session.profile.emailVerified ? (
          <EmailVerificationScreen
            email={session.profile.email}
            onRefresh={session.refreshProfile}
            onSend={session.sendAccountVerification}
            onSignOut={session.signOut}
          />
        ) : session.profile?.role === 'customer' ? (
          <CustomerWorkspaceScreen onSignOut={session.signOut} profile={session.profile} />
        ) : session.profile ? (
          <WorkspaceScreen admin={session.profile} onSignOut={session.signOut} />
        ) : (
          <SignInScreen error={session.error} loading={session.submitting} onForgotPassword={session.requestPasswordReset} onSignIn={session.signIn} />
        )}
      </View>
    </AppErrorBoundary>
  );
}

function EmailVerificationScreen({ email, onRefresh, onSend, onSignOut }: {
  email: string;
  onRefresh: () => Promise<boolean>;
  onSend: () => Promise<void>;
  onSignOut: () => void;
}) {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const sent = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function sendVerification() {
    setBusy(true);
    setMessage('');
    try {
      await onSend();
      setMessage(t('Verification email sent. Check your inbox.'));
    } catch (sendError) {
      setMessage(sendError instanceof Error ? sendError.message : t('Could not send verification email.'));
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    setMessage('');
    try {
      if (!await onRefresh()) setMessage(t('Email is not verified yet.'));
    } catch (refreshError) {
      setMessage(refreshError instanceof Error ? refreshError.message : t('Could not refresh account access. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    sendVerification();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') onRefresh().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [onRefresh]);

  return (
    <View style={styles.centered}>
      <View style={styles.brandMark}><Text style={styles.brandMarkText}>@</Text></View>
      <Text style={styles.centerTitle}>{t('Verify your email')}</Text>
      <Text style={styles.centerText}>{t('We sent a verification link to')} {email}.</Text>
      {message ? <Text accessibilityLiveRegion="polite" style={styles.verificationMessage}>{message}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={refresh} style={styles.signOutButton}>
        <Text style={styles.signOutText}>{t(busy ? 'Checking...' : "I've verified my email")}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={sendVerification} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>{t('Resend verification email')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={busy} onPress={onSignOut} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>{t('Logout')}</Text>
      </Pressable>
    </View>
  );
}

function AccountAccessScreen({ accessStatus, onSignOut }: { accessStatus: 'revoked' | 'suspended'; onSignOut: () => void }) {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const suspended = accessStatus === 'suspended';

  return (
    <View style={styles.centered}>
      <View style={styles.warningMark}><Text style={styles.warningMarkText}>!</Text></View>
      <Text style={styles.centerTitle}>{t(suspended ? 'Access suspended' : 'Access revoked')}</Text>
      <Text style={styles.centerText}>
        {t(suspended ? 'Please contact the administrator to restore your access.' : 'This account is no longer active.')}
      </Text>
      <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>{t('Logout')}</Text>
      </Pressable>
    </View>
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
  signOutButton: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  signOutText: {
    color: colors.onBrand,
    fontSize: 13,
    fontWeight: typography.weight.black,
  },
  secondaryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: typography.weight.black,
  },
  verificationMessage: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  });
}
