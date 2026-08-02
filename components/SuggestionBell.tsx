import React, { useCallback, useState } from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export function SuggestionBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api
        .getSuggestions()
        .then(({ data }) => setUnreadCount(data.filter((item) => !item.read_at).length))
        .catch(() => {});
    }, [user])
  );

  if (!user) return null;

  return (
    <Pressable style={styles.button} onPress={() => router.push("/suggestions" as never)} hitSlop={8}>
      <Ionicons name="paper-plane-outline" size={20} color={colors.paper} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: "relative", padding: 4 },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.orange,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: colors.paper, fontSize: 9, fontWeight: "700", lineHeight: 11 },
});
