import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AppProfile } from '../../shared/types/admin';
import { getAppProfile, refreshSignedInProfile, requestPasswordReset, sendAccountVerification, signInAccount, signOutAccount, watchAppProfile, watchAuthState } from './authService';

type SessionStatus = 'checking' | 'signedOut' | 'signedIn';

export function useAppSession() {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<SessionStatus>('checking');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let stopProfile: () => void = () => undefined;
    const unsubscribe = watchAuthState(async (user) => {
      stopProfile();

      if (!user) {
        setProfile(null);
        setStatus('signedOut');
        return;
      }

      try {
        const nextProfile = await getAppProfile(user);

        if (!nextProfile) {
          await signOutAccount();
          setProfile(null);
          setError('Access denied. This account has not been approved.');
          setStatus('signedOut');
          return;
        }

        setProfile(nextProfile);
        setError('');
        setStatus('signedIn');
        stopProfile = watchAppProfile(user, (updatedProfile) => {
          if (!updatedProfile) {
            signOutAccount().catch(() => undefined);
            return;
          }
          setProfile(updatedProfile);
        }, () => setError('Could not refresh account access. Please try again.'));
      } catch {
        setProfile(null);
        setError('Could not verify account access. Please try again.');
        setStatus('signedOut');
      }
    });

    return () => {
      stopProfile();
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password) {
      setError('Enter email and password to continue.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const nextProfile = await signInAccount(email, password);
      setProfile(nextProfile);
      setStatus('signedIn');
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Invalid email or password.');
      setProfile(null);
      setStatus('signedOut');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setSubmitting(true);
    setError('');

    try {
      await signOutAccount();
      setProfile(null);
      setStatus('signedOut');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const nextProfile = await refreshSignedInProfile();
    if (nextProfile) setProfile(nextProfile);
    return Boolean(nextProfile?.emailVerified);
  }, []);

  return useMemo(
    () => ({
      profile,
      error,
      refreshProfile,
      requestPasswordReset,
      sendAccountVerification,
      setError,
      signIn,
      signOut,
      status,
      submitting,
    }),
    [error, profile, refreshProfile, signIn, signOut, status, submitting],
  );
}
