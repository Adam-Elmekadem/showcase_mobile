import React from "react";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet } from "react-native";
import { useLocale } from "@/lib/i18n";
import { colors } from "@/lib/theme";
import { GlassPanel } from "@/components/GlassPanel";

export function FloatingBackButton({ style }: { style?: object }) {
  const router = useRouter();
  const { language } = useLocale();
  const insets = useSafeAreaInsets();

  return (
    <Pressable style={[styles.button, { top: insets.top + 12 }, style]} onPress={() => router.back()} hitSlop={8}>
      <GlassPanel style={styles.glass} intensity={60}>
        <Ionicons name={language === "ar" ? "arrow-forward" : "arrow-back"} size={20} color={colors.paper} />
      </GlassPanel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: "absolute", left: 16, zIndex: 10 },
  glass: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
