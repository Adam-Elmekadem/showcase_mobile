import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, useWindowDimensions, Alert } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { api, ApiError, ApiFilm, ApiList, ApiLog, UserStats } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius, font } from "@/lib/theme";
import { FilmCard, FilmCardData, filmCardWidth, filmCardGap } from "@/components/FilmCard";
import { FavoritesSheet } from "@/components/FavoritesSheet";
import { ShowcaseCard } from "@/components/ShowcaseCard";
import { AccordionSection } from "@/components/AccordionSection";

const MAX_FAVORITES = 5;
const GRID_COLUMNS = 4;

type DiaryMonth = { month: number; logs: ApiLog[] };
type DiaryYear = { year: number; months: DiaryMonth[] };

function logDate(log: ApiLog) {
  return new Date(log.watched_on ?? log.created_at);
}

function monthName(month: number, language: "ar" | "en") {
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", { month: "long" }).format(new Date(2000, month, 1));
}

export default function ProfileScreen() {
  const { user, setUser } = useAuth();
  const { language } = useLocale();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const favoritesCardWidth = filmCardWidth(width - 32, 4);
  const gridCardWidth = filmCardWidth(width - 32, GRID_COLUMNS);

  const [stats, setStats] = useState<UserStats | null>(null);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [lists, setLists] = useState<ApiList[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.getUserStats(user.username);
      setStats(data);
    } catch {
      setStats(null);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const loadContent = useCallback(async () => {
    if (!user) return;
    setContentLoading(true);
    const [logsRes, listsRes] = await Promise.allSettled([
      api.getLogs({ username: user.username, per_page: 50 }),
      api.getLists(user.username, 40),
    ]);
    setLogs(logsRes.status === "fulfilled" ? logsRes.value.data : []);
    setLists(listsRes.status === "fulfilled" ? listsRes.value.data : []);
    setContentLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadContent();
    }, [loadContent])
  );

  // Films = every distinct film logged; Reviews narrows that to logs with
  // review text. Both dedupe by film so a rewatch doesn't repeat a poster.
  const filmsGrid = useMemo(() => dedupeFilms(logs), [logs]);
  const reviewsGrid = useMemo(() => dedupeFilms(logs.filter((log) => log.review)), [logs]);
  const filmsGridCards = useMemo(() => filmsGrid.map(toFilmCardData), [filmsGrid]);
  const reviewsGridCards = useMemo(() => reviewsGrid.map(toFilmCardData), [reviewsGrid]);

  // Diary is the opposite: every single watch, including rewatches, grouped
  // by year then month, most recent first.
  const diaryYears = useMemo<DiaryYear[]>(() => {
    const withFilm = logs.filter((log) => log.film);
    const sorted = [...withFilm].sort((a, b) => logDate(b).getTime() - logDate(a).getTime());
    const years = new Map<number, Map<number, ApiLog[]>>();
    for (const log of sorted) {
      const date = logDate(log);
      const year = date.getFullYear();
      const month = date.getMonth();
      if (!years.has(year)) years.set(year, new Map());
      const months = years.get(year)!;
      if (!months.has(month)) months.set(month, []);
      months.get(month)!.push(log);
    }
    return Array.from(years.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({
        year,
        months: Array.from(months.entries())
          .sort((a, b) => b[0] - a[0])
          .map(([month, monthLogs]) => ({ month, logs: monthLogs })),
      }));
  }, [logs]);

  async function pickAndUploadAvatar(useCamera: boolean) {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        pick(language, "الإذن مطلوب", "Permission needed"),
        pick(language, "امنح الإذن من إعدادات هاتفك للمتابعة.", "Grant permission from your phone's settings to continue.")
      );
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    setAvatarBusy(true);

    // Picked photos can come back as a large content:// URI straight from the
    // camera roll — React Native's networking layer can fail to read those
    // directly when building a multipart body ("Network request failed" with
    // no server-side clue why). Re-encoding through expo-image-manipulator
    // both shrinks the file (faster, safer upload) and normalizes it to a
    // plain file:// JPEG that fetch can reliably attach. But the manipulator
    // is its own native module and can fail independently (e.g. on a
    // content:// URI it can't read either) — if it does, fall back to
    // uploading the original picked file rather than aborting outright.
    let uploadUri = asset.uri;
    let uploadType = asset.mimeType && asset.mimeType.startsWith("image/") ? asset.mimeType : "image/jpeg";
    try {
      const { manipulateAsync, SaveFormat } = await import("expo-image-manipulator");
      const manipulated = await manipulateAsync(asset.uri, [{ resize: { width: 640, height: 640 } }], {
        compress: 0.8,
        format: SaveFormat.JPEG,
      });
      uploadUri = manipulated.uri;
      uploadType = "image/jpeg";
    } catch (manipulateError) {
      console.log("Avatar: image resize/re-encode failed, uploading original file instead.", manipulateError);
    }

    try {
      // Upload straight to Cloudinary (same pattern as the web app's share-card
      // cover photo) instead of routing the binary through our own API — that
      // avoids the local dev server entirely, which is what actually matters
      // when testing over a phone's Wi-Fi/hotspot connection to a laptop.
      //
      // Expo's newer spec-compliant fetch/FormData (which replaces React
      // Native's own) only accepts a string, a real Blob, or an object with a
      // `.bytes()` method for a part — the classic RN `{uri,name,type}` object
      // isn't any of those and throws "Unsupported FormDataPart implementation".
      // Building a Blob ourselves doesn't work either: reading the local file
      // through fetch().blob() hands back RN's own legacy Blob (fails Winter's
      // `instanceof Blob` check), and `new Blob([arrayBuffer])` isn't supported
      // by that same legacy Blob polyfill. expo-file-system's uploadAsync does
      // the multipart encoding natively, sidestepping the JS Blob/FormData
      // layer entirely.
      const sign = await api.signCloudinaryUpload("avatars");
      const uploadResult = await FileSystem.uploadAsync(
        `https://api.cloudinary.com/v1_1/${sign.cloud_name}/image/upload`,
        uploadUri,
        {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: "file",
          mimeType: uploadType,
          parameters: {
            api_key: sign.api_key,
            timestamp: String(sign.timestamp),
            folder: sign.folder,
            signature: sign.signature,
          },
        }
      );
      if (uploadResult.status < 200 || uploadResult.status >= 300) throw new Error("Cloudinary upload failed");
      const uploaded = JSON.parse(uploadResult.body);

      const { data } = await api.updateMe({ avatar_path: uploaded.secure_url });
      setUser(data);
    } catch (error) {
      console.log("Avatar upload failed:", error);
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error && error.message
          ? error.message
          : pick(language, "حاول مجددًا.", "Please try again.");
      Alert.alert(pick(language, "تعذّر الرفع", "Upload failed"), message);
    } finally {
      setAvatarBusy(false);
    }
  }

  function handleAvatarPress() {
    Alert.alert(pick(language, "صورة الملف الشخصي", "Profile photo"), undefined, [
      { text: pick(language, "التقاط صورة", "Take photo"), onPress: () => pickAndUploadAvatar(true) },
      { text: pick(language, "اختيار من الصور", "Choose from library"), onPress: () => pickAndUploadAvatar(false) },
      { text: pick(language, "إلغاء", "Cancel"), style: "cancel" },
    ]);
  }

  if (!user) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        <Pressable onPress={handleAvatarPress} disabled={avatarBusy} style={styles.avatarWrap}>
          <View style={styles.avatar}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
            )}
            {avatarBusy && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={colors.paper} size="small" />
              </View>
            )}
          </View>
          {/* Sits in a wrapper without overflow:hidden — a circular avatar clips
              its own corners, so a badge drawn *inside* the circle view was
              being cut off by the same rounding that makes the avatar round. */}
          {!avatarBusy && (
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={13} color={colors.paper} />
            </View>
          )}
        </Pressable>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
      </View>

      <View style={styles.statsRow}>
        <Stat value={stats?.films_logged ?? user.stats?.films_logged ?? 0} label={pick(language, "أفلام", "Films")} />
        <Pressable onPress={() => router.push(`/user/${user.username}/connections?kind=followers`)}>
          <Stat value={user.stats?.followers ?? 0} label={pick(language, "متابعون", "Followers")} />
        </Pressable>
        <Pressable onPress={() => router.push(`/user/${user.username}/connections?kind=following`)}>
          <Stat value={user.stats?.following ?? 0} label={pick(language, "يتابع", "Following")} />
        </Pressable>
        {stats?.average_rating ? <Stat value={stats.average_rating.toFixed(1)} label={pick(language, "متوسط", "Avg rating")} /> : null}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{pick(language, `المفضلة (${MAX_FAVORITES} كحد أقصى)`, `Favorites (max ${MAX_FAVORITES})`)}</Text>
          {(user.favorite_films?.length ?? 0) > 0 && (
            <Pressable onPress={() => setFavoritesOpen(true)} hitSlop={8}>
              <Ionicons name="pencil" size={13} color={colors.muted} />
            </Pressable>
          )}
        </View>
        <View style={styles.favoritesRow}>
          {(user.favorite_films ?? []).slice(0, MAX_FAVORITES).map((film) => (
            <FilmCard
              key={film.id}
              film={toFilmCardData(film)}
              width={favoritesCardWidth}
              siblings={(user.favorite_films ?? []).slice(0, MAX_FAVORITES).map(toFilmCardData)}
            />
          ))}
          {Array.from({ length: Math.max(0, MAX_FAVORITES - (user.favorite_films?.length ?? 0)) }).map((_, index) => (
            <Pressable
              key={index}
              style={[styles.favoriteEmptySlot, { width: favoritesCardWidth, height: favoritesCardWidth / 0.69 }]}
              onPress={() => setFavoritesOpen(true)}
            >
              <Ionicons name="add" size={22} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </View>

      <FavoritesSheet
        visible={favoritesOpen}
        onClose={() => setFavoritesOpen(false)}
        favorites={user.favorite_films ?? []}
        onChange={(updated) => setUser(updated)}
      />

      {contentLoading ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: 24 }} />
      ) : (
        <>
          <AccordionSection title={pick(language, "أفلام", "Films")} defaultExpanded>
            {filmsGridCards.length === 0 ? (
              <Text style={styles.emptyText}>{pick(language, "لم تُسجَّل أي أفلام بعد.", "No films logged yet.")}</Text>
            ) : (
              <View style={styles.grid}>
                {filmsGridCards.map((film) => (
                  <FilmCard key={film.tmdb_id} film={film} width={gridCardWidth} siblings={filmsGridCards} />
                ))}
              </View>
            )}
          </AccordionSection>

          <AccordionSection title={pick(language, "مراجعات", "Reviews")}>
            {reviewsGridCards.length === 0 ? (
              <Text style={styles.emptyText}>{pick(language, "لا توجد مراجعات بعد.", "No reviews yet.")}</Text>
            ) : (
              <View style={styles.grid}>
                {reviewsGridCards.map((film) => (
                  <FilmCard key={film.tmdb_id} film={film} width={gridCardWidth} siblings={reviewsGridCards} />
                ))}
              </View>
            )}
          </AccordionSection>

          <AccordionSection title={pick(language, "قوائم", "Lists")}>
            {lists.length === 0 ? (
              <Text style={styles.emptyText}>{pick(language, "لا توجد قوائم بعد.", "No lists yet.")}</Text>
            ) : (
              <View style={{ gap: 14 }}>
                {lists.map((list) => (
                  <ShowcaseCard key={list.id} list={list} />
                ))}
              </View>
            )}
          </AccordionSection>

          <AccordionSection title={pick(language, "يوميات", "Diary")}>
            {diaryYears.length === 0 ? (
              <Text style={styles.emptyText}>{pick(language, "لم تُسجَّل أي أفلام بعد.", "No films logged yet.")}</Text>
            ) : (
              <View style={{ gap: 20 }}>
                {diaryYears.map((year) => (
                  <View key={year.year} style={{ gap: 14 }}>
                    <Text style={styles.diaryYear}>{year.year}</Text>
                    {year.months.map((month) => (
                      <View key={month.month} style={{ gap: 8 }}>
                        <Text style={styles.diaryMonth}>{monthName(month.month, language)}</Text>
                        {month.logs.map((log) => (
                          <DiaryRow key={log.id} log={log} />
                        ))}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </AccordionSection>
        </>
      )}
    </ScrollView>
  );
}

function toFilmCardData(film: ApiFilm): FilmCardData {
  return {
    tmdb_id: film.tmdb_id,
    slug: film.slug,
    title: film.title,
    year: film.year,
    poster_url: film.poster_url,
    backdrop_url: film.backdrop_url,
    vote_average: film.vote_average,
    genres: film.genres,
    viewer_watched: film.viewer_watched,
    viewer_rating: film.viewer_rating,
    viewer_log_id: film.viewer_log_id,
  };
}

function dedupeFilms(logs: ApiLog[]) {
  const seen = new Set<number>();
  const films: ApiFilm[] = [];
  for (const log of logs) {
    if (log.film && !seen.has(log.film.id)) {
      seen.add(log.film.id);
      films.push(log.film);
    }
  }
  return films;
}

function DiaryRow({ log }: { log: ApiLog }) {
  const router = useRouter();
  const film = log.film;
  if (!film) return null;
  const day = logDate(log).getDate();
  const rating = log.ratings.overall;

  return (
    <Pressable style={styles.diaryRow} onPress={() => router.push(`/film/${film.slug}`)}>
      <Text style={styles.diaryDay}>{String(day).padStart(2, "0")}</Text>
      {film.poster_url ? (
        <Image source={{ uri: film.poster_url }} style={styles.diaryPoster} contentFit="cover" />
      ) : (
        <View style={[styles.diaryPoster, styles.diaryPosterFallback]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.diaryTitle} numberOfLines={1}>
          {film.title}
        </Text>
        {film.year ? <Text style={styles.diaryFilmYear}>{film.year}</Text> : null}
      </View>
      {rating ? <Text style={styles.diaryRating}>{"★".repeat(Math.max(0, Math.min(5, Math.round(rating))))}</Text> : null}
    </Pressable>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  loaderScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  content: { padding: 16, paddingBottom: 48, gap: 20 },
  identity: { alignItems: "center", gap: 4 },
  avatarWrap: { width: 88, height: 88, marginBottom: 8 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: colors.paperMuted, fontSize: 32 },
  avatarOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(9,9,16,0.55)", alignItems: "center", justifyContent: "center" },
  avatarBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { color: colors.paper, fontSize: 20, fontWeight: "700" },
  username: { color: colors.muted, fontSize: 12 },
  bio: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 4 },
  statsRow: { flexDirection: "row", justifyContent: "center", gap: 28, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  stat: { alignItems: "center", gap: 4 },
  statValue: { color: colors.paper, fontFamily: font.display, fontSize: 24 },
  statLabel: { color: colors.muted, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.4 },
  section: { gap: 10 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.paperMuted, fontFamily: font.display, fontSize: 15, letterSpacing: 0.5, textTransform: "uppercase" },
  favoritesRow: { flexDirection: "row", flexWrap: "wrap", gap: filmCardGap },
  favoriteEmptySlot: { borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: filmCardGap, rowGap: 18 },
  emptyText: { color: colors.muted, fontSize: 12, textAlign: "center", paddingVertical: 20 },
  diaryYear: { color: colors.paper, fontFamily: font.display, fontSize: 20, letterSpacing: 0.5 },
  diaryMonth: { color: colors.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  diaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  diaryDay: { color: colors.muted, fontFamily: font.display, fontSize: 16, width: 22, textAlign: "center" },
  diaryPoster: { width: 36, aspectRatio: 0.69, borderRadius: 5, backgroundColor: colors.surface2 },
  diaryPosterFallback: {},
  diaryTitle: { color: colors.paper, fontSize: 13, fontWeight: "600" },
  diaryFilmYear: { color: colors.muted, fontSize: 11, marginTop: 2 },
  diaryRating: { color: colors.gold, fontSize: 12 },
});
