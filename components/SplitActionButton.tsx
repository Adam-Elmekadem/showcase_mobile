import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { colors, radius } from "@/lib/theme";

export type ActionChoice = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export function SplitActionButton({ primary, alternates }: { primary: ActionChoice; alternates: ActionChoice[] }) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      {open && (
        <BlurView intensity={50} tint="dark" blurMethod="dimezisBlurViewSdk31Plus" style={styles.menu}>
          {alternates.map((choice) => (
            <Pressable
              key={choice.key}
              style={styles.menuRow}
              onPress={() => {
                setOpen(false);
                choice.onPress();
              }}
            >
              <Ionicons name={choice.icon} size={16} color={colors.paper} />
              <Text style={styles.menuText}>{choice.label}</Text>
            </Pressable>
          ))}
        </BlurView>
      )}

      <View style={styles.row}>
        <Pressable style={styles.primaryButton} onPress={primary.onPress}>
          <Ionicons name={primary.icon} size={16} color={colors.paper} />
          <Text style={styles.primaryText}>{primary.label}</Text>
        </Pressable>
        {alternates.length > 0 && (
          <Pressable style={styles.chevronButton} onPress={() => setOpen((current) => !current)} hitSlop={8}>
            <Ionicons name={open ? "chevron-down" : "chevron-up"} size={18} color={colors.paper} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2 },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.green,
    borderTopLeftRadius: radius.sm,
    borderBottomLeftRadius: radius.sm,
    paddingVertical: 13,
  },
  primaryText: { color: colors.paper, fontSize: 13, fontWeight: "700" },
  chevronButton: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.greenDeep,
    borderTopRightRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  menu: {
    marginBottom: 8,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  menuText: { color: colors.paper, fontSize: 13, fontWeight: "600" },
});
