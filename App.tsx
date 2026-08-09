import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppShell } from './src/app/AppShell';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}
