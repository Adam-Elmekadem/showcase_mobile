import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions, Linking, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Localization from "expo-localization";
import { api, ApiFilm, RelatedFilms, WatchProviders, ApiLog } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import { PeopleRow } from "@/components/PeopleRow";
import { HorizontalFilms } from "@/components/HorizontalFilms";
import { CommentsSection } from "@/components/CommentsSection";
import { AddToShowcaseSheet } from "@/components/AddToShowcaseSheet";

export default function FilmDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { language } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [film, setFilm] = useState<ApiFilm | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [watchlistBusy, setWatchlistBusy] = useState(false);
  const [watched, setWatched] = useState(false);
  const [related, setRelated] = useState<RelatedFilms | null>(null);
  const [providers, setProviders] = useState<WatchProviders | null>(null);
  const [friendsActivity, setFriendsActivity] = useState<ApiLog[]>([]);
  const [showcaseSheetOpen, setShowcaseSheetOpen] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const { data } = await api.getFilm(slug);
      setFilm(data);
      setLiked(data.viewer_liked ?? false);
      setSaved(false);
      setWatched(data.viewer_watched ?? false);
      navigation.setOptions({ title: data.title });
    } finally {
      setLoading(false);
    }
  }, [slug, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!slug) return;
    api.getRelatedFilms(slug).then(({ data }) => setRelated(data)).catch(() => setRelated(null));
    const region = Localization.getLocales()[0]?.regionCode ?? "US";
    api.getWatchProviders(slug, region).then(({ data }) => setProviders(data)).catch(() => setProviders(null));
  }, [slug]);

  useEffect(() => {
    if (!slug || !user) return;
    api.getFilmFriendsActivity(slug).then(({ data }) => setFriendsActivity(data)).catch(() => setFriendsActivity([]));
  }, [slug, user]);

  async function toggleLike() {
    if (!film || !user || likeBusy) return;
    setLikeBusy(true);
    try {
      if (liked) {
        await api.unlikeFilm(film.id);
        setLiked(false);
      } else {
        await api.likeFilm(film.tmdb_id);
        setLiked(true);
      }
    } finally {
      setLikeBusy(false);
    }
  }

  async function toggleWatchlist() {
    if (!film || !user || watchlistBusy) return;
    setWatchlistBusy(true);
    try {
      if (saved) {
        await api.removeWatchlist(film.id);
        setSaved(false);
      } else {
        await api.addWatchlist(film.tmdb_id);
        setSaved(true);
      }
    } finally {
      setWatchlistBusy(false);
    }
  }

  if (loading || !film) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  const crewGroups = film.credits
    ? Object.entries(film.credits).filter(([role]) => role !== "actor")
    : [];
  const cast = film.credits?.actor ?? [];

  return (
    <>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
      >
      <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        {film.backdrop_url && (
          <Image source={{ uri: film.backdrop_url }} style={{ width, height: width * 0.56 }} contentFit="cover" />
        )}

        <View style={styles.body}>
          <View style={styles.headerRow}>
            {film.poster_url ? (
              <Image source={{ uri: film.poster_url }} style={styles.poster} contentFit="cover" />
            ) : (
              <View style={[styles.poster, styles.posterFallback]} />
            )}
            <View style={styles.headerText}>
              <Text style={styles.title}>{film.title}</Text>
              <Text style={styles.meta}>
                {[film.year, film.runtime ? `${film.runtime} min` : null, film.genres?.[0]].filter(Boolean).join(" · ")}
              </Text>
              {typeof film.vote_average === "number" && film.vote_average > 0 && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color={colors.gold} />
                  <Text style={styles.ratingText}>{film.vote_average.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>

          {user && (
            <View style={styles.actionsRow}>
              <ActionButton
                icon={watched ? "eye" : "eye-outline"}
                label={pick(language, "شاهدته", "Watched")}
                active={watched}
                onPress={() => router.push(`/log/${film.tmdb_id}`)}
              />
              <ActionButton icon={liked ? "heart" : "heart-outline"} label={pick(language, "أعجبني", "Like")} active={liked} onPress={toggleLike} />
              <ActionButton
                icon={saved ? "bookmark" : "bookmark-outline"}
                label={pick(language, "قائمتي", "Watchlist")}
                active={saved}
                onPress={toggleWatchlist}
              />
              <ActionButton icon="grid-outline" label={pick(language, "عرض", "Showcase")} onPress={() => setShowcaseSheetOpen(true)} />
            </View>
          )}

          {user ? (
            <View style={styles.logRow}>
              <Pressable style={[styles.logButton, styles.logButtonFlex]} onPress={() => router.push(`/log/${film.tmdb_id}`)}>
                <Ionicons name="film-outline" size={16} color={colors.paper} />
                <Text style={styles.logButtonText}>{pick(language, "سجّل ومراجعة", "Log & review")}</Text>
              </Pressable>
              <Pressable style={[styles.quoteButton, styles.logButtonFlex]} onPress={() => router.push(`/quote/${film.tmdb_id}`)}>
                <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.gold} />
                <Text style={styles.quoteButtonText}>{pick(language, "اقتباس", "Quote")}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.logButtonOutline} onPress={() => router.push("/login")}>
              <Text style={styles.logButtonOutlineText}>{pick(language, "سجّل الدخول للتسجيل والمراجعة", "Sign in to log & review")}</Text>
            </Pressable>
          )}

          {film.overview && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{pick(language, "القصة", "Overview")}</Text>
              <Text style={styles.overview}>{film.overview}</Text>
            </View>
          )}

          {film.genres && film.genres.length > 0 && (
            <View style={styles.chipRow}>
              {film.genres.map((g) => (
                <View key={g} style={styles.chip}>
                  <Text style={styles.chipText}>{g}</Text>
                </View>
              ))}
            </View>
          )}

          {providers && (providers.flatrate.length > 0 || providers.rent.length > 0 || providers.buy.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{pick(language, "أين تشاهده", "Where to watch")}</Text>
              <WatchProvidersRow providers={providers} />
            </View>
          )}

          <PeopleRow title={pick(language, "الإخراج", "Director")} people={film.directors ?? []} />
          <PeopleRow title={pick(language, "التمثيل", "Cast")} people={cast} />
          {crewGroups.map(([role, people]) => (
            <PeopleRow key={role} title={role.charAt(0).toUpperCase() + role.slice(1)} people={people} />
          ))}

          {user && friendsActivity.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{pick(language, "نشاط الأصدقاء", "Friends' activity")}</Text>
              {friendsActivity.map((log) => (
                <Pressable
                  key={log.id}
                  style={styles.friendRow}
                  onPress={() => log.user && router.push(`/user/${log.user.username}`)}
                >
                  <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>{log.user?.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.friendName}>{log.user?.name}</Text>
                  {log.ratings.overall ? (
                    <View style={styles.friendRating}>
                      <Ionicons name="star" size={11} color={colors.gold} />
                      <Text style={styles.friendRatingText}>{log.ratings.overall}</Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}

          {related && <HorizontalFilms title={pick(language, "أفلام مقترحة", "You might also like")} films={related.recommended.map((f) => ({ tmdb_id: f.tmdb_id, title: f.title, year: f.year, poster_url: f.poster_url, vote_average: f.vote_average }))} />}
          {related && related.more_from_director.length > 0 && (
            <HorizontalFilms
              title={pick(language, "أفلام أخرى للمخرج", "More from the director")}
              films={related.more_from_director.map((f) => ({ tmdb_id: f.tmdb_id, slug: f.slug, title: f.title, year: f.year, poster_url: f.poster_url, vote_average: f.vote_average }))}
            />
          )}

          <CommentsSection type="film" id={film.id} filmId={film.id} />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <AddToShowcaseSheet
        visible={showcaseSheetOpen}
        onClose={() => setShowcaseSheetOpen(false)}
        filmSlug={film.slug}
        tmdbId={film.tmdb_id}
      />
    </>
  );
}

function WatchProvidersRow({ providers }: { providers: WatchProviders }) {
  const all = [...providers.flatrate, ...providers.rent, ...providers.buy];
  const unique = all.filter((p, index) => all.findIndex((o) => o.id === p.id) === index);
  return (
    <Pressable
      style={styles.providersRow}
      onPress={() => providers.link && Linking.openURL(providers.link)}
    >
      {unique.slice(0, 6).map((provider) =>
        provider.logo_url ? (
          <Image key={provider.id} source={{ uri: provider.logo_url }} style={styles.providerLogo} contentFit="cover" />
        ) : (
          <View key={provider.id} style={[styles.providerLogo, styles.providerFallback]}>
            <Text style={styles.providerFallbackText}>{provider.name.slice(0, 2)}</Text>
          </View>
        )
      )}
    </Pressable>
  );
}

function ActionButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Ionicons name={icon} size={20} color={active ? colors.green : colors.paper} />
      <Text style={[styles.actionButtonText, active && { color: colors.green }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  loaderScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  body: { padding: 16, gap: 22 },
  headerRow: { flexDirection: "row", gap: 14, marginTop: -48 },
  poster: { width: 96, aspectRatio: 0.69, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  posterFallback: { backgroundColor: colors.surface2 },
  headerText: { flex: 1, justifyContent: "flex-end", gap: 4, paddingBottom: 4 },
  title: { color: colors.paper, fontSize: 20, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 12 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  ratingText: { color: colors.gold, fontSize: 12, fontWeight: "700" },
  actionsRow: { flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 14 },
  actionButton: { alignItems: "center", gap: 6 },
  actionButtonText: { color: colors.paper, fontSize: 10 },
  logRow: { flexDirection: "row", gap: 10 },
  logButtonFlex: { flex: 1 },
  logButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
    borderRadius: radius.sm,
    paddingVertical: 13,
  },
  logButtonText: { color: colors.paper, fontWeight: "700", fontSize: 13 },
  quoteButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.sm,
    paddingVertical: 13,
  },
  quoteButtonText: { color: colors.gold, fontWeight: "700", fontSize: 13 },
  logButtonOutline: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 13, alignItems: "center" },
  logButtonOutlineText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  section: { gap: 10 },
  sectionTitle: { color: colors.paperMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  overview: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: colors.muted, fontSize: 11 },
  providersRow: { flexDirection: "row", gap: 10 },
  providerLogo: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  providerFallback: { backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
  providerFallbackText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  friendRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  friendAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
  friendAvatarText: { color: colors.paperMuted, fontSize: 11, fontWeight: "600" },
  friendName: { color: colors.paper, fontSize: 12, flex: 1 },
  friendRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  friendRatingText: { color: colors.gold, fontSize: 11, fontWeight: "700" },
});
