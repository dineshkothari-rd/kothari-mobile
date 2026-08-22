import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
// @ts-expect-error Firebase's public types omit this documented React Native export.
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import firebaseConfig from '../../config/firebaseConfig';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

function createAuth() {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);
export default app;
