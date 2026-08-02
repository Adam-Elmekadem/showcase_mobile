import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, font } from "@/lib/theme";
import { api } from "@/lib/api";
import { setSwipeQueue } from "@/lib/swipeQueue";
import { useSuggestReveal } from "@/lib/useSuggestReveal";
import { SuggestSheet } from "@/components/SuggestSheet";

export type FilmCardData = {
  tmdb_id: number;
  slug?: string;
  title: string;
  year?: number | string | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  vote_average?: number | null;
  genres?: string[] | null;
  viewer_watched?: boolean;
  viewer_rating?: number | null;
  viewer_log_id?: number | null;
};

const CARD_GAP = 12;

export function FilmCard({
  film,
  width,
  onToggleWatchlist,
  inWatchlist,
  onPress,
  siblings,
}: {
  film: FilmCardData;
  width: number;
  onToggleWatchlist?: () => void;
  inWatchlist?: boolean;
  /** Runs instead of the default film-detail navigation, e.g. to close a modal first. */
  onPress?: () => void;
  /** The full list this card belongs to (e.g. the row/grid it's rendered in) —
   * when provided, tapping opens the swipeable browse view over this set
   * instead of going straight to the film detail page. */
  siblings?: FilmCardData[];
}) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const { visible: showSend, reveal: revealSend, dismiss: dismissSend } = useSuggestReveal();
  const [suggestOpen, setSuggestOpen] = useState(false);

  async function openDetail() {
    if (onPress) {
      onPress();
      return;
    }
    if (siblings && siblings.length > 0) {
      setSwipeQueue(siblings);
      router.push({ pathname: "/swipe", params: { startTmdbId: String(film.tmdb_id) } });
      return;
    }
    if (opening) return;
    if (film.slug) {
      router.push(`/film/${film.slug}`);
      return;
    }
    setOpening(true);
    try {
      const { data } = await api.syncFilm(film.tmdb_id);
      router.push(`/film/${data.slug}`);
    } finally {
      setOpening(false);
    }
  }

  return (
    <>
      <Pressable style={{ width }} onPress={openDetail} onLongPress={revealSend} delayLongPress={350}>
        <View style={[styles.poster, { width, height: width / 0.69 }]}>
          {film.poster_url ? (
            <Image source={{ uri: film.poster_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.posterFallback]}>
              <Text style={styles.posterFallbackText}>{film.title}</Text>
            </View>
          )}
          {opening && (
            <View style={[StyleSheet.absoluteFill, styles.loadingOverlay]}>
              <ActivityIndicator color={colors.paper} size="small" />
            </View>
          )}
          {typeof film.vote_average === "number" && film.vote_average > 0 && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingBadgeText}>{film.vote_average.toFixed(1)}</Text>
            </View>
          )}
          {onToggleWatchlist && (
            <Pressable style={styles.saveButton} onPress={onToggleWatchlist} hitSlop={8}>
              <Ionicons name={inWatchlist ? "bookmark" : "bookmark-outline"} size={16} color={inWatchlist ? colors.gold : colors.paper} />
            </Pressable>
          )}
          {/* Long-press reveal, like forwarding a message — tap the backdrop
              to dismiss, tap the send icon to open the friend picker. */}
          {showSend && (
            <Pressable style={[StyleSheet.absoluteFill, styles.sendOverlay]} onPress={dismissSend}>
              <Pressable
                style={styles.sendButton}
                hitSlop={12}
                onPress={() => {
                  dismissSend();
                  setSuggestOpen(true);
                }}
              >
                <Ionicons name="paper-plane" size={22} color={colors.paper} />
              </Pressable>
            </Pressable>
          )}
        </View>
        <Text numberOfLines={1} style={styles.title}>
          {film.title}
        </Text>
        {film.year ? <Text style={styles.year}>{film.year}</Text> : null}
      </Pressable>
      <SuggestSheet
        visible={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        suggestable={{ type: "film", tmdbId: film.tmdb_id, title: film.title }}
      />
    </>
  );
}

export function filmCardWidth(containerWidth: number, columns: number) {
  return (containerWidth - CARD_GAP * (columns - 1)) / columns;
}

export const filmCardGap = CARD_GAP;

const styles = StyleSheet.create({
  poster: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  posterFallback: { alignItems: "center", justifyContent: "center", padding: 8, backgroundColor: colors.surface2 },
  posterFallbackText: { color: colors.muted, fontSize: 11, textAlign: "center" },
  loadingOverlay: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(9,9,16,0.45)" },
  ratingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    minWidth: 30,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(9,9,16,0.72)",
    borderWidth: 1,
    borderColor: colors.green,
  },
  ratingBadgeText: { color: colors.paper, fontFamily: font.display, fontSize: 13 },
  saveButton: {
    position: "absolute",
    left: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(9,9,16,0.68)",
  },
  title: { color: colors.paper, fontSize: 13, fontWeight: "600", marginTop: 8 },
  year: { color: colors.muted, fontSize: 11, marginTop: 2 },
  sendOverlay: { backgroundColor: "rgba(9,9,16,0.6)", alignItems: "center", justifyContent: "center" },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
  },
});
