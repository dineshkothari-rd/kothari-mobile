import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AdminProfile } from '../../shared/types/admin';
import { getAdminProfile, signInAdmin, signOutAdmin, watchAuthState } from './authService';

type SessionStatus = 'checking' | 'signedOut' | 'signedIn';

export function useAdminSession() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<SessionStatus>('checking');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = watchAuthState(async (user) => {
      setStatus('checking');

      if (!user) {
        setAdmin(null);
        setStatus('signedOut');
        return;
      }

      try {
        const profile = await getAdminProfile(user);

        if (!profile) {
          await signOutAdmin();
          setAdmin(null);
          setError('Access denied. This account is not an admin.');
          setStatus('signedOut');
          return;
        }

        setAdmin(profile);
        setError('');
        setStatus('signedIn');
      } catch {
        setAdmin(null);
        setError('Could not verify admin access. Please try again.');
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
      const profile = await signInAdmin(email, password);
      setAdmin(profile);
      setStatus('signedIn');
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Invalid email or password.');
      setAdmin(null);
      setStatus('signedOut');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setSubmitting(true);
    setError('');

    try {
      await signOutAdmin();
      setAdmin(null);
      setStatus('signedOut');
    } finally {
      setSubmitting(false);
    }
  }, []);

  return useMemo(
    () => ({
      admin,
      error,
      setError,
      signIn,
      signOut,
      status,
      submitting,
    }),
    [admin, error, signIn, signOut, status, submitting],
  );
}
