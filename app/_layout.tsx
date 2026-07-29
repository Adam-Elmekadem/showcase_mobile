import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, LogBox } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LocaleProvider } from "@/lib/i18n";
import { colors } from "@/lib/theme";

// React Native's own LogBox module uses InteractionManager internally and
// warns about it; the app itself never calls the deprecated API, so this
// is React Native warning about React Native, not something we can fix here.
LogBox.ignoreLogs(["InteractionManager has been deprecated"]);

function RootNavigation() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/login");
    } else if (user && inAuthGroup) {
      router.replace("/");
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink }}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.paper,
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.paper },
        contentStyle: { backgroundColor: colors.ink },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="film/[slug]" options={{ title: "" }} />
      <Stack.Screen name="log/[tmdbId]" options={{ presentation: "modal", title: "Log film" }} />
      <Stack.Screen name="person/[slug]" options={{ title: "" }} />
      <Stack.Screen name="user/[username]" options={{ title: "" }} />
      <Stack.Screen name="user/[username]/connections" options={{ title: "" }} />
      <Stack.Screen name="showcase/[username]/[slug]" options={{ title: "" }} />
      <Stack.Screen name="showcase/new" options={{ presentation: "modal", title: "New showcase" }} />
      <Stack.Screen name="showcase/edit/[id]" options={{ presentation: "modal", title: "Edit showcase" }} />
      <Stack.Screen name="watchlist" options={{ title: "Watchlist" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="find-friends" options={{ title: "Find friends" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LocaleProvider>
          <AuthProvider>
            <StatusBar style="light" />
            <RootNavigation />
          </AuthProvider>
        </LocaleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
