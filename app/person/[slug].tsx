import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { api, ApiPerson, PersonFilmCredit } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import { HorizontalFilms } from "@/components/HorizontalFilms";

type PersonDetail = ApiPerson & {
  filmography: Record<string, PersonFilmCredit[]>;
  viewer_watched_director_films?: number;
  viewer_total_director_films?: number;
};

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  actor: { ar: "أفلام كممثل", en: "Acting" },
  director: { ar: "إخراج", en: "Directing" },
  writer: { ar: "كتابة", en: "Writing" },
  cinematographer: { ar: "تصوير", en: "Cinematography" },
  composer: { ar: "موسيقى", en: "Music" },
};

export default function PersonDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { language } = useLocale();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [person, setPerson] = useState<PersonDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const { data } = await api.getPerson(slug);
      setPerson(data);
      navigation.setOptions({ title: data.name });
    } finally {
      setLoading(false);
    }
  }, [slug, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !person) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          {person.profile_url ? (
            <Image source={{ uri: person.profile_url }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Text style={styles.avatarFallback}>{person.name.slice(0, 1)}</Text>
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{person.name}</Text>
          {person.place_of_birth && <Text style={styles.meta}>{person.place_of_birth}</Text>}
          {person.birthday && <Text style={styles.meta}>{person.birthday}</Text>}
        </View>
      </View>

      {typeof person.viewer_total_director_films === "number" && person.viewer_total_director_films > 0 && (
        <View style={styles.statBlock}>
          <Ionicons name="eye-outline" size={14} color={colors.green} />
          <Text style={styles.statText}>
            {pick(
              language,
              `شاهدت ${person.viewer_watched_director_films ?? 0} من ${person.viewer_total_director_films} فيلمًا من إخراج ${person.name}`,
              `You've watched ${person.viewer_watched_director_films ?? 0}/${person.viewer_total_director_films} films directed by ${person.name}`
            )}
          </Text>
        </View>
      )}

      {person.biography && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{pick(language, "نبذة", "Biography")}</Text>
          <Text style={styles.bio}>{person.biography}</Text>
        </View>
      )}

      {Object.entries(person.filmography ?? {}).map(([role, films]) => {
        const label = ROLE_LABELS[role];
        return (
          <HorizontalFilms
            key={role}
            title={label ? pick(language, label.ar, label.en) : role}
            films={films.map((f) => ({ tmdb_id: f.tmdb_id, title: f.title, year: f.year, poster_url: f.poster_url, vote_average: f.vote_average }))}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  loaderScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  content: { padding: 16, gap: 22, paddingBottom: 48 },
  headerRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarFallback: { color: colors.muted, fontSize: 30, fontWeight: "600" },
  headerText: { flex: 1, gap: 3 },
  name: { color: colors.paper, fontSize: 20, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 11 },
  statBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statText: { color: colors.paperMuted, fontSize: 12, flex: 1 },
  section: { gap: 8 },
  sectionTitle: { color: colors.paperMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  bio: { color: colors.muted, fontSize: 13, lineHeight: 21 },
});
