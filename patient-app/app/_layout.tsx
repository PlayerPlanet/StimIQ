import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1e3a5f' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#f0f4f8' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'StimIQ' }} />
        <Stack.Screen name="daily-report" options={{ title: 'Daily Report' }} />
        <Stack.Screen name="imu-tracking" options={{ title: 'IMU Tracking' }} />
        <Stack.Screen
          name="standard-tests/index"
          options={{ title: 'Standard Tests' }}
        />
        <Stack.Screen
          name="standard-tests/hand-movement/start"
          options={{ title: 'Hand Movement Test' }}
        />
        <Stack.Screen
          name="standard-tests/hand-movement/session"
          options={{ title: 'Hand Movement Session' }}
        />
        <Stack.Screen
          name="standard-tests/finger-tapping/start"
          options={{ title: 'Finger Tapping Test' }}
        />
        <Stack.Screen
          name="standard-tests/finger-tapping/session"
          options={{ title: 'Finger Tapping Session' }}
        />
        <Stack.Screen
          name="standard-tests/speech-task/start"
          options={{ title: 'Speech Task' }}
        />
        <Stack.Screen
          name="standard-tests/speech-task/session"
          options={{ title: 'Speech Task Session' }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
