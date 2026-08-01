import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiFilm, Genre, SearchResult } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, font } from "@/lib/theme";
import { HorizontalFilms } from "@/components/HorizontalFilms";
import { HeaderActions } from "@/components/HeaderActions";
import { AppLogo } from "@/components/AppLogo";
import { SearchSheet } from "@/components/SearchSheet";

const GENRE_ROW_LIMIT = 8;
const CACHE_KEY = "explore-cache-v1";

type ExploreCache = {
  genres: Genre[];
  newest: SearchResult[];
  upcoming: SearchResult[];
  bestOf: SearchResult[];
  fromFriends: ApiFilm[];
  genreFilms: Record<number, SearchResult[]>;
};

function withPosters<T extends { poster_url: string | null }>(films: T[]) {
  return films.filter((film) => !!film.poster_url);
}

export default function ExploreScreen() {
  const { language } = useLocale();
  const [searchOpen, setSearchOpen] = useState(false);

  const [genres, setGenres] = useState<Genre[]>([]);
  const [newest, setNewest] = useState<SearchResult[]>([]);
  const [upcoming, setUpcoming] = useState<SearchResult[]>([]);
  const [bestOf, setBestOf] = useState<SearchResult[]>([]);
  const [fromFriends, setFromFriends] = useState<ApiFilm[]>([]);
  const [genreFilms, setGenreFilms] = useState<Record<number, SearchResult[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // Cache-first: many Android devices fully kill this app's process
      // when it's backgrounded, so returning to it boots a fresh JS
      // instance and every mount effect (this one included) runs from
      // scratch — with no cache, that means a blank spinner and a 2-3s
      // reload each time, even though nothing actually changed. Showing
      // the last-loaded content immediately while refreshing underneath it
      // makes that invisible; the spinner only shows when there's truly
      // nothing to show yet.
      const cachedRaw = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
      let hadCache = false;
      if (cachedRaw && !cancelled) {
        try {
          const cached: ExploreCache = JSON.parse(cachedRaw);
          setGenres(cached.genres);
          setNewest(cached.newest);
          setUpcoming(cached.upcoming);
          setBestOf(cached.bestOf);
          setFromFriends(cached.fromFriends);
          setGenreFilms(cached.genreFilms);
          setLoading(false);
          hadCache = true;
        } catch {
          // Malformed cache — fall through to a normal loading fetch.
        }
      }
      if (!hadCache) setLoading(true);

      const { data: genreList } = await api.getGenres().catch(() => ({ data: [] as Genre[] }));
      if (cancelled) return;
      setGenres(genreList);

      const topGenres = genreList.slice(0, GENRE_ROW_LIMIT);
      const [newestRes, upcomingRes, bestOfRes, friendsRes, ...genreResults] = await Promise.allSettled([
        api.discoverFilms({ sort_by: "primary_release_date.desc" }),
        api.discoverFilms({ upcoming: true }),
        api.discoverFilms({ sort_by: "vote_average.desc" }),
        api.getLogs({ following: true, per_page: 30 }),
        ...topGenres.map((genre) => api.discoverFilms({ genre: genre.id, sort_by: "popularity.desc" })),
      ]);
      if (cancelled) return;

      const newest = newestRes.status === "fulfilled" ? withPosters(newestRes.value.data) : [];
      const upcoming = upcomingRes.status === "fulfilled" ? withPosters(upcomingRes.value.data) : [];
      const bestOf = bestOfRes.status === "fulfilled" ? withPosters(bestOfRes.value.data) : [];
      setNewest(newest);
      setUpcoming(upcoming);
      setBestOf(bestOf);

      let fromFriends: ApiFilm[] = [];
      if (friendsRes.status === "fulfilled") {
        const seen = new Set<number>();
        for (const log of friendsRes.value.data) {
          if (log.film && log.film.poster_url && !seen.has(log.film.id)) {
            seen.add(log.film.id);
            fromFriends.push(log.film);
          }
        }
      }
      setFromFriends(fromFriends);

      const genreFilms: Record<number, SearchResult[]> = {};
      topGenres.forEach((genre, index) => {
        const result = genreResults[index];
        genreFilms[genre.id] = result.status === "fulfilled" ? withPosters(result.value.data) : [];
      });
      setGenreFilms(genreFilms);

      setLoading(false);

      AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ genres: genreList, newest, upcoming, bestOf, fromFriends, genreFilms } satisfies ExploreCache)
      ).catch(() => {});
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <AppLogo />
        <View style={styles.titleRow}>
          <Text style={styles.heading}>{pick(language, "اكتشف سينما", "Find cinema")}</Text>
          <View style={styles.actionsRow}>
            <Pressable onPress={() => setSearchOpen(true)} hitSlop={8}>
              <Ionicons name="search" size={22} color={colors.paper} />
            </Pressable>
            <HeaderActions />
          </View>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.green} />
      ) : (
        <ScrollView contentContainerStyle={styles.sections}>
          <HorizontalFilms title={pick(language, "الأحدث", "Newest")} films={newest} />
          <HorizontalFilms title={pick(language, "قريبًا", "Upcoming")} films={upcoming} />
          <HorizontalFilms title={pick(language, "من أصدقائك", "From your friends")} films={fromFriends} />
          <HorizontalFilms title={pick(language, "الأفضل", "Best of")} films={bestOf} />
          {genres.slice(0, GENRE_ROW_LIMIT).map((genre) => (
            <HorizontalFilms key={genre.id} title={genre.name} films={genreFilms[genre.id] ?? []} />
          ))}
        </ScrollView>
      )}

      <SearchSheet visible={searchOpen} onClose={() => setSearchOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heading: { color: colors.paper, fontFamily: font.display, fontSize: 30, letterSpacing: 0.5 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  loader: { marginTop: 40 },
  sections: { paddingHorizontal: 16, paddingBottom: 32, gap: 22 },
});
