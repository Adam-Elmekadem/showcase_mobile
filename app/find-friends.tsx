import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, FlatList, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiUser } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export default function FindFriendsScreen() {
  const { language } = useLocale();
  const { user, setUser } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [followBusy, setFollowBusy] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const { data } = await api.searchUsers(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function toggleFollow(target: ApiUser) {
    const wasFollowing = target.is_followed_by_viewer;
    setFollowBusy(target.id);
    try {
      const { data } = wasFollowing ? await api.unfollowUser(target.username) : await api.followUser(target.username);
      setResults((current) => current.map((item) => (item.id === target.id ? { ...item, ...data } : item)));
      // The follow/unfollow endpoints return the target user, not the viewer, so
      // bump the viewer's own following count locally rather than waiting for a
      // full profile refresh.
      if (user) {
        setUser({
          ...user,
          stats: {
            films_logged: user.stats?.films_logged ?? 0,
            lists: user.stats?.lists ?? 0,
            followers: user.stats?.followers ?? 0,
            following: Math.max(0, (user.stats?.following ?? 0) + (wasFollowing ? -1 : 1)),
          },
        });
      }
    } catch {
      // leave as-is; user can retry
    } finally {
      setFollowBusy(null);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={pick(language, "ابحث بالاسم أو اسم المستخدم...", "Search by name or username...")}
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoFocus
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            searched ? (
              <Text style={styles.empty}>{pick(language, "لا توجد نتائج.", "No results.")}</Text>
            ) : (
              <Text style={styles.hint}>{pick(language, "ابحث عن أصدقائك بالاسم أو اسم المستخدم.", "Search for friends by name or username.")}</Text>
            )
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/user/${item.username}`)}>
              <View style={styles.avatar}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} contentFit="cover" />
                ) : (
                  <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.username}>@{item.username}</Text>
              </View>
              <Pressable
                style={[styles.followButton, item.is_followed_by_viewer && styles.followButtonActive]}
                onPress={() => toggleFollow(item)}
                disabled={followBusy === item.id}
              >
                {followBusy === item.id ? (
                  <ActivityIndicator size="small" color={item.is_followed_by_viewer ? colors.muted : colors.paper} />
                ) : (
                  <Text style={[styles.followButtonText, item.is_followed_by_viewer && styles.followButtonTextActive]}>
                    {item.is_followed_by_viewer ? pick(language, "متابَع", "Following") : pick(language, "متابعة", "Follow")}
                  </Text>
                )}
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink, padding: 16, gap: 14 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, color: colors.paper, fontSize: 13 },
  list: { paddingBottom: 24 },
  empty: { color: colors.muted, fontSize: 12, textAlign: "center", paddingVertical: 30 },
  hint: { color: colors.muted, fontSize: 12, textAlign: "center", paddingVertical: 30, paddingHorizontal: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, padding: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: colors.paperMuted, fontSize: 15, fontWeight: "700" },
  name: { color: colors.paper, fontSize: 13, fontWeight: "700" },
  username: { color: colors.muted, fontSize: 11, marginTop: 2 },
  followButton: { borderRadius: radius.sm, backgroundColor: colors.green, paddingHorizontal: 14, paddingVertical: 8, minWidth: 84, alignItems: "center" },
  followButtonActive: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  followButtonText: { color: colors.paper, fontWeight: "700", fontSize: 11 },
  followButtonTextActive: { color: colors.muted },
});
