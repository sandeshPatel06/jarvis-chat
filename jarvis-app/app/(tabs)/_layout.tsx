import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { useAppTheme } from '@/hooks/useAppTheme';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary, // Use primary brand color
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 0,
          elevation: 0, // Remove default shadow
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
          position: 'absolute', // Floating effect
          bottom: 20,
          left: 20,
          right: 20,
          borderRadius: 30, // Pill shape
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 10,
          },
          shadowOpacity: 0.1, // Soft premium shadow
          shadowRadius: 10,
        },
        tabBarItemStyle: {
          borderRadius: 30,
          paddingVertical: 5,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: 5,
          display: 'none', // Hide labels for cleaner look (optional, but requested "modern")
        },
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.itemSeparator,
          height: Platform.OS === 'ios' ? 100 : 80, // Taller header
        },
        headerTitleStyle: {
          color: colors.text,
          fontSize: 24, // Larger title
          fontWeight: '700',
        },
        headerTitleAlign: 'left',
        headerTitleContainerStyle: {
          paddingBottom: 10,
          paddingLeft: 10
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Chats',
          headerTitle: 'Chats',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', top: 10 }}>
              <FontAwesome name="comments" size={24} color={color} />
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginTop: 4 }} />}
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: 20, gap: 20, paddingBottom: 10 }}>
              <FontAwesome name="search" size={20} color={colors.primary} />
              <FontAwesome name="edit" size={20} color={colors.primary} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          headerTitle: 'Calls',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', top: 10 }}>
              <FontAwesome name="phone" size={24} color={color} />
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginTop: 4 }} />}
            </View>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: 20, gap: 20, paddingBottom: 10 }}>
              <FontAwesome name="phone-square" size={20} color={colors.primary} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: 'People',
          headerTitle: 'People',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', top: 10 }}>
              <FontAwesome name="users" size={24} color={color} />
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginTop: 4 }} />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerTitle: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', top: 10 }}>
              <FontAwesome name="cog" size={24} color={color} />
              {focused && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color, marginTop: 4 }} />}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
