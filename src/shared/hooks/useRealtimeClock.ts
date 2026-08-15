import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const DEFAULT_INTERVAL_MS = 30_000;

export function useRealtimeClock(intervalMs = DEFAULT_INTERVAL_MS) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const interval = setInterval(refresh, intervalMs);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [intervalMs]);

  return now;
}
