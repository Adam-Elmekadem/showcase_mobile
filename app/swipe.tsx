import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import PagerView from "react-native-pager-view";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay, runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, ImperativeRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiFilm } from "@/lib/api";
import { FilmCardData } from "@/components/FilmCard";
import { getSwipeQueue } from "@/lib/swipeQueue";
import { useLocale, pick } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { colors, radius, font } from "@/lib/theme";
import { ScrollMorphHeader } from "@/components/ScrollMorphHeader";
import { FilmDetailBody } from "@/components/FilmDetailBody";
import { FloatingBackButton } from "@/components/FloatingBackButton";

// Rough estimated heights of the above/below pinned content — only used to
// compute where "centered at rest" sits and to keep the scroll content
// gap-free, so an approximate estimate is fine.
const ABOVE_HEIGHT = 114; // title + genre chips + rating row
const BELOW_HEIGHT = 90; // year + your rating + icon menu (sheet mode only)
const MORPH_BELOW_HEIGHT = 50; // year + your rating, no icon menu (see showIconMenu)
const POSTER_ASPECT = 0.69; // matches FilmCard's poster ratio elsewhere in the app

export default function SwipeScreen() {
  const { startTmdbId } = useLocalSearchParams<{ startTmdbId?: string }>();
  const { language } = useLocale();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [films] = useState<FilmCardData[]>(() => getSwipeQueue());
  const [pagerEnabled, setPagerEnabled] = useState(true);

  const startIndex = useMemo(() => {
    const index = films.findIndex((film) => String(film.tmdb_id) === startTmdbId);
    return index >= 0 ? index : 0;
  }, [films, startTmdbId]);

  const [activeIndex, setActiveIndex] = useState(startIndex);

  if (films.length === 0) {
    return (
      <View style={styles.empty}>
        <FloatingBackButton />
        <Text style={styles.emptyText}>{pick(language, "لا يوجد شيء لعرضه.", "Nothing to show here.")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PagerView
        style={styles.pager}
        initialPage={startIndex}
        scrollEnabled={pagerEnabled}
        onPageSelected={(e) => setActiveIndex(e.nativeEvent.position)}
      >
        {films.map((film, index) => (
          <View key={String(film.tmdb_id)} style={{ width, height }}>
            <SwipeCard
              film={film}
              pageWidth={width}
              pageHeight={height}
              topInset={insets.top}
              language={language}
              isActive={index === activeIndex}
              onTopStateChange={setPagerEnabled}
            />
          </View>
        ))}
      </PagerView>
      <FloatingBackButton />
    </View>
  );
}

type SwipeCardProps = {
  film: FilmCardData;
  pageWidth: number;
  pageHeight: number;
  topInset: number;
  language: "ar" | "en";
  isActive: boolean;
  onTopStateChange: (atTop: boolean) => void;
};

function SwipeCard(props: SwipeCardProps) {
  const { swipeDetailStyle } = usePreferences();
  return swipeDetailStyle === "sheet" ? <SheetSwipeCard {...props} /> : <MorphSwipeCard {...props} />;
}

// Shared fetch/like/open-detail state used by both the scroll-morph and
// bottom-sheet card variants — identical logic, just consumed by different
// layouts.
function useSwipeCardState(film: FilmCardData, isActive: boolean, router: ImperativeRouter) {
  const [resolved, setResolved] = useState<ApiFilm | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  // Distinguishes "haven't fetched yet" from "fetched and it failed" — the
  // free-tier backend occasionally has a transient hiccup, and without this
  // a failed fetch silently rendered nothing at all, forever (no retry ever
  // fired again), which is what the persistent empty scroll space actually
  // was: not a layout bug, a swallowed fetch failure.
  const [failed, setFailed] = useState(false);
  const [liked, setLiked] = useState(false);
  const fetchedRef = useRef(false);

  function fetchDetail() {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setFailed(false);
    setLoadingDetail(true);
    api
      .syncFilm(film.tmdb_id)
      .then(({ data }) => {
        setResolved(data);
        setLiked(data.viewer_liked ?? false);
      })
      .catch(() => {
        fetchedRef.current = false;
        setFailed(true);
      })
      .finally(() => setLoadingDetail(false));
  }

  // Start fetching as soon as this film becomes the active page (right when
  // you swipe to it) rather than waiting for a scroll/tap — kicking off the
  // fetch + mounting the detail content at the exact instant a gesture
  // begins is what caused a visible lag/blocked feeling in the past.
  // Starting it early means the data is very likely already back by the time
  // the detail content is actually shown.
  useEffect(() => {
    if (isActive) fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  async function ensureResolved(): Promise<ApiFilm | null> {
    if (resolved) return resolved;
    try {
      const { data } = await api.syncFilm(film.tmdb_id);
      setResolved(data);
      return data;
    } catch {
      return null;
    }
  }

  async function openDetail() {
    const data = await ensureResolved();
    if (data) router.push(`/film/${data.slug}`);
  }

  async function toggleLike() {
    const wasLiked = liked;
    setLiked(!wasLiked);
    try {
      if (wasLiked) {
        const data = await ensureResolved();
        if (data) await api.unlikeFilm(data.id);
      } else {
        await api.likeFilm(film.tmdb_id);
      }
    } catch {
      setLiked(wasLiked);
    }
  }

  return { resolved, loadingDetail, failed, liked, fetchDetail, openDetail, toggleLike };
}

function AboveBlock({ film, showRating = true }: { film: FilmCardData; showRating?: boolean }) {
  return (
    <View style={styles.aboveBlock}>
      <Text style={styles.titleText} numberOfLines={1} ellipsizeMode="tail">
        {film.title}
      </Text>
      {film.genres && film.genres.length > 0 && (
        <View style={styles.chipRow}>
          {film.genres.slice(0, 3).map((genre) => (
            <View key={genre} style={styles.chip}>
              <Text style={styles.chipText}>{genre}</Text>
            </View>
          ))}
        </View>
      )}
      {showRating && typeof film.vote_average === "number" && film.vote_average > 0 && (
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={14} color={colors.gold} />
          <Text style={styles.ratingText}>{film.vote_average.toFixed(1)}/10</Text>
        </View>
      )}
    </View>
  );
}

function BelowMenu({
  film,
  watched,
  logId,
  liked,
  router,
  toggleLike,
  showIconMenu = true,
}: {
  film: FilmCardData;
  watched: boolean | undefined;
  logId: number | string | null | undefined;
  liked: boolean;
  router: ImperativeRouter;
  toggleLike: () => void;
  // Morph mode already surfaces a complete action row (Watched/Like/
  // Watchlist/Showcase) via FilmDetailBody once you scroll into it, so its
  // own pinned icon menu here is redundant — and incomplete besides, since
  // it has no "watched" action of its own. Sheet mode has no scroll-in
  // equivalent (FilmDetailBody only appears once the sheet is opened), so
  // it keeps this as its only quick-access menu.
  showIconMenu?: boolean;
}) {
  const rating = film.viewer_rating;
  return (
    <View style={styles.previewBody}>
      {film.year ? <Text style={styles.year}>{film.year}</Text> : null}
      {rating ? (
        <Text style={styles.stars}>
          {"★".repeat(Math.max(0, Math.min(5, Math.round(rating))))}
          {"☆".repeat(Math.max(0, 5 - Math.round(rating)))}
        </Text>
      ) : null}

      {showIconMenu && (
        <View style={styles.iconMenu}>
          <Pressable
            hitSlop={10}
            onPress={() =>
              watched
                ? router.push({ pathname: "/log/[tmdbId]", params: { tmdbId: String(film.tmdb_id), logId: logId ? String(logId) : undefined } })
                : router.push(`/log/${film.tmdb_id}`)
            }
          >
            <Ionicons name={watched ? "create-outline" : "add-circle-outline"} size={22} color={colors.paper} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => router.push(`/quote/${film.tmdb_id}`)}>
            <Ionicons name="chatbox-ellipses-outline" size={22} color={colors.paper} />
          </Pressable>
          <Pressable hitSlop={10} onPress={toggleLike}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={22} color={liked ? colors.orange : colors.paper} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => api.addWatchlist(film.tmdb_id).catch(() => {})}>
            <Ionicons name="bookmark-outline" size={22} color={colors.paper} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

function RetryNotice({ onRetry }: { onRetry: () => void }) {
  const { language } = useLocale();
  return (
    <View style={styles.retryWrap}>
      <Text style={styles.retryText}>{pick(language, "تعذّر تحميل التفاصيل.", "Couldn't load details.")}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Ionicons name="refresh" size={14} color={colors.paper} />
        <Text style={styles.retryButtonText}>{pick(language, "إعادة المحاولة", "Retry")}</Text>
      </Pressable>
    </View>
  );
}

function MorphSwipeCard({ film, pageWidth, pageHeight, topInset, isActive, onTopStateChange }: SwipeCardProps) {
  const router = useRouter();
  const { resolved, loadingDetail, failed, liked, fetchDetail, openDetail, toggleLike } = useSwipeCardState(film, isActive, router);

  function handleTopStateChange(atTop: boolean) {
    onTopStateChange(atTop);
    if (!atTop) fetchDetail();
  }

  const imageWidth = pageWidth - 48;
  const watched = resolved?.viewer_watched ?? film.viewer_watched;
  const logId = resolved?.viewer_log_id ?? film.viewer_log_id;

  return (
    <View style={{ width: pageWidth, height: pageHeight }}>
      <ScrollMorphHeader
        image={film.poster_url ?? film.backdrop_url ?? null}
        title={film.title}
        onTopStateChange={handleTopStateChange}
        onImageTap={openDetail}
        onImageDoubleTap={toggleLike}
        containerWidth={pageWidth}
        containerHeight={pageHeight}
        centerAtRest
        topInset={topInset}
        showOverlayTitle
        crossfadeOverlayTitle
        aboveHeight={ABOVE_HEIGHT}
        collapseAboveOnScroll
        belowHeight={MORPH_BELOW_HEIGHT}
        collapseBelowOnScroll
        initialHeight={imageWidth / POSTER_ASPECT}
        collapsedHeight={pageHeight * 0.28}
        horizontalMargin={24}
        initialRadius={28}
        collapsedRadius={8}
        minContentHeight={resolved ? undefined : pageHeight + 40}
        renderAbove={<AboveBlock film={film} />}
        renderBelow={<BelowMenu film={film} watched={watched} logId={logId} liked={liked} router={router} toggleLike={toggleLike} showIconMenu={false} />}
      >
        {loadingDetail && !resolved ? (
          <ActivityIndicator color={colors.green} style={{ marginTop: 24 }} />
        ) : resolved ? (
          <FilmDetailBody film={resolved} hideMeta />
        ) : failed ? (
          <RetryNotice onRetry={fetchDetail} />
        ) : null}
      </ScrollMorphHeader>
    </View>
  );
}

function SheetSwipeCard({ film, pageWidth, pageHeight, topInset, isActive, onTopStateChange }: SwipeCardProps) {
  const router = useRouter();
  const { resolved, loadingDetail, failed, fetchDetail, liked, toggleLike } = useSwipeCardState(film, isActive, router);
  const sheetRef = useRef<BottomSheet>(null);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const watched = resolved?.viewer_watched ?? film.viewer_watched;
  const logId = resolved?.viewer_log_id ?? film.viewer_log_id;
  const imageWidth = pageWidth - 48;
  // The rating moves onto the poster itself (a badge, like FilmCard's own
  // poster badge) rather than sitting in the above-block, and the poster's
  // height is capped to whatever's actually left after the rest of the
  // static stack — without this, a naturally tall poster on a shorter
  // device pushes the title above the safe-area top inset and under the
  // status bar, since centering an overflowing stack pushes half the
  // overflow above its own container.
  const chromeHeight = 86 + BELOW_HEIGHT + 56;
  const maxPosterHeight = Math.max(180, pageHeight - topInset - chromeHeight);
  const posterHeight = Math.min(imageWidth / POSTER_ASPECT, maxPosterHeight);
  const hasRating = typeof film.vote_average === "number" && film.vote_average > 0;

  function triggerHeartBurst() {
    heartOpacity.value = 1;
    heartScale.value = 0.3;
    heartScale.value = withSpring(1.15, { damping: 9, stiffness: 160 });
    heartOpacity.value = withDelay(350, withTiming(0, { duration: 250 }));
  }

  // Resolved by the native gesture recognizer (see the same pattern/reasoning
  // in ScrollMorphHeader) rather than a JS Date.now()/setTimeout race.
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      triggerHeartBurst();
      runOnJS(toggleLike)();
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (resolved) runOnJS(router.push)(`/film/${resolved.slug}`);
    });

  const posterTapGesture = Gesture.Exclusive(doubleTapGesture, singleTapGesture);

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  return (
    <View style={{ width: pageWidth, height: pageHeight, paddingTop: topInset }}>
      <View style={styles.sheetCenter}>
        <AboveBlock film={film} showRating={false} />

        <GestureDetector gesture={posterTapGesture}>
          <View style={[styles.sheetPoster, { width: imageWidth, height: posterHeight }]}>
            {film.poster_url ?? film.backdrop_url ? (
              <Image source={{ uri: film.poster_url ?? film.backdrop_url ?? undefined }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.fallback]}>
                <Text style={styles.fallbackText}>{film.title}</Text>
              </View>
            )}
            {hasRating && (
              <View style={styles.posterRatingBadge}>
                <Ionicons name="star" size={11} color={colors.gold} />
                <Text style={styles.posterRatingBadgeText}>{film.vote_average!.toFixed(1)}</Text>
              </View>
            )}
            <Animated.View pointerEvents="none" style={[styles.heartBurst, heartStyle]}>
              <Ionicons name="heart" size={84} color={colors.paper} />
            </Animated.View>
          </View>
        </GestureDetector>

        <BelowMenu film={film} watched={watched} logId={logId} liked={liked} router={router} toggleLike={toggleLike} />

        <Pressable style={styles.chevronButton} onPress={() => sheetRef.current?.snapToIndex(0)} hitSlop={12}>
          <Ionicons name="chevron-up" size={20} color={colors.paper} />
        </Pressable>
      </View>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={["50%", "92%"]}
        enablePanDownToClose
        onChange={(index) => onTopStateChange(index === -1)}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {loadingDetail && !resolved ? (
            <ActivityIndicator color={colors.green} style={{ marginTop: 24 }} />
          ) : resolved ? (
            <FilmDetailBody film={resolved} hideMeta inBottomSheet />
          ) : failed ? (
            <RetryNotice onRetry={fetchDetail} />
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  retryWrap: { alignItems: "center", gap: 10, paddingVertical: 32 },
  retryText: { color: colors.muted, fontSize: 12 },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonText: { color: colors.paper, fontSize: 12, fontWeight: "600" },
  pager: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink, gap: 12 },
  emptyText: { color: colors.muted, fontSize: 13 },
  aboveBlock: { paddingHorizontal: 18, paddingBottom: 12, gap: 8 },
  titleText: { color: colors.paper, fontFamily: font.display, fontSize: 26, letterSpacing: 0.5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: colors.muted, fontSize: 11 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  ratingText: { color: colors.gold, fontFamily: font.display, fontSize: 15 },
  previewBody: { padding: 18 },
  year: { color: colors.paperMuted, fontSize: 12 },
  stars: { color: colors.gold, fontSize: 15, marginTop: 8 },
  iconMenu: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", marginTop: 12, height: 40 },
  sheetCenter: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  sheetPoster: { alignSelf: "center", borderRadius: 28, overflow: "hidden", backgroundColor: colors.surface2 },
  posterRatingBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 30,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 8,
    backgroundColor: "rgba(9,9,16,0.72)",
    borderWidth: 1,
    borderColor: colors.green,
  },
  posterRatingBadgeText: { color: colors.paper, fontFamily: font.display, fontSize: 13 },
  fallback: { alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.surface2 },
  fallbackText: { color: colors.muted, fontSize: 16, textAlign: "center", fontFamily: font.display },
  heartBurst: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  chevronButton: {
    alignSelf: "center",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetBackground: { backgroundColor: colors.ink },
  sheetHandle: { backgroundColor: colors.border },
});
