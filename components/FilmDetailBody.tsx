import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Localization from "expo-localization";
import { api, ApiFilm, ApiLog, RelatedFilms, WatchProviders } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius, font } from "@/lib/theme";
import { PeopleRow } from "@/components/PeopleRow";
import { HorizontalFilms } from "@/components/HorizontalFilms";
import { CommentsSection } from "@/components/CommentsSection";
import { AddToShowcaseSheet } from "@/components/AddToShowcaseSheet";
import { GlassPanel } from "@/components/GlassPanel";

// Everything below a film's header (which is owned by ScrollMorphHeader) —
// actions, overview, watch providers, cast/crew, reviews, related films, and
// comments. Self-contained: given a resolved film, it fetches its own
// related-data, so both the standalone detail page and each swipe card's
// lazily-expanded state can render the exact same thing.
export function FilmDetailBody({
  film,
  hideMeta = false,
  inBottomSheet = false,
}: {
  film: ApiFilm;
  /** Hides the year/runtime/genre + rating row at the top — set true when the
   * caller already shows that info elsewhere (e.g. the swipe card's own
   * title/genre-chips/rating block above the poster), so it isn't duplicated
   * the moment this body scrolls into view. */
  hideMeta?: boolean;
  /** Set true when this body is rendered inside @gorhom/bottom-sheet (the
   * swipe deck's sheet mode) — its horizontal PeopleRow/HorizontalFilms rows
   * need a gesture-handler FlatList there to scroll correctly, but that same
   * swap breaks nested scrolling everywhere else (plain ScrollView contexts
   * like the standalone film page or the Explore screen), so it's opt-in. */
  inBottomSheet?: boolean;
}) {
  const { language } = useLocale();
  const { user } = useAuth();
  const router = useRouter();

  const [liked, setLiked] = useState(film.viewer_liked ?? false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [watchlistBusy, setWatchlistBusy] = useState(false);
  const [watched] = useState(film.viewer_watched ?? false);
  const [related, setRelated] = useState<RelatedFilms | null>(null);
  const [providers, setProviders] = useState<WatchProviders | null>(null);
  const [friendsActivity, setFriendsActivity] = useState<ApiLog[]>([]);
  const [reviews, setReviews] = useState<ApiLog[]>([]);
  const [showcaseSheetOpen, setShowcaseSheetOpen] = useState(false);

  useEffect(() => {
    api.getRelatedFilms(film.slug).then(({ data }) => setRelated(data)).catch(() => setRelated(null));
    const region = Localization.getLocales()[0]?.regionCode ?? "US";
    api.getWatchProviders(film.slug, region).then(({ data }) => setProviders(data)).catch(() => setProviders(null));
    api.getLogs({ film_slug: film.slug, type: "review", per_page: 10 }).then(({ data }) => setReviews(data)).catch(() => setReviews([]));
  }, [film.slug]);

  useEffect(() => {
    if (!user) return;
    api.getFilmFriendsActivity(film.slug).then(({ data }) => setFriendsActivity(data)).catch(() => setFriendsActivity([]));
  }, [film.slug, user]);

  async function toggleLike() {
    if (!user || likeBusy) return;
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
    if (!user || watchlistBusy) return;
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

  const crewGroups = film.credits ? Object.entries(film.credits).filter(([role]) => role !== "actor" && role !== "director") : [];
  const cast = film.credits?.actor ?? [];

  return (
    <View style={styles.body}>
      {!hideMeta && (
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{[film.year, film.runtime ? `${film.runtime} min` : null, film.genres?.[0]].filter(Boolean).join(" · ")}</Text>
          {typeof film.vote_average === "number" && film.vote_average > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={13} color={colors.gold} />
              <Text style={styles.ratingText}>{film.vote_average.toFixed(1)}</Text>
            </View>
          )}
        </View>
      )}

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

      <PeopleRow title={pick(language, "الإخراج", "Director")} people={film.directors ?? []} inBottomSheet={inBottomSheet} />
      <PeopleRow title={pick(language, "التمثيل", "Cast")} people={cast} inBottomSheet={inBottomSheet} />
      {crewGroups.map(([role, people]) => (
        <PeopleRow key={role} title={role.charAt(0).toUpperCase() + role.slice(1)} people={people} inBottomSheet={inBottomSheet} />
      ))}

      {reviews.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{pick(language, "مراجعات", "Reviews")}</Text>
          <GlassPanel style={styles.reviewsPanel} intensity={35} tint="light">
            {reviews.map((log, index) => (
              <Pressable
                key={log.id}
                style={[styles.reviewRow, index > 0 && styles.reviewRowDivider]}
                onPress={() => log.user && router.push(`/user/${log.user.username}`)}
              >
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>{log.user?.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.reviewName}>{log.user?.name}</Text>
                  {log.ratings.overall ? (
                    <View style={styles.reviewRating}>
                      <Ionicons name="star" size={11} color={colors.gold} />
                      <Text style={styles.reviewRatingText}>{log.ratings.overall}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.reviewText} numberOfLines={4}>
                  {log.review}
                </Text>
              </Pressable>
            ))}
          </GlassPanel>
        </View>
      )}

      {user && friendsActivity.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{pick(language, "نشاط الأصدقاء", "Friends' activity")}</Text>
          {friendsActivity.map((log) => (
            <Pressable key={log.id} style={styles.friendRow} onPress={() => log.user && router.push(`/user/${log.user.username}`)}>
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

      {related && (
        <HorizontalFilms
          title={pick(language, "أفلام مقترحة", "You might also like")}
          films={related.recommended.map((f) => ({ tmdb_id: f.tmdb_id, title: f.title, year: f.year, poster_url: f.poster_url, vote_average: f.vote_average }))}
          inBottomSheet={inBottomSheet}
        />
      )}
      {related && related.more_from_director.length > 0 && (
        <HorizontalFilms
          title={pick(language, "أفلام أخرى للمخرج", "More from the director")}
          films={related.more_from_director.map((f) => ({ tmdb_id: f.tmdb_id, slug: f.slug, title: f.title, year: f.year, poster_url: f.poster_url, vote_average: f.vote_average }))}
          inBottomSheet={inBottomSheet}
        />
      )}

      <CommentsSection type="film" id={film.id} filmId={film.id} />

      <AddToShowcaseSheet visible={showcaseSheetOpen} onClose={() => setShowcaseSheetOpen(false)} filmSlug={film.slug} tmdbId={film.tmdb_id} />
    </View>
  );
}

function WatchProvidersRow({ providers }: { providers: WatchProviders }) {
  const all = [...providers.flatrate, ...providers.rent, ...providers.buy];
  const unique = all.filter((p, index) => all.findIndex((o) => o.id === p.id) === index);
  return (
    <Pressable style={styles.providersRow} onPress={() => providers.link && Linking.openURL(providers.link)}>
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
  body: { padding: 16, gap: 22 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  meta: { color: colors.muted, fontSize: 12 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
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
  sectionTitle: { color: colors.paperMuted, fontFamily: font.display, fontSize: 15, letterSpacing: 0.5, textTransform: "uppercase" },
  overview: { color: colors.muted, fontSize: 13, lineHeight: 21 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: colors.muted, fontSize: 11 },
  providersRow: { flexDirection: "row", gap: 10 },
  providerLogo: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  providerFallback: { backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
  providerFallbackText: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  reviewsPanel: { borderRadius: radius.md },
  reviewRow: { padding: 14, gap: 8 },
  reviewRowDivider: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
  reviewAvatarText: { color: colors.paperMuted, fontSize: 11, fontWeight: "600" },
  reviewName: { color: colors.paper, fontSize: 12, fontWeight: "700", flex: 1 },
  reviewRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  reviewRatingText: { color: colors.gold, fontSize: 11, fontWeight: "700" },
  reviewText: { color: colors.paperMuted, fontSize: 12, lineHeight: 18 },
  friendRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  friendAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
  friendAvatarText: { color: colors.paperMuted, fontSize: 11, fontWeight: "600" },
  friendName: { color: colors.paper, fontSize: 12, flex: 1 },
  friendRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  friendRatingText: { color: colors.gold, fontSize: 11, fontWeight: "700" },
});
