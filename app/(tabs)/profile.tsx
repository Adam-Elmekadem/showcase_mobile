import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions, Alert } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api, ApiError, ApiLog, UserStats } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import { FilmCard, filmCardWidth, filmCardGap } from "@/components/FilmCard";
import { FavoritesSheet } from "@/components/FavoritesSheet";

const MAX_FAVORITES = 5;

function formatDateDMY(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function ActivitySentence({ log, language }: { log: ApiLog; language: "ar" | "en" }) {
  const title = log.film?.title ?? "";
  const date = formatDateDMY(log.watched_on ?? log.created_at);
  const rating = log.ratings.overall;

  if (rating) {
    const filled = Math.round(rating);
    return (
      <Text style={styles.activityText}>
        {pick(language, "سجّلت ", "You logged ")}
        <Text style={styles.activityTitle}>{title}</Text>
        {" "}
        {"★".repeat(Math.max(0, Math.min(5, filled)))}
        {"☆".repeat(Math.max(0, 5 - filled))}
      </Text>
    );
  }

  return (
    <Text style={styles.activityText}>
      {pick(language, "شاهدت ", "You watched ")}
      <Text style={styles.activityTitle}>{title}</Text>
      {pick(language, ` بتاريخ ${date}`, ` on ${date}`)}
    </Text>
  );
}

export default function ProfileScreen() {
  const { user, logout, setUser } = useAuth();
  const { language, toggleLanguage } = useLocale();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = filmCardWidth(width - 32, 4);

  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<ApiLog[]>([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.getUserStats(user.username);
      setStats(data);
    } catch {
      setStats(null);
    }
    try {
      const { data } = await api.getLogs({ username: user.username, per_page: 8 });
      setRecentLogs(data.filter((log) => log.film));
    } catch {
      setRecentLogs([]);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function pickAndUploadAvatar(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        pick(language, "الإذن مطلوب", "Permission needed"),
        pick(language, "امنح الإذن من إعدادات هاتفك للمتابعة.", "Grant permission from your phone's settings to continue.")
      );
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const filename = asset.uri.split("/").pop() ?? "avatar.jpg";
    const extension = (filename.includes(".") ? filename.split(".").pop() : "jpg") ?? "jpg";
    const mimeType = extension.toLowerCase() === "jpg" ? "jpeg" : extension.toLowerCase();

    setAvatarBusy(true);
    try {
      const { data } = await api.updateAvatar({ uri: asset.uri, name: filename, type: `image/${mimeType}` });
      setUser(data);
    } catch (error) {
      Alert.alert(
        pick(language, "تعذّر الرفع", "Upload failed"),
        error instanceof ApiError ? error.message : pick(language, "حاول مجددًا.", "Please try again.")
      );
    } finally {
      setAvatarBusy(false);
    }
  }

  function handleAvatarPress() {
    Alert.alert(pick(language, "صورة الملف الشخصي", "Profile photo"), undefined, [
      { text: pick(language, "التقاط صورة", "Take photo"), onPress: () => pickAndUploadAvatar(true) },
      { text: pick(language, "اختيار من الصور", "Choose from library"), onPress: () => pickAndUploadAvatar(false) },
      { text: pick(language, "إلغاء", "Cancel"), style: "cancel" },
    ]);
  }

  if (!user) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.kicker}>SHOWCASE</Text>
          <Pressable style={styles.langToggle} onPress={toggleLanguage}>
            <Text style={styles.langToggleText}>{language === "ar" ? "EN" : "AR"}</Text>
          </Pressable>
        </View>

        <View style={styles.profileRow}>
          <Pressable onPress={handleAvatarPress} disabled={avatarBusy}>
            <View style={styles.avatar}>
              {user.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
              )}
              {avatarBusy ? (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color={colors.paper} size="small" />
                </View>
              ) : (
                <View style={styles.avatarBadge}>
                  <Ionicons name="camera" size={12} color={colors.paper} />
                </View>
              )}
            </View>
          </Pressable>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.username}>@{user.username}</Text>
          </View>
        </View>

        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

        <View style={styles.statsRow}>
          <Stat value={stats?.films_logged ?? user.stats?.films_logged ?? 0} label={pick(language, "أفلام", "Films")} />
          <Pressable onPress={() => router.push(`/user/${user.username}/connections?kind=followers`)}>
            <Stat value={user.stats?.followers ?? 0} label={pick(language, "متابعون", "Followers")} />
          </Pressable>
          <Pressable onPress={() => router.push(`/user/${user.username}/connections?kind=following`)}>
            <Stat value={user.stats?.following ?? 0} label={pick(language, "يتابع", "Following")} />
          </Pressable>
          {stats?.average_rating ? <Stat value={stats.average_rating.toFixed(1)} label={pick(language, "متوسط", "Avg rating")} /> : null}
        </View>

        <View style={styles.linksRow}>
          <Pressable style={styles.linkButton} onPress={() => router.push("/watchlist")}>
            <Ionicons name="bookmark-outline" size={16} color={colors.paper} />
            <Text style={styles.linkButtonText}>{pick(language, "قائمة المشاهدة", "Watchlist")}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.muted} />
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => router.push(`/user/${user.username}`)}>
            <Ionicons name="person-outline" size={16} color={colors.paper} />
            <Text style={styles.linkButtonText}>{pick(language, "الملف العام", "Public profile")}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.muted} />
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => router.push("/find-friends")}>
            <Ionicons name="people-outline" size={16} color={colors.paper} />
            <Text style={styles.linkButtonText}>{pick(language, "ابحث عن أصدقاء", "Find friends")}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.muted} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{pick(language, `المفضلة (${MAX_FAVORITES} كحد أقصى)`, `Favorites (max ${MAX_FAVORITES})`)}</Text>
            {(user.favorite_films?.length ?? 0) > 0 && (
              <Pressable onPress={() => setFavoritesOpen(true)} hitSlop={8}>
                <Ionicons name="pencil" size={13} color={colors.muted} />
              </Pressable>
            )}
          </View>
          <View style={styles.favoritesRow}>
            {(user.favorite_films ?? []).slice(0, MAX_FAVORITES).map((film) => (
              <FilmCard
                key={film.id}
                film={{ tmdb_id: film.tmdb_id, slug: film.slug, title: film.title, year: film.year, poster_url: film.poster_url }}
                width={cardWidth}
              />
            ))}
            {Array.from({ length: Math.max(0, MAX_FAVORITES - (user.favorite_films?.length ?? 0)) }).map((_, index) => (
              <Pressable key={index} style={[styles.favoriteEmptySlot, { width: cardWidth, height: cardWidth / 0.69 }]} onPress={() => setFavoritesOpen(true)}>
                <Ionicons name="add" size={22} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        <FavoritesSheet
          visible={favoritesOpen}
          onClose={() => setFavoritesOpen(false)}
          favorites={user.favorite_films ?? []}
          onChange={(updated) => setUser(updated)}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{pick(language, "النشاط الأخير", "Recent activity")}</Text>
          {recentLogs.length === 0 ? (
            <Text style={styles.activityEmpty}>{pick(language, "لم تُسجَّل أي أفلام بعد.", "No films logged yet.")}</Text>
          ) : (
            <View style={styles.activityList}>
              {recentLogs.map((log) => (
                <Pressable
                  key={log.id}
                  style={styles.activityRow}
                  onPress={() => log.film && router.push(`/film/${log.film.slug}`)}
                >
                  {log.film?.poster_url ? (
                    <Image source={{ uri: log.film.poster_url }} style={styles.activityPoster} contentFit="cover" />
                  ) : (
                    <View style={[styles.activityPoster, styles.activityPosterFallback]} />
                  )}
                  <ActivitySentence log={log} language={language} />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Pressable style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={16} color={colors.orange} />
          <Text style={styles.logoutText}>{pick(language, "تسجيل الخروج", "Sign out")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  loaderScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  content: { padding: 16, paddingBottom: 48, gap: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kicker: { color: colors.green, fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
  langToggle: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  langToggleText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: colors.paperMuted, fontSize: 28, fontWeight: "600" },
  avatarOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(9,9,16,0.55)", alignItems: "center", justifyContent: "center" },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: { gap: 4 },
  name: { color: colors.paper, fontSize: 20, fontWeight: "700" },
  username: { color: colors.muted, fontSize: 12 },
  bio: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  statsRow: { flexDirection: "row", gap: 24, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  stat: { gap: 4 },
  statValue: { color: colors.paper, fontSize: 20, fontWeight: "700" },
  statLabel: { color: colors.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4 },
  section: { gap: 10 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.paperMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  favoritesRow: { flexDirection: "row", flexWrap: "wrap", gap: filmCardGap },
  favoriteEmptySlot: { borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  activityEmpty: { color: colors.muted, fontSize: 12 },
  activityList: { gap: 10 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  activityPoster: { width: 34, aspectRatio: 0.69, borderRadius: 5, backgroundColor: colors.surface2 },
  activityPosterFallback: {},
  activityText: { flex: 1, color: colors.paperMuted, fontSize: 12, lineHeight: 18 },
  activityTitle: { color: colors.paper, fontWeight: "700" },
  linksRow: { gap: 10 },
  linkButton: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12 },
  linkButtonText: { color: colors.paper, fontSize: 12, fontWeight: "600", flex: 1 },
  logoutButton: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.orange, borderRadius: radius.sm, paddingVertical: 12, marginTop: 8 },
  logoutText: { color: colors.orange, fontSize: 12, fontWeight: "600" },
});
