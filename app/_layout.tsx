import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, LogBox } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { BebasNeue_400Regular } from "@expo-google-fonts/bebas-neue";
import {
  NotoKufiArabic_400Regular,
  NotoKufiArabic_500Medium,
  NotoKufiArabic_600SemiBold,
  NotoKufiArabic_700Bold,
} from "@expo-google-fonts/noto-kufi-arabic";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LocaleProvider } from "@/lib/i18n";
import { PreferencesProvider } from "@/lib/preferences";
import { SuggestRevealProvider } from "@/lib/SuggestRevealContext";
import { colors, font } from "@/lib/theme";

// React Native's own LogBox module uses InteractionManager internally and
// warns about it; the app itself never calls the deprecated API, so this
// is React Native warning about React Native, not something we can fix here.
LogBox.ignoreLogs(["InteractionManager has been deprecated"]);

SplashScreen.preventAutoHideAsync();

// Applies the app's body font to every <Text> without having to touch every
// screen's styles individually. RN's custom TTF families don't respond to
// the `fontWeight` style prop the way system fonts do (no synthetic bolding),
// so this uses the SemiBold cut as the baseline — most of the app's primary
// UI text already asks for 600/700, and secondary/muted text stays visually
// distinct via its color rather than weight.
(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.style = [{ fontFamily: font.body }, (Text as any).defaultProps.style];

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
      <Stack.Screen name="film/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="log/[tmdbId]" options={{ presentation: "modal", title: "Log film" }} />
      <Stack.Screen name="quote/[tmdbId]" options={{ presentation: "modal", title: "Quote" }} />
      <Stack.Screen name="person/[slug]" options={{ title: "" }} />
      <Stack.Screen name="user/[username]" options={{ title: "" }} />
      <Stack.Screen name="user/[username]/connections" options={{ title: "" }} />
      <Stack.Screen name="showcase/[username]/[slug]" options={{ title: "" }} />
      <Stack.Screen name="showcase/new" options={{ presentation: "modal", title: "New showcase" }} />
      <Stack.Screen name="showcase/edit/[id]" options={{ presentation: "modal", title: "Edit showcase" }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="swipe" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
      <Stack.Screen name="suggestions" options={{ title: "Suggestions" }} />
      <Stack.Screen name="find-friends" options={{ title: "Find friends" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    NotoKufiArabic_400Regular,
    NotoKufiArabic_500Medium,
    NotoKufiArabic_600SemiBold,
    NotoKufiArabic_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LocaleProvider>
          <PreferencesProvider>
            <AuthProvider>
              <StatusBar style="light" />
              <SuggestRevealProvider>
                <RootNavigation />
              </SuggestRevealProvider>
            </AuthProvider>
          </PreferencesProvider>
        </LocaleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
