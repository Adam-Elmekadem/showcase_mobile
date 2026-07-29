import React, { useCallback } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [hasUnread, setHasUnread] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      api
        .getNotifications()
        .then(({ data }) => setHasUnread(data.some((item) => !item.read_at)))
        .catch(() => {});
    }, [user])
  );

  if (!user) return null;

  return (
    <Pressable style={styles.button} onPress={() => router.push("/notifications")} hitSlop={8}>
      <Ionicons name="notifications-outline" size={20} color={colors.paper} />
      {hasUnread && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { position: "relative", padding: 4 },
  dot: { position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange, borderWidth: 1, borderColor: colors.ink },
});
