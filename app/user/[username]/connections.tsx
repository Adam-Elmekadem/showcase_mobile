import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { api, ApiUser } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors } from "@/lib/theme";

export default function ConnectionsScreen() {
  const { username, kind } = useLocalSearchParams<{ username: string; kind: "followers" | "following" }>();
  const { language } = useLocale();
  const router = useRouter();
  const navigation = useNavigation();

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    navigation.setOptions({
      title: kind === "following" ? pick(language, "يتابع", "Following") : pick(language, "متابعون", "Followers"),
    });
    setLoading(true);
    const request = kind === "following" ? api.getFollowing(username) : api.getFollowers(username);
    request
      .then(({ data }) => setUsers(data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [username, kind, navigation, language]);

  if (loading) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {users.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{pick(language, "لا يوجد أحد هنا بعد.", "No one here yet.")}</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/user/${item.username}`)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.username}>@{item.username}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  loaderScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.muted, fontSize: 12 },
  list: { padding: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.paperMuted, fontSize: 13, fontWeight: "700" },
  name: { color: colors.paper, fontSize: 13, fontWeight: "600" },
  username: { color: colors.muted, fontSize: 11 },
});
