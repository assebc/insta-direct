import { SafeAreaProvider } from 'react-native-safe-area-context';

import InstagramScreen from './src/InstagramScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <InstagramScreen />
    </SafeAreaProvider>
  );
}
