import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { api, ApiFilm, ApiList, ApiLog, ApiUser, UserStats } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import { FilmCard, filmCardWidth, filmCardGap } from "@/components/FilmCard";
import { ShowcaseCard } from "@/components/ShowcaseCard";

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { language } = useLocale();
  const { user: viewer, setUser } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const cardWidth = filmCardWidth(width - 32, 4);

  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [lists, setLists] = useState<ApiList[]>([]);
  const [watchlist, setWatchlist] = useState<ApiFilm[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const load = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setNotFound(false);
    try {
      const { data } = await api.getUser(username);
      setProfile(data);
      navigation.setOptions({ title: `@${username}` });
      api.getUserStats(username).then(({ data }) => setStats(data)).catch(() => {});
      api.getLogs({ username, per_page: 12 }).then(({ data }) => setLogs(data)).catch(() => {});
      api.getLists(username).then(({ data }) => setLists(data)).catch(() => {});
      api.getUserWatchlist(username).then(({ data }) => setWatchlist(data)).catch(() => setWatchlist([]));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [username, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleFollow() {
    if (!profile || followBusy) return;
    const wasFollowing = profile.is_followed_by_viewer;
    setFollowBusy(true);
    try {
      const { data } = wasFollowing ? await api.unfollowUser(username) : await api.followUser(username);
      setProfile((current) => (current ? { ...current, ...data } : data));
      // The follow/unfollow endpoints return the target user, not the viewer, so
      // bump the viewer's own following count locally rather than waiting for a
      // full profile refresh.
      if (viewer) {
        setUser({
          ...viewer,
          stats: {
            films_logged: viewer.stats?.films_logged ?? 0,
            lists: viewer.stats?.lists ?? 0,
            followers: viewer.stats?.followers ?? 0,
            following: Math.max(0, (viewer.stats?.following ?? 0) + (wasFollowing ? -1 : 1)),
          },
        });
      }
    } finally {
      setFollowBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  if (notFound || !profile) {
    return (
      <View style={styles.loaderScreen}>
        <Text style={styles.emptyText}>{pick(language, "لم نعثر على هذا المستخدم.", "We couldn't find this user.")}</Text>
      </View>
    );
  }

  const isSelf = viewer?.username === username;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile.name.trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.username}>@{profile.username}</Text>
        </View>
      </View>

      {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
      <Text style={styles.memberSince}>{pick(language, `عضو منذ ${profile.member_since}`, `Member since ${profile.member_since}`)}</Text>

      {isSelf ? (
        <Pressable style={styles.outlineButton} onPress={() => router.push("/profile")}>
          <Text style={styles.outlineButtonText}>{pick(language, "هذا أنت — إدارة ملفك", "This is you — manage profile")}</Text>
        </Pressable>
      ) : viewer ? (
        <Pressable
          style={[styles.followButton, profile.is_followed_by_viewer && styles.followButtonActive]}
          onPress={toggleFollow}
          disabled={followBusy}
        >
          <Text style={[styles.followButtonText, profile.is_followed_by_viewer && styles.followButtonTextActive]}>
            {profile.is_followed_by_viewer ? pick(language, "متابَع", "Following") : pick(language, "متابعة", "Follow")}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.statsRow}>
        <Stat value={profile.stats?.films_logged ?? 0} label={pick(language, "أفلام", "Films")} />
        <Stat value={lists.length} label={pick(language, "عروض", "Showcases")} />
        <Pressable onPress={() => router.push(`/user/${username}/connections?kind=followers`)}>
          <Stat value={profile.stats?.followers ?? 0} label={pick(language, "متابعون", "Followers")} />
        </Pressable>
        <Pressable onPress={() => router.push(`/user/${username}/connections?kind=following`)}>
          <Stat value={profile.stats?.following ?? 0} label={pick(language, "يتابع", "Following")} />
        </Pressable>
      </View>

      {profile.favorite_films && profile.favorite_films.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{pick(language, "الأفلام المفضلة", "Favorite films")}</Text>
          <View style={styles.favoritesRow}>
            {profile.favorite_films.map((film) => (
              <FilmCard
                key={film.id}
                film={{ tmdb_id: film.tmdb_id, slug: film.slug, title: film.title, year: film.year, poster_url: film.poster_url }}
                width={cardWidth}
              />
            ))}
          </View>
        </View>
      )}

      {watchlist.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{pick(language, "قائمة المشاهدة", "Watchlist")}</Text>
          <View style={styles.favoritesRow}>
            {watchlist.slice(0, 8).map((film) => (
              <FilmCard
                key={film.id}
                film={{ tmdb_id: film.tmdb_id, slug: film.slug, title: film.title, year: film.year, poster_url: film.poster_url }}
                width={cardWidth}
              />
            ))}
          </View>
        </View>
      )}

      {lists.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{pick(language, "العروض", "Showcases")}</Text>
          <View style={{ gap: 12 }}>
            {lists.map((list) => (
              <ShowcaseCard key={list.id} list={list} />
            ))}
          </View>
        </View>
      )}

      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{pick(language, "التقييمات", "Ratings")}</Text>
          <View style={styles.ratingsRow}>
            <View>
              <Text style={styles.ratingsValue}>{stats.average_rating ? stats.average_rating.toFixed(1) : "—"}</Text>
              <Text style={styles.ratingsLabel}>{pick(language, "متوسط التقييم", "Avg rating")}</Text>
            </View>
            <View>
              <Text style={styles.ratingsValue}>{Math.round(stats.hours_watched)}</Text>
              <Text style={styles.ratingsLabel}>{pick(language, "ساعة مشاهدة", "Hours watched")}</Text>
            </View>
          </View>
        </View>
      )}

      {logs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{pick(language, "آخر نشاطه", "Recent activity")}</Text>
          {logs.map((log) => (
            <Pressable key={log.id} style={styles.logRow} onPress={() => log.film && router.push(`/film/${log.film.slug}`)}>
              <Text style={styles.logFilm} numberOfLines={1}>
                {log.film?.title}
              </Text>
              {log.ratings.overall ? <Text style={styles.logRating}>★ {log.ratings.overall}</Text> : null}
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
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
  screen: { flex: 1, backgroundColor: colors.ink },
  loaderScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  emptyText: { color: colors.muted, fontSize: 12 },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.paperMuted, fontSize: 28, fontWeight: "600" },
  headerText: { gap: 4 },
  name: { color: colors.paper, fontSize: 20, fontWeight: "700" },
  username: { color: colors.muted, fontSize: 12 },
  bio: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  memberSince: { color: colors.muted, fontSize: 10 },
  outlineButton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 12, alignItems: "center" },
  outlineButtonText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  followButton: { backgroundColor: colors.green, borderRadius: radius.sm, paddingVertical: 12, alignItems: "center" },
  followButtonActive: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  followButtonText: { color: colors.paper, fontWeight: "700", fontSize: 12 },
  followButtonTextActive: { color: colors.muted },
  statsRow: { flexDirection: "row", gap: 24, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  stat: { gap: 4 },
  statValue: { color: colors.paper, fontSize: 18, fontWeight: "700" },
  statLabel: { color: colors.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4 },
  section: { gap: 10 },
  sectionTitle: { color: colors.paperMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  favoritesRow: { flexDirection: "row", flexWrap: "wrap", gap: filmCardGap },
  ratingsRow: { flexDirection: "row", gap: 28 },
  ratingsValue: { color: colors.paper, fontSize: 20, fontWeight: "700" },
  ratingsLabel: { color: colors.muted, fontSize: 10, marginTop: 2 },
  logRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  logFilm: { color: colors.paper, fontSize: 12, flex: 1 },
  logRating: { color: colors.gold, fontSize: 11, fontWeight: "700" },
});
