import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, initializeAuth } from 'firebase/auth';
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

export function getCustomerProvisioningAuth() {
  const provisioningApp = getApps().find(({ name }) => name === 'customer-provisioning')
    ?? initializeApp(firebaseConfig, 'customer-provisioning');

  try {
    return initializeAuth(provisioningApp, { persistence: inMemoryPersistence });
  } catch {
    return getAuth(provisioningApp);
  }
}

export default app;
