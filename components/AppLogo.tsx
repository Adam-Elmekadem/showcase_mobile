import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, font } from "@/lib/theme";
import { BrandMark } from "@/components/BrandMark";

export function AppLogo() {
  return (
    <View style={styles.wrap}>
      <BrandMark size={22} />
      <Text style={styles.text}>SHOWCASE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 4, paddingBottom: 10 },
  text: { color: colors.paper, fontFamily: font.display, fontSize: 24, letterSpacing: 3 },
});
