import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "@/lib/theme";
import { api } from "@/lib/api";

export type FilmCardData = {
  tmdb_id: number;
  slug?: string;
  title: string;
  year?: number | string | null;
  poster_url?: string | null;
  vote_average?: number | null;
  viewer_watched?: boolean;
};

const CARD_GAP = 12;

export function FilmCard({
  film,
  width,
  onToggleWatchlist,
  inWatchlist,
}: {
  film: FilmCardData;
  width: number;
  onToggleWatchlist?: () => void;
  inWatchlist?: boolean;
}) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  async function openDetail() {
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
    <Pressable style={{ width }} onPress={openDetail}>
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
      </View>
      <Text numberOfLines={1} style={styles.title}>
        {film.title}
      </Text>
      {film.year ? <Text style={styles.year}>{film.year}</Text> : null}
    </Pressable>
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
  ratingBadgeText: { color: colors.paper, fontSize: 11, fontWeight: "700" },
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
});
