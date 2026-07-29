import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, useWindowDimensions } from "react-native";
import { useFocusEffect } from "expo-router";
import { api, ApiFilm } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors } from "@/lib/theme";
import { FilmCard, filmCardWidth, filmCardGap } from "@/components/FilmCard";

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

  async function removeFromWatchlist(film: ApiFilm) {
    setFilms((current) => current.filter((f) => f.id !== film.id));
    try {
      await api.removeWatchlist(film.id);
    } catch {
      load();
    }
  }

  return (
    <View style={styles.container}>
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
          renderItem={({ item }) => (
            <FilmCard
              film={{
                tmdb_id: item.tmdb_id,
                slug: item.slug,
                title: item.title,
                year: item.year,
                poster_url: item.poster_url,
                vote_average: item.vote_average,
              }}
              width={cardWidth}
              inWatchlist
              onToggleWatchlist={() => removeFromWatchlist(item)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, paddingTop: 16 },
  loader: { marginTop: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.muted, fontSize: 12 },
  grid: { paddingHorizontal: 16, paddingBottom: 24 },
});
