import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AppProfile } from '../../shared/types/admin';
import { getAppProfile, signInAccount, signOutAccount, watchAuthState } from './authService';

type SessionStatus = 'checking' | 'signedOut' | 'signedIn';

export function useAppSession() {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<SessionStatus>('checking');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = watchAuthState(async (user) => {
      setStatus('checking');

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
      } catch {
        setProfile(null);
        setError('Could not verify account access. Please try again.');
        setStatus('signedOut');
      }
    });

    return unsubscribe;
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

  return useMemo(
    () => ({
      profile,
      error,
      setError,
      signIn,
      signOut,
      status,
      submitting,
    }),
    [error, profile, signIn, signOut, status, submitting],
  );
}
