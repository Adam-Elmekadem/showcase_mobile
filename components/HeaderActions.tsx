import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";
import { NotificationBell } from "@/components/NotificationBell";
import { AccountMenuSheet } from "@/components/AccountMenuSheet";

export function HeaderActions() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <View style={styles.row}>
      <NotificationBell />
      <Pressable onPress={() => setMenuOpen(true)} hitSlop={8}>
        <View style={styles.avatar}>
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
          )}
        </View>
      </Pressable>

      <AccountMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onLogout={() => {
          setMenuOpen(false);
          logout();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: colors.paperMuted, fontSize: 13, fontWeight: "600" },
});
