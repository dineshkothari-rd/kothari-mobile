import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../../lib/firebase/client';
import type { AdminProfile } from '../../shared/types/admin';

export function watchAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getAdminProfile(user: User | null): Promise<AdminProfile | null> {
  if (!user?.email) return null;

  const adminRef = doc(db, 'admins', user.email);
  const adminSnap = await getDoc(adminRef);

  if (!adminSnap.exists()) return null;

  return {
    email: user.email,
    name: String(adminSnap.data().name || user.email),
  };
}

export async function signInAdmin(email: string, password: string) {
  const result = await signInWithEmailAndPassword(auth, email.trim(), password);
  const profile = await getAdminProfile(result.user);

  if (!profile) {
    await signOut(auth);
    throw new Error('Access denied. This account is not an admin.');
  }

  return profile;
}

export async function signOutAdmin() {
  await signOut(auth);
}
