import React from "react";
import { StyleSheet, ViewStyle, StyleProp } from "react-native";
import { BlurView } from "expo-blur";
import { radius } from "@/lib/theme";

export function GlassPanel({
  children,
  style,
  intensity = 40,
  tint = "dark",
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: "light" | "dark";
}) {
  return (
    <BlurView intensity={intensity} tint={tint} blurMethod="dimezisBlurViewSdk31Plus" style={[styles.panel, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
});
