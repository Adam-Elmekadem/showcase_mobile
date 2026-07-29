import React, { useEffect, useRef, useState } from "react";
import { View, Text, Modal, Pressable, TextInput, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { api, SearchResult } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export function AddFilmSheet({
  visible,
  onClose,
  onAdd,
  existingTmdbIds = [],
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (film: SearchResult) => Promise<void> | void;
  existingTmdbIds?: number[];
}) {
  const { language } = useLocale();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setResults([]);
      return;
    }
  }, [visible]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.searchFilms(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function handleAdd(film: SearchResult) {
    setAddingId(film.tmdb_id);
    try {
      await onAdd(film);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{pick(language, "أضف فيلمًا", "Add a film")}</Text>
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

        {loading ? (
          <ActivityIndicator color={colors.green} style={{ marginVertical: 20 }} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => String(item.tmdb_id)}
            style={{ maxHeight: 360 }}
            ListEmptyComponent={
              query.trim().length >= 2 ? (
                <Text style={styles.empty}>{pick(language, "لا توجد نتائج.", "No results.")}</Text>
              ) : null
            }
            renderItem={({ item }) => {
              const already = existingTmdbIds.includes(item.tmdb_id);
              return (
                <Pressable style={styles.row} onPress={() => !already && handleAdd(item)} disabled={already || addingId === item.tmdb_id}>
                  {item.poster_url ? (
                    <Image source={{ uri: item.poster_url }} style={styles.poster} contentFit="cover" />
                  ) : (
                    <View style={[styles.poster, styles.posterFallback]} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.year ? <Text style={styles.rowYear}>{item.year}</Text> : null}
                  </View>
                  {addingId === item.tmdb_id ? (
                    <ActivityIndicator size="small" color={colors.muted} />
                  ) : already ? (
                    <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                  ) : (
                    <Ionicons name="add-circle-outline" size={20} color={colors.paper} />
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 36, gap: 14, maxHeight: "85%" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.paper, fontSize: 16, fontWeight: "700" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, color: colors.paper, fontSize: 13 },
  empty: { color: colors.muted, fontSize: 12, textAlign: "center", paddingVertical: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  poster: { width: 42, aspectRatio: 0.69, borderRadius: 4, backgroundColor: colors.surface2 },
  posterFallback: {},
  rowTitle: { color: colors.paper, fontSize: 13, fontWeight: "600" },
  rowYear: { color: colors.muted, fontSize: 11, marginTop: 2 },
});
