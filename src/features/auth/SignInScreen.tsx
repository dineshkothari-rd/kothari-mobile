import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, shadow, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { TextField } from '../../shared/components/TextField';
import { useLanguage } from '../../shared/i18n/LanguageProvider';

type SignInScreenProps = {
  error: string;
  loading: boolean;
  onSignIn: (email: string, password: string) => void;
};

export function SignInScreen({ error, loading, onSignIn }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();

  function submit() {
    if (!loading) onSignIn(email.trim(), password);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.xl), paddingTop: Math.max(insets.top, spacing.xl) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.hero}>
            <View style={styles.mark}>
              <Text style={styles.markText}>K</Text>
            </View>
            <Text style={styles.eyebrow}>Kothari</Text>
            <Text style={styles.title}>{t('Welcome back')}</Text>
            <Text style={styles.subtitle}>{t('Sign in to manage your stay, membership, rooms, and payments.')}</Text>
          </View>

          <View style={styles.form}>
            <View>
              <Text style={styles.formTitle}>{t('Secure login')}</Text>
              <Text style={styles.formSubtitle}>{t('Only approved accounts can open the app.')}</Text>
            </View>
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!loading}
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="admin@example.com"
              returnKeyType="next"
              textContentType="emailAddress"
              value={email}
            />
            <View>
              <TextField
                autoComplete="password"
                editable={!loading}
                label="Password"
                onChangeText={setPassword}
                onSubmitEditing={submit}
                placeholder="Password"
                returnKeyType="done"
                secureTextEntry={!passwordVisible}
                textContentType="password"
                value={password}
              />
              <Pressable
                accessibilityRole="button"
                disabled={loading}
                hitSlop={8}
                onPress={() => setPasswordVisible((visible) => !visible)}
                style={styles.passwordToggle}
              >
                <Text style={styles.passwordToggleText}>{t(passwordVisible ? 'Hide password' : 'Show password')}</Text>
              </Pressable>
            </View>
            {error ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {t(error)}
              </Text>
            ) : null}
            <PrimaryButton label="Continue" loading={loading} onPress={submit} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  container: {
    alignSelf: 'center',
    maxWidth: 520,
    width: '100%',
  },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.copper,
    borderRadius: radius.md,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  markText: {
    color: colors.onBrand,
    fontSize: 27,
    fontWeight: typography.weight.black,
  },
  eyebrow: {
    color: colors.panelAccent,
    fontSize: 12,
    fontWeight: typography.weight.black,
    letterSpacing: 1.2,
    marginTop: spacing.xl,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.panelText,
    fontSize: 32,
    fontWeight: typography.weight.black,
    lineHeight: 36,
    marginTop: spacing.sm,
  },
  subtitle: {
    color: colors.panelMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  form: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  formTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: typography.weight.black,
  },
  formSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: spacing.xs,
  },
  passwordToggle: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
  },
  passwordToggleText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: typography.weight.black,
  },
  error: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    color: colors.danger,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    lineHeight: 19,
    padding: spacing.md,
  },
  });
}
