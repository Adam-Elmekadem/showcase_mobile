import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font } from "@/lib/theme";

export function AccordionSection({
  title,
  defaultExpanded = false,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View style={styles.section}>
      <Pressable style={styles.header} onPress={() => setExpanded((current) => !current)}>
        <Text style={styles.title}>{title}</Text>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.muted} />
      </Pressable>
      {expanded && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderBottomWidth: 1, borderBottomColor: colors.line },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  title: { color: colors.paper, fontFamily: font.display, fontSize: 19, letterSpacing: 0.5 },
  body: { paddingBottom: 18 },
});
