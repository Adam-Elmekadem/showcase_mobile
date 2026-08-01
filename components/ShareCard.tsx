import React, { forwardRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import ViewShot from "react-native-view-shot";
import { ApiLog } from "@/lib/api";
import { StarRating } from "@/components/StarRating";
import { BrandMark } from "@/components/BrandMark";
import { colors } from "@/lib/theme";

export const CARD_WIDTH = 320;

function snippet(text: string, limit: number) {
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

export type ShareCardVariant = "quote" | "review";

export const ShareCard = forwardRef<
  React.ComponentRef<typeof ViewShot>,
  { log: ApiLog; variant: ShareCardVariant; coverUri?: string | null }
>(function ShareCard({ log, variant, coverUri }, ref) {
    const film = log.film;
    if (!film) return null;
    const backdrop = coverUri ?? film.backdrop_url ?? film.poster_url ?? null;

    if (variant === "quote" && log.quote) {
      return (
        <ViewShot ref={ref} options={{ format: "png", quality: 1 }}>
          <View style={[styles.card, styles.quoteCard]}>
            <View style={styles.quoteImageWrap}>
              {backdrop ? <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              <View style={styles.quoteImageShade} />
            </View>
            <View style={styles.quoteBody}>
              <Text style={styles.quoteText}>&ldquo;{snippet(log.quote, 170)}&rdquo;</Text>
              <Text style={styles.quoteAttribution}>
                {film.title}
                {film.year ? `, ${film.year}` : ""}
              </Text>
            </View>
            <Brand style={styles.brandOnQuote} />
          </View>
        </ViewShot>
      );
    }

    // The review card shows the review text when one exists, only falling
    // back to the quote if there's no review — previously this checked
    // log.quote first unconditionally, so a log with both showed the quote
    // on the "review" card too.
    const reviewSnippet = log.review ? snippet(log.review, 220) : null;
    const quoteSnippet = log.quote ? snippet(log.quote, 220) : null;
    const bodySnippet = reviewSnippet ?? quoteSnippet;
    const bodyIsQuote = !reviewSnippet && Boolean(quoteSnippet);

    return (
      <ViewShot ref={ref} options={{ format: "png", quality: 1 }}>
        <View style={[styles.card, styles.reviewCard]}>
          <View style={styles.backdropWrap}>
            {backdrop ? <Image source={{ uri: backdrop }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            <View style={styles.backdropShade} />
          </View>
          <Brand style={styles.brandOnReview} />
          <View style={styles.band}>
            <View style={styles.bandRow}>
              {film.poster_url ? <Image source={{ uri: film.poster_url }} style={styles.posterThumb} contentFit="cover" /> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.filmTitle} numberOfLines={2}>
                  {film.title}
                  {film.year ? ` (${film.year})` : ""}
                </Text>
                {log.ratings.overall ? <StarRating value={log.ratings.overall} readOnly size={13} /> : null}
              </View>
            </View>
            {bodySnippet && (
              <Text style={styles.reviewText} numberOfLines={5}>
                {bodyIsQuote ? `“${bodySnippet}”` : bodySnippet}
              </Text>
            )}
            <Text style={styles.username}>@{log.user?.username}</Text>
          </View>
        </View>
      </ViewShot>
    );
  }
);

function Brand({ style }: { style?: object }) {
  return (
    <View style={[styles.brand, style]}>
      <BrandMark size={16} />
      <Text style={styles.brandText}>showcase</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: CARD_WIDTH, backgroundColor: colors.ink, overflow: "hidden" },
  reviewCard: { minHeight: 400 },
  backdropWrap: { width: "100%", height: 190, backgroundColor: colors.surface2 },
  backdropShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,10,18,0.28)" },
  band: { padding: 18, gap: 12 },
  bandRow: { flexDirection: "row", gap: 12, alignItems: "flex-end", marginTop: -46 },
  posterThumb: { width: 62, aspectRatio: 0.69, borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: colors.surface2 },
  filmTitle: { color: colors.paper, fontSize: 15, fontWeight: "700", marginBottom: 6 },
  reviewText: { color: "#d7d7e2", fontSize: 12, lineHeight: 19, fontStyle: "italic" },
  username: { color: colors.muted, fontSize: 10, marginTop: 4 },
  brand: { position: "absolute", flexDirection: "row", alignItems: "center", gap: 6, zIndex: 5 },
  brandOnReview: { top: 14, left: 16 },
  brandOnQuote: { bottom: 16, left: 0, right: 0, justifyContent: "center" },
  brandText: { color: colors.paper, fontSize: 12, fontWeight: "700" },
  quoteCard: { minHeight: 400, borderWidth: 1, borderColor: colors.border },
  quoteImageWrap: { width: "100%", height: 210, backgroundColor: colors.surface2 },
  quoteImageShade: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(9,9,16,0.35)" },
  quoteBody: { flex: 1, padding: 22, paddingBottom: 56, gap: 12, alignItems: "center", justifyContent: "center" },
  quoteText: { color: colors.paper, fontSize: 18, lineHeight: 27, fontStyle: "italic", textAlign: "center" },
  quoteAttribution: { color: colors.gold, fontSize: 11, fontWeight: "600", textAlign: "center" },
});
