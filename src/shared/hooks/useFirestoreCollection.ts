import { createContext, useContext, useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';

import { db } from '../../lib/firebase/client';
import type { FirestoreRecord } from '../types/records';

type UseFirestoreCollectionOptions = {
  direction?: 'asc' | 'desc';
  enabled?: boolean;
  sortBy?: string;
};

export const FirestoreRefreshContext = createContext(0);

function getSortableValue(record: FirestoreRecord, sortBy?: string) {
  if (!sortBy) return 0;

  const value = record[sortBy];

  if (value && typeof value === 'object' && 'seconds' in value) {
    return Number(value.seconds) || 0;
  }

  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;

  return 0;
}

function sortRecords<TRecord extends FirestoreRecord>(
  records: TRecord[],
  sortBy?: string,
  direction: 'asc' | 'desc' = 'desc',
) {
  if (!sortBy) return records;

  const multiplier = direction === 'asc' ? 1 : -1;

  return [...records].sort((first, second) => {
    const firstValue = getSortableValue(first, sortBy);
    const secondValue = getSortableValue(second, sortBy);

    if (firstValue === secondValue) return 0;
    return firstValue > secondValue ? multiplier : -multiplier;
  });
}

export function useFirestoreCollection<TRecord extends FirestoreRecord>(
  collectionName: string,
  options: UseFirestoreCollectionOptions = {},
) {
  const { direction = 'desc', enabled = true, sortBy } = options;
  const refreshKey = useContext(FirestoreRefreshContext);
  const [data, setData] = useState<TRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(enabled));

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      collection(db, collectionName),
      (snapshot) => {
        const records = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        })) as TRecord[];

        setData(sortRecords(records, sortBy, direction));
        setError('');
        setLoading(false);
      },
      (snapshotError) => {
        setError(snapshotError.message || `Could not load ${collectionName}.`);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [collectionName, direction, enabled, refreshKey, sortBy]);

  return { data, error, loading };
}
