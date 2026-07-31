import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, useWindowDimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiFilm } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, font } from "@/lib/theme";
import { FilmCard, FilmCardData, filmCardWidth, filmCardGap } from "@/components/FilmCard";
import { HeaderActions } from "@/components/HeaderActions";
import { AppLogo } from "@/components/AppLogo";

const COLUMNS = 3;

export default function WatchlistScreen() {
  const { language } = useLocale();
  const { width } = useWindowDimensions();
  const cardWidth = filmCardWidth(width - 32, COLUMNS);

  const [films, setFilms] = useState<ApiFilm[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.getWatchlist();
      setFilms(data);
    } catch {
      setFilms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filmCards: FilmCardData[] = films.map((item) => ({
    tmdb_id: item.tmdb_id,
    slug: item.slug,
    title: item.title,
    year: item.year,
    poster_url: item.poster_url,
    backdrop_url: item.backdrop_url,
    vote_average: item.vote_average,
    genres: item.genres,
    viewer_watched: item.viewer_watched,
    viewer_rating: item.viewer_rating,
    viewer_log_id: item.viewer_log_id,
  }));

  async function removeFromWatchlist(film: ApiFilm) {
    setFilms((current) => current.filter((f) => f.id !== film.id));
    try {
      await api.removeWatchlist(film.id);
    } catch {
      load();
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <AppLogo />
        <View style={styles.titleRow}>
          <Text style={styles.heading}>{pick(language, "قائمة المشاهدة", "Watchlist")}</Text>
          <HeaderActions />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.green} />
      ) : films.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{pick(language, "قائمتك فارغة.", "Your watchlist is empty.")}</Text>
        </View>
      ) : (
        <FlatList
          data={films}
          keyExtractor={(item) => String(item.id)}
          numColumns={COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: filmCardGap }}
          ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
          renderItem={({ item, index }) => (
            <FilmCard
              film={filmCards[index]}
              width={cardWidth}
              inWatchlist
              onToggleWatchlist={() => removeFromWatchlist(item)}
              siblings={filmCards}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heading: { color: colors.paper, fontFamily: font.display, fontSize: 30, letterSpacing: 0.5 },
  loader: { marginTop: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.muted, fontSize: 12 },
  grid: { paddingHorizontal: 16, paddingBottom: 24 },
});
