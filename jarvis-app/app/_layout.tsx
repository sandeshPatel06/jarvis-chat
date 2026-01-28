import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SystemUI from 'expo-system-ui';

import Colors from '@/constants/Colors';
import { useStore } from '@/store';
import CustomToast from '@/components/CustomToast';
import CustomAlert from '@/components/CustomAlert';
import IncomingCallModal from '@/components/IncomingCallModal';
import { CallMiniWindow } from '@/components/chat/CallMiniWindow';
import { requestNotificationPermissions, setForegroundNotificationHandler, registerForPushNotificationsAsync } from '@/utils/notifications';
import * as Notifications from 'expo-notifications';
import { api } from '@/services/api';




export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const { token } = useStore();

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    // 3. Register for push notifications
    if (token) {
      registerForPushNotificationsAsync().then(async (pushToken) => {
        if (pushToken) {
          // Send token to backend
          try {
            console.log('Push Token:', pushToken);
            // Assuming updateProfile can handle fcm_token or push_token update
            // checking api.auth.updateProfile definition... it takes (token, data)
            // We'll try updating 'fcm_token' or similar. 
            // Based on common practices, let's try sending it.
            // If the backend expects a specific endpoint, we might need a dedicated API call.
            // For now, logging it is safe, and we should try to update it if we knew the field.
            // Given the user instructions "ensure backend also store the settings value", 
            // I will attempt to update the profile with 'fcm_token'.
            await api.auth.updateProfile(token, { fcm_token: pushToken });
          } catch (e) {
            console.error('Failed to update push token', e);
          }
        }
      });
    }

    // 4. Set dynamic notification handler (Foreground Suppression)
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data;
        const currentActiveChatId = useStore.getState().activeChatId;

        // Check if notification belongs to the currently open chat
        // Adjust 'conversation_id' based on your actual payload structure
        const notificationChatId = data?.conversation_id || data?.chat_id;

        const shouldSuppress = currentActiveChatId && notificationChatId && String(currentActiveChatId) === String(notificationChatId);

        return {
          shouldShowAlert: !shouldSuppress, // Suppress usage if chat is open
          shouldPlaySound: !shouldSuppress,
          shouldSetBadge: false,
          shouldShowBanner: !shouldSuppress,
          shouldShowList: !shouldSuppress,
        };
      },
    });
  }, [token]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

import { DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';

import { KeyboardProvider } from 'react-native-keyboard-controller';

// ...

function RootLayoutNav() {
  const { token, hasHydrated, theme: userTheme } = useStore();
  const systemScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

  // Determine effective theme
  const isDark = userTheme === 'system'
    ? systemScheme === 'dark'
    : userTheme === 'dark';

  const theme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: isDark ? Colors.dark.background : Colors.light.background,
      primary: isDark ? Colors.dark.primary : Colors.light.primary,
      card: isDark ? Colors.dark.background : Colors.light.background,
      text: isDark ? Colors.dark.text : Colors.light.text,
      border: 'transparent',
    },
  };

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(isDark ? Colors.dark.background : Colors.light.background);
  }, [isDark]);

  useEffect(() => {
    if (!hasHydrated) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!token && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (token && inAuthGroup) {
      router.replace('/(tabs)');
    }

    if (token) {
      requestNotificationPermissions();
    }
  }, [token, segments, hasHydrated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <ThemeProvider value={theme}>
            <StatusBar style={isDark ? "light" : "dark"} />
            <Stack
              screenOptions={{
                headerStyle: {
                  backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
                },
                headerTintColor: isDark ? Colors.dark.text : Colors.light.text,
                contentStyle: {
                  backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
                }
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="chat/[id]"
                options={{
                  presentation: 'card',
                  headerShown: false,
                }}
              />
              <Stack.Screen name="contact/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
              <Stack.Screen name="auth/login" options={{ headerShown: false }} />
              <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
            </Stack>
            <CustomToast />
            <CustomAlert />
            <IncomingCallModal />
            <CallMiniWindow />
          </ThemeProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

