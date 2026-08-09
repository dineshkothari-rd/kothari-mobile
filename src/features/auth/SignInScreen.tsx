import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { radius, shadow, spacing, typography, useAppTheme, type AppColors } from '../../design/tokens';
import { PrimaryButton } from '../../shared/components/PrimaryButton';
import { TextField } from '../../shared/components/TextField';

type SignInScreenProps = {
  error: string;
  loading: boolean;
  onSignIn: (email: string, password: string) => void;
};

export function SignInScreen({ error, loading, onSignIn }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.mark}>
          <Text style={styles.markText}>K</Text>
        </View>
        <Text style={styles.title}>Sign in to operations</Text>
        <Text style={styles.subtitle}>Use an admin account already registered in Firebase.</Text>

        <View style={styles.form}>
          <TextField
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="admin@example.com"
            textContentType="emailAddress"
            value={email}
          />
          <TextField
            label="Password"
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            textContentType="password"
            value={password}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label="Continue" loading={loading} onPress={() => onSignIn(email, password)} />
        </View>
      </View>
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
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  markText: {
    color: colors.onBrand,
    fontSize: 30,
    fontWeight: typography.weight.black,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: typography.weight.black,
    lineHeight: 36,
    marginTop: spacing.xl,
  },
  subtitle: {
    color: colors.muted,
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
    marginTop: spacing.xl,
    padding: spacing.lg,
    ...shadow.card,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: typography.weight.bold,
    lineHeight: 19,
  },
  });
}
