import React, { useEffect, useRef, useState } from "react";
import { View, Text, Modal, Pressable, TextInput, FlatList, ActivityIndicator, StyleSheet, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, Genre, SearchResult } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import { FilmCard, FilmCardData, filmCardWidth, filmCardGap } from "@/components/FilmCard";
import { setSwipeQueue } from "@/lib/swipeQueue";

const COLUMNS = 3;

function toFilmCardData(item: SearchResult): FilmCardData {
  return {
    tmdb_id: item.tmdb_id,
    title: item.title,
    year: item.year,
    poster_url: item.poster_url,
    backdrop_url: item.backdrop_url,
    vote_average: item.vote_average,
    genres: item.genres,
    viewer_watched: item.viewer_watched,
    viewer_rating: item.viewer_rating,
    viewer_log_id: item.viewer_log_id,
  };
}

export function SearchSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { language } = useLocale();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cardWidth = filmCardWidth(width - 40, COLUMNS);

  const [query, setQuery] = useState("");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [activeGenre, setActiveGenre] = useState<number | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (visible && genres.length === 0) {
      api.getGenres().then(({ data }) => setGenres(data)).catch(() => setGenres([]));
    }
    if (!visible) {
      setQuery("");
      setActiveGenre(null);
      setResults([]);
    }
  }, [visible]);

  useEffect(() => {
    const isSearchMode = query.trim().length >= 2;
    if (!isSearchMode && activeGenre === null) {
      setResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const thisRequest = ++requestId.current;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = isSearchMode
          ? await api.searchFilms(query.trim())
          : await api.discoverFilms({ genre: activeGenre ?? undefined, sort_by: "popularity.desc" });
        if (requestId.current === thisRequest) setResults(data);
      } catch {
        if (requestId.current === thisRequest) setResults([]);
      } finally {
        if (requestId.current === thisRequest) setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, activeGenre]);

  const isSearchMode = query.trim().length >= 2;

  function openFilm(item: SearchResult) {
    onClose();
    setSwipeQueue(results.map(toFilmCardData));
    router.push({ pathname: "/swipe", params: { startTmdbId: String(item.tmdb_id) } });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{pick(language, "بحث", "Search")}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.muted} />
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={pick(language, "ابحث عن فيلم...", "Search for a film...")}
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoFocus
          />
        </View>

        {genres.length > 0 && (
          <FlatList
            horizontal
            data={genres}
            keyExtractor={(g) => String(g.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreRow}
            renderItem={({ item }) => {
              const active = activeGenre === item.id;
              return (
                <Pressable
                  style={[styles.genreChip, active && styles.genreChipActive]}
                  onPress={() => setActiveGenre(active ? null : item.id)}
                >
                  <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>{item.name}</Text>
                </Pressable>
              );
            }}
          />
        )}

        {loading ? (
          <ActivityIndicator color={colors.green} style={{ marginVertical: 24 }} />
        ) : results.length === 0 ? (
          <Text style={styles.hint}>
            {isSearchMode || activeGenre !== null
              ? pick(language, "لا توجد نتائج.", "No results.")
              : pick(language, "اكتب للبحث أو اختر تصنيفًا.", "Type to search, or pick a category.")}
          </Text>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.tmdb_id)}
            numColumns={COLUMNS}
            style={{ maxHeight: 420 }}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: filmCardGap }}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            renderItem={({ item }) => <FilmCard film={toFilmCardData(item)} width={cardWidth} onPress={() => openFilm(item)} />}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 30, gap: 14, maxHeight: "88%" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.paper, fontSize: 15, fontWeight: "700" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, color: colors.paper, fontSize: 13 },
  genreRow: { gap: 8, paddingVertical: 2 },
  genreChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 7 },
  genreChipActive: { borderColor: colors.green, backgroundColor: "rgba(33,153,139,0.12)" },
  genreChipText: { color: colors.muted, fontSize: 11 },
  genreChipTextActive: { color: colors.paper },
  hint: { color: colors.muted, fontSize: 12, textAlign: "center", paddingVertical: 24 },
  grid: { paddingBottom: 8 },
});
