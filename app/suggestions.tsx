import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiSuggestion } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors } from "@/lib/theme";

export default function SuggestionsScreen() {
  const { language } = useLocale();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<ApiSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.getSuggestions();
      setSuggestions(data);
      data.filter((item) => !item.read_at).forEach((item) => api.markSuggestionRead(item.id).catch(() => {}));
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function open(suggestion: ApiSuggestion) {
    if (suggestion.film) {
      router.push(`/film/${suggestion.film.slug}`);
    } else if (suggestion.showcase?.user) {
      router.push(`/showcase/${suggestion.showcase.user.username}/${suggestion.showcase.slug}`);
    }
  }

  if (loading) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {suggestions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{pick(language, "لا توجد اقتراحات بعد.", "No suggestions yet.")}</Text>
        </View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const target = item.film ?? item.showcase;
            const poster = item.film?.poster_url ?? item.showcase?.items?.[0]?.film.poster_url ?? null;
            return (
              <Pressable style={styles.row} onPress={() => open(item)}>
                <View style={styles.poster}>
                  {poster ? (
                    <Image source={{ uri: poster }} style={styles.posterImage} contentFit="cover" />
                  ) : (
                    <Ionicons name={item.film ? "film-outline" : "grid-outline"} size={18} color={colors.muted} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.text}>
                    {pick(
                      language,
                      `اقترح عليك ${item.sender?.name ?? ""} ${item.film ? "مشاهدة" : "الاطلاع على"} ${target ? ("title" in target ? target.title : target.name) : ""}`,
                      `${item.sender?.name ?? ""} suggested you ${item.film ? "watch" : "check out"} ${target ? ("title" in target ? target.title : target.name) : ""}`
                    )}
                  </Text>
                  {item.message && (
                    <Text style={styles.preview} numberOfLines={2}>
                      "{item.message}"
                    </Text>
                  )}
                </View>
                {!item.read_at && <View style={styles.dot} />}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  loaderScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.muted, fontSize: 12 },
  list: { padding: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  poster: { width: 36, height: 52, borderRadius: 6, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  posterImage: { width: "100%", height: "100%" },
  text: { color: colors.paper, fontSize: 12, lineHeight: 17 },
  preview: { color: colors.muted, fontSize: 10, fontStyle: "italic", marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.orange },
});
