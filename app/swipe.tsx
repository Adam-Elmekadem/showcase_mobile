import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import PagerView from "react-native-pager-view";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter, ImperativeRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiFilm } from "@/lib/api";
import { FilmCardData } from "@/components/FilmCard";
import { getSwipeQueue } from "@/lib/swipeQueue";
import { useLocale, pick } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { useSuggestReveal } from "@/lib/useSuggestReveal";
import { colors, radius, font } from "@/lib/theme";
import { ScrollMorphHeader } from "@/components/ScrollMorphHeader";
import { FilmDetailBody } from "@/components/FilmDetailBody";
import { FloatingBackButton } from "@/components/FloatingBackButton";
import { SuggestSheet } from "@/components/SuggestSheet";

// Rough estimated heights of the above/below pinned content — only used to
// compute where "centered at rest" sits and to keep the scroll content
// gap-free, so an approximate estimate is fine.
const ABOVE_HEIGHT = 114; // title + genre chips + rating row
const BELOW_HEIGHT = 90; // year + your rating + icon menu
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
  const [saved, setSaved] = useState(false);
  // Watch count and "has content" are tracked separately from a single
  // viewer_log_id: once any log for this film has a rating/review/quote
  // attached, double-tap must never delete it — it can only add a rewatch.
  // bareLogId is only meaningful while watchCount is exactly 1 and
  // hasContentLog is false (a plain double-tap-to-watch mark with nothing
  // else attached yet, the one case that's safe to undo).
  const [watchCount, setWatchCount] = useState(0);
  const [hasContentLog, setHasContentLog] = useState(false);
  const [bareLogId, setBareLogId] = useState<number | null>(null);
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
        setWatchCount(data.viewer_watch_count ?? 0);
        setHasContentLog(data.viewer_has_content_log ?? false);
        setBareLogId(!data.viewer_has_content_log && data.viewer_log_id ? data.viewer_log_id : null);
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

  async function toggleWatchlist() {
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      if (wasSaved) {
        const data = await ensureResolved();
        if (data) await api.removeWatchlist(data.id);
      } else {
        await api.addWatchlist(film.tmdb_id);
      }
    } catch {
      setSaved(wasSaved);
    }
  }

  // Optimistic, like toggleLike/toggleWatchlist above — updates the badge
  // instantly instead of waiting on a network round-trip (which, on the
  // free-tier backend, was visibly laggy), then rolls back only if the
  // request actually fails.
  function toggleWatched() {
    const today = new Date().toISOString().slice(0, 10);
    if (watchCount === 0) {
      // First watch: a bare mark, freely undoable later.
      setWatchCount(1);
      api
        .createLog({ tmdb_id: film.tmdb_id, watched_on: today })
        .then(({ data: log }) => setBareLogId(log.id))
        .catch(() => setWatchCount(0));
    } else if (!hasContentLog && bareLogId) {
      // Only a bare mark exists so far (no rating/review/quote) — safe to
      // undo, this is just clearing an accidental tap.
      const idToDelete = bareLogId;
      setWatchCount(0);
      setBareLogId(null);
      api.deleteLog(idToDelete).catch(() => {
        setWatchCount(1);
        setBareLogId(idToDelete);
      });
    } else {
      // A real log (rating/review/quote) exists — double-tap must never
      // delete that, so this always logs a rewatch instead.
      setWatchCount((count) => count + 1);
      api.createLog({ tmdb_id: film.tmdb_id, watched_on: today, is_rewatch: true }).catch(() => setWatchCount((count) => count - 1));
    }
  }

  return {
    resolved,
    loadingDetail,
    failed,
    liked,
    saved,
    watchCount,
    hasContentLog,
    fetchDetail,
    openDetail,
    toggleLike,
    toggleWatchlist,
    toggleWatched,
  };
}

// Persistent status badge, not a burst — reflects current watched/rewatch
// state at a glance rather than firing once and fading, since watched state
// (unlike the double-tap gesture that changes it) needs to stay visible.
function WatchedBadge({ watchCount }: { watchCount: number }) {
  const watched = watchCount > 0;
  return (
    <View style={[styles.watchedBadge, watched && styles.watchedBadgeActive]}>
      <Ionicons name={watched ? "eye" : "eye-outline"} size={13} color={watched ? colors.orange : colors.paper} />
      {watchCount > 1 && <Text style={styles.watchedBadgeText}>{watchCount}</Text>}
    </View>
  );
}

// Long-press reveal, like forwarding a message — tap the backdrop to
// dismiss, tap the send icon to open the friend picker. Same visual as
// FilmCard/ShowcaseCard's own overlay, just local to this file since it's
// used twice here (morph + sheet posters).
function SendOverlay({ onDismiss, onSend }: { onDismiss: () => void; onSend: () => void }) {
  return (
    <Pressable style={[StyleSheet.absoluteFill, styles.sendOverlay]} onPress={onDismiss}>
      <Pressable style={styles.sendButton} hitSlop={12} onPress={onSend}>
        <Ionicons name="paper-plane" size={22} color={colors.paper} />
      </Pressable>
    </Pressable>
  );
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
  saved,
  router,
  toggleLike,
  toggleWatchlist,
}: {
  film: FilmCardData;
  watched: boolean | undefined;
  logId: number | string | null | undefined;
  liked: boolean;
  saved: boolean;
  router: ImperativeRouter;
  toggleLike: () => void;
  toggleWatchlist: () => void;
}) {
  return (
    <View style={styles.previewBody}>
      {film.year ? <Text style={styles.year}>{film.year}</Text> : null}

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
        <Pressable hitSlop={10} onPress={toggleWatchlist}>
          <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={22} color={saved ? colors.gold : colors.paper} />
        </Pressable>
      </View>
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
  const { resolved, loadingDetail, failed, liked, saved, watchCount, fetchDetail, openDetail, toggleLike, toggleWatchlist, toggleWatched } =
    useSwipeCardState(film, isActive, router);
  const { visible: showSend, reveal: revealSend, dismiss: dismissSend } = useSuggestReveal();
  const [suggestOpen, setSuggestOpen] = useState(false);

  function handleTopStateChange(atTop: boolean) {
    onTopStateChange(atTop);
    if (!atTop) fetchDetail();
  }

  const imageWidth = pageWidth - 48;
  const watched = watchCount > 0;
  const logId = resolved?.viewer_log_id ?? film.viewer_log_id;

  return (
    <View style={{ width: pageWidth, height: pageHeight }}>
      <ScrollMorphHeader
        image={film.poster_url ?? film.backdrop_url ?? null}
        title={film.title}
        onTopStateChange={handleTopStateChange}
        onImageTap={openDetail}
        onImageDoubleTap={toggleWatched}
        onImageLongPress={revealSend}
        doubleTapBurstIcon="eye"
        doubleTapBurstColor={colors.orange}
        topLeftBadge={<WatchedBadge watchCount={watchCount} />}
        imageOverlay={
          showSend && (
            <SendOverlay
              onDismiss={dismissSend}
              onSend={() => {
                dismissSend();
                setSuggestOpen(true);
              }}
            />
          )
        }
        containerWidth={pageWidth}
        containerHeight={pageHeight}
        centerAtRest
        topInset={topInset}
        showOverlayTitle
        crossfadeOverlayTitle
        aboveHeight={ABOVE_HEIGHT}
        collapseAboveOnScroll
        belowHeight={BELOW_HEIGHT}
        collapseBelowOnScroll
        initialHeight={imageWidth / POSTER_ASPECT}
        collapsedHeight={pageHeight * 0.28}
        horizontalMargin={24}
        initialRadius={28}
        collapsedRadius={8}
        minContentHeight={resolved ? undefined : pageHeight + 40}
        renderAbove={<AboveBlock film={film} />}
        renderBelow={
          <BelowMenu
            film={film}
            watched={watched}
            logId={logId}
            liked={liked}
            saved={saved}
            router={router}
            toggleLike={toggleLike}
            toggleWatchlist={toggleWatchlist}
          />
        }
      >
        {loadingDetail && !resolved ? (
          <ActivityIndicator color={colors.green} style={{ marginTop: 24 }} />
        ) : resolved ? (
          <FilmDetailBody film={resolved} hideMeta hideActions />
        ) : failed ? (
          <RetryNotice onRetry={fetchDetail} />
        ) : null}
      </ScrollMorphHeader>
      <SuggestSheet
        visible={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        suggestable={{ type: "film", tmdbId: film.tmdb_id, title: film.title }}
      />
    </View>
  );
}

function SheetSwipeCard({ film, pageWidth, pageHeight, topInset, isActive, onTopStateChange }: SwipeCardProps) {
  const router = useRouter();
  const { resolved, loadingDetail, failed, fetchDetail, liked, saved, watchCount, toggleLike, toggleWatchlist, toggleWatched } =
    useSwipeCardState(film, isActive, router);
  const { visible: showSend, reveal: revealSend, dismiss: dismissSend } = useSuggestReveal();
  const [suggestOpen, setSuggestOpen] = useState(false);
  const sheetRef = useRef<BottomSheet>(null);
  const lastTapRef = useRef(0);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const watched = watchCount > 0;
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

  function triggerTapBurst() {
    heartOpacity.value = 1;
    heartScale.value = 0.3;
    heartScale.value = withSpring(1.15, { damping: 9, stiffness: 160 });
    heartOpacity.value = withDelay(350, withTiming(0, { duration: 250 }));
  }

  // react-native-gesture-handler's Gesture.Exclusive(Tap, Tap) + runOnJS
  // combination has real, documented Android crash reports (software-
  // mansion/react-native-gesture-handler#2362 and others) — hit exactly
  // that here (a hard native crash on double-tap), so this reverts to plain
  // Pressable + a Date.now()/setTimeout race, same as ScrollMorphHeader.
  function handlePosterTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      lastTapRef.current = 0;
      triggerTapBurst();
      toggleWatched();
      return;
    }
    lastTapRef.current = now;
    setTimeout(() => {
      if (Date.now() - lastTapRef.current >= 280) return;
      if (resolved) router.push(`/film/${resolved.slug}`);
    }, 280);
  }

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  return (
    <View style={{ width: pageWidth, height: pageHeight, paddingTop: topInset }}>
      <View style={styles.sheetCenter}>
        <AboveBlock film={film} showRating={false} />

        <Pressable
          onPress={handlePosterTap}
          onLongPress={revealSend}
          delayLongPress={350}
          style={[styles.sheetPoster, { width: imageWidth, height: posterHeight }]}
        >
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
            <Ionicons name="eye" size={84} color={colors.orange} />
          </Animated.View>
          <View pointerEvents="none" style={styles.topLeftBadgeWrap}>
            <WatchedBadge watchCount={watchCount} />
          </View>
          {showSend && (
            <SendOverlay
              onDismiss={dismissSend}
              onSend={() => {
                dismissSend();
                setSuggestOpen(true);
              }}
            />
          )}
        </Pressable>

        <BelowMenu
          film={film}
          watched={watched}
          logId={logId}
          liked={liked}
          saved={saved}
          router={router}
          toggleLike={toggleLike}
          toggleWatchlist={toggleWatchlist}
        />

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
            <FilmDetailBody film={resolved} hideMeta hideActions inBottomSheet />
          ) : failed ? (
            <RetryNotice onRetry={fetchDetail} />
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
      <SuggestSheet
        visible={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        suggestable={{ type: "film", tmdbId: film.tmdb_id, title: film.title }}
      />
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
  watchedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 8,
    backgroundColor: "rgba(9,9,16,0.72)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  watchedBadgeActive: { borderColor: colors.orange },
  watchedBadgeText: { color: colors.orange, fontFamily: font.display, fontSize: 13 },
  sendOverlay: { backgroundColor: "rgba(9,9,16,0.6)", alignItems: "center", justifyContent: "center" },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.green },
  fallback: { alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.surface2 },
  fallbackText: { color: colors.muted, fontSize: 16, textAlign: "center", fontFamily: font.display },
  heartBurst: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  topLeftBadgeWrap: { position: "absolute", top: 12, left: 12 },
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
