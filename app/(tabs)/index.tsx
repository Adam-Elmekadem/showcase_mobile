import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, Genre, SearchResult } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import { FilmCard, filmCardWidth, filmCardGap } from "@/components/FilmCard";
import { NotificationBell } from "@/components/NotificationBell";

const COLUMNS = 3;

export default function ExploreScreen() {
  const { language } = useLocale();
  const { width } = useWindowDimensions();
  const cardWidth = filmCardWidth(width - 32, COLUMNS);

  const [query, setQuery] = useState("");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [activeGenre, setActiveGenre] = useState<number | null>(null);
  const [films, setFilms] = useState<SearchResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    api.getGenres().then(({ data }) => setGenres(data)).catch(() => setGenres([]));
  }, []);

  const loadFilms = useCallback(
    async (targetPage: number, append: boolean) => {
      const thisRequest = ++requestId.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        if (query.trim().length >= 2) {
          const { data } = await api.searchFilms(query.trim());
          if (requestId.current !== thisRequest) return;
          setFilms(data);
          setTotalPages(1);
        } else {
          const { data, meta } = await api.discoverFilms({
            genre: activeGenre ?? undefined,
            sort_by: "popularity.desc",
            page: targetPage,
          });
          if (requestId.current !== thisRequest) return;
          setFilms((current) => (append ? [...current, ...data] : data));
          setTotalPages(meta.total_pages);
        }
      } catch {
        if (requestId.current === thisRequest && !append) setFilms([]);
      } finally {
        if (requestId.current === thisRequest) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [query, activeGenre]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      loadFilms(1, false);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [loadFilms]);

  const isSearchMode = query.trim().length >= 2;

  function loadMore() {
    if (isSearchMode || loading || loadingMore || page >= totalPages) return;
    const next = page + 1;
    setPage(next);
    loadFilms(next, true);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.kicker}>SHOWCASE</Text>
            <Text style={styles.heading}>{pick(language, "اكتشف سينما", "Find cinema")}</Text>
          </View>
          <NotificationBell />
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={pick(language, "ابحث عن فيلم...", "Search for a film...")}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>
        {genres.length > 0 && (
          <FlatList
            horizontal
            data={[{ id: -1, name: pick(language, "الكل", "All") }, ...genres]}
            keyExtractor={(g) => String(g.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreRow}
            renderItem={({ item }) => {
              const active = item.id === -1 ? activeGenre === null : activeGenre === item.id;
              return (
                <Pressable
                  style={[styles.genreChip, active && styles.genreChipActive]}
                  onPress={() => setActiveGenre(item.id === -1 ? null : item.id)}
                >
                  <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>{item.name}</Text>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      {loading && films.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={colors.green} />
      ) : films.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{pick(language, "لا توجد نتائج.", "No results.")}</Text>
        </View>
      ) : (
        <FlatList
          data={films}
          keyExtractor={(item) => String(item.tmdb_id)}
          numColumns={COLUMNS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: filmCardGap }}
          ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.green} style={{ marginTop: 16 }} /> : null}
          renderItem={({ item }) => (
            <FilmCard
              film={{
                tmdb_id: item.tmdb_id,
                title: item.title,
                year: item.year,
                poster_url: item.poster_url,
                vote_average: item.vote_average,
              }}
              width={cardWidth}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  kicker: { color: colors.green, fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
  heading: { color: colors.paper, fontSize: 26, fontWeight: "600", letterSpacing: -0.5 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, color: colors.paper, fontSize: 13 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  genreRow: { gap: 8, paddingVertical: 2 },
  genreChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  genreChipActive: { borderColor: colors.green, backgroundColor: "rgba(33,153,139,0.12)" },
  genreChipText: { color: colors.muted, fontSize: 11 },
  genreChipTextActive: { color: colors.paper },
  loader: { marginTop: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.muted, fontSize: 12 },
  grid: { paddingHorizontal: 16, paddingBottom: 24, gap: 0 },
});
