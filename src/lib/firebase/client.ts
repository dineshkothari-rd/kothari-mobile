import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, inMemoryPersistence, initializeAuth } from 'firebase/auth';
// @ts-expect-error Firebase's public types omit this documented React Native export.
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

import firebaseConfig from '../../config/firebaseConfig';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

async function secureKey(key: string) {
  return `firebase_auth_${await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key)}`;
}

const secureAuthStorage = {
  async getItem(key: string) {
    const encryptedKey = await secureKey(key);
    const stored = await SecureStore.getItemAsync(encryptedKey);
    if (stored !== null) return stored;

    const legacy = await AsyncStorage.getItem(key);
    if (legacy !== null) {
      await SecureStore.setItemAsync(encryptedKey, legacy);
      await AsyncStorage.removeItem(key);
    }
    return legacy;
  },
  async removeItem(key: string) {
    await Promise.all([
      SecureStore.deleteItemAsync(await secureKey(key)),
      AsyncStorage.removeItem(key),
    ]);
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(await secureKey(key), value);
  },
};

function createAuth() {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(Platform.OS === 'web' ? AsyncStorage : secureAuthStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);

export function getProvisioningAuth() {
  const provisioningApp = getApps().find(({ name }) => name === 'account-provisioning' || name === 'customer-provisioning')
    ?? initializeApp(firebaseConfig, 'account-provisioning');

  try {
    return initializeAuth(provisioningApp, { persistence: inMemoryPersistence });
  } catch {
    return getAuth(provisioningApp);
  }
}

export default app;
