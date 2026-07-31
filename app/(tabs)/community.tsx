import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, ApiLog } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius, font } from "@/lib/theme";
import { QUOTE_CATEGORIES, quoteCategoryLabel } from "@/lib/quoteCategories";
import { CommentsSection } from "@/components/CommentsSection";
import { HeaderActions } from "@/components/HeaderActions";
import { AppLogo } from "@/components/AppLogo";
import { ShareCardSheet } from "@/components/ShareCardSheet";

type Scope = "all" | "following";
type ContentType = "review" | "quote";

function timeAgo(iso: string, language: "ar" | "en") {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return pick(language, "الآن", "just now");
  if (hours < 24) return pick(language, `قبل ${hours} س`, `${hours}h ago`);
  const days = Math.floor(hours / 24);
  return pick(language, `قبل ${days} يوم`, `${days}d ago`);
}

export default function CommunityScreen() {
  const { language } = useLocale();
  const { user } = useAuth();
  const router = useRouter();

  const [scope, setScope] = useState<Scope>("all");
  const [type, setType] = useState<ContentType>("review");
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [shareLog, setShareLog] = useState<ApiLog | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggleExpanded(logId: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  }

  const load = useCallback(async (currentScope: Scope, currentType: ContentType, currentCategory: string | null, currentQuery: string) => {
    setLoading(true);
    try {
      const { data } = await api.getLogs({
        per_page: 40,
        following: currentScope === "following",
        type: currentType,
        category: currentType === "quote" ? currentCategory ?? undefined : undefined,
        search: currentQuery.trim() || undefined,
      });
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(scope, type, category, query);
      // Only re-run on focus / scope / type / category changes here — the
      // search box debounces its own reload below instead of firing on every
      // keystroke via this effect.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, scope, type, category])
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(scope, type, category, query);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function toggleLike(log: ApiLog) {
    if (!user) return;
    setLogs((current) =>
      current.map((item) =>
        item.id === log.id ? { ...item, liked_by_viewer: !item.liked_by_viewer, likes_count: item.likes_count + (item.liked_by_viewer ? -1 : 1) } : item
      )
    );
    try {
      const { data } = log.liked_by_viewer ? await api.unlikeLog(log.id) : await api.likeLog(log.id);
      setLogs((current) => current.map((item) => (item.id === log.id ? data : item)));
    } catch {
      load(scope, type, category, query);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <AppLogo />
        <View style={styles.titleRow}>
          <Text style={styles.heading}>{pick(language, "المجتمع", "Community")}</Text>
          <HeaderActions />
        </View>

        <View style={styles.typeTabs}>
          <Pressable style={[styles.typeTab, type === "review" && styles.typeTabActive]} onPress={() => setType("review")}>
            <Ionicons name="reader-outline" size={14} color={type === "review" ? colors.ink : colors.muted} />
            <Text style={[styles.typeTabText, type === "review" && styles.typeTabTextActive]}>{pick(language, "مراجعات", "Reviews")}</Text>
          </Pressable>
          <Pressable style={[styles.typeTab, type === "quote" && styles.typeTabActive]} onPress={() => setType("quote")}>
            <Ionicons name="chatbox-ellipses-outline" size={14} color={type === "quote" ? colors.ink : colors.muted} />
            <Text style={[styles.typeTabText, type === "quote" && styles.typeTabTextActive]}>{pick(language, "اقتباسات", "Quotes")}</Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={15} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={
              type === "quote"
                ? pick(language, "ابحث في الاقتباسات...", "Search quotes...")
                : pick(language, "ابحث في المراجعات...", "Search reviews...")
            }
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {type === "quote" && (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={QUOTE_CATEGORIES}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.categoryRow}
            ListHeaderComponent={
              <Pressable style={[styles.categoryChip, category === null && styles.categoryChipActive]} onPress={() => setCategory(null)}>
                <Text style={[styles.categoryChipText, category === null && styles.categoryChipTextActive]}>{pick(language, "الكل", "All")}</Text>
              </Pressable>
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.categoryChip, category === item.key && styles.categoryChipActive]}
                onPress={() => setCategory(category === item.key ? null : item.key)}
              >
                <Ionicons name={item.icon as never} size={12} color={category === item.key ? colors.ink : colors.muted} />
                <Text style={[styles.categoryChipText, category === item.key && styles.categoryChipTextActive]}>{pick(language, item.ar, item.en)}</Text>
              </Pressable>
            )}
          />
        )}

        {user && (
          <View style={styles.tabs}>
            <Pressable style={[styles.tab, scope === "all" && styles.tabActive]} onPress={() => setScope("all")}>
              <Text style={[styles.tabText, scope === "all" && styles.tabTextActive]}>{pick(language, "من الجميع", "Everyone")}</Text>
            </Pressable>
            <Pressable style={[styles.tab, scope === "following" && styles.tabActive]} onPress={() => setScope("following")}>
              <Text style={[styles.tabText, scope === "following" && styles.tabTextActive]}>{pick(language, "أتابعهم", "Following")}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.green} />
      ) : logs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {query.trim()
              ? pick(language, "لا توجد نتائج مطابقة.", "No matching results.")
              : type === "quote"
              ? pick(language, "لا توجد اقتباسات بعد.", "No quotes yet.")
              : scope === "following"
              ? pick(language, "لا توجد مراجعات بعد ممن تتابعهم.", "No reviews yet from people you follow.")
              : pick(language, "لا توجد مراجعات بعد.", "No reviews yet.")}
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}>
        <FlatList
          data={logs}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Pressable onPress={() => item.user && router.push(`/user/${item.user.username}`)}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.user?.name?.slice(0, 1).toUpperCase() ?? "?"}</Text>
                  </View>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{item.user?.name}</Text>
                  <Text style={styles.time}>{timeAgo(item.created_at, language)}</Text>
                </View>
                {type === "quote" && item.quote_category ? (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{quoteCategoryLabel(item.quote_category, language)}</Text>
                  </View>
                ) : item.ratings.overall ? (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={11} color={colors.gold} />
                    <Text style={styles.ratingBadgeText}>{item.ratings.overall}</Text>
                  </View>
                ) : null}
              </View>

              <Pressable style={styles.body} onPress={() => item.film && router.push(`/film/${item.film.slug}`)}>
                {item.film?.poster_url ? (
                  <Image source={{ uri: item.film.poster_url }} style={styles.poster} contentFit="cover" />
                ) : (
                  <View style={[styles.poster, styles.posterFallback]} />
                )}
                <View style={styles.bodyText}>
                  <Text style={styles.filmTitle}>{item.film?.title}</Text>
                  {type === "quote" && item.quote ? (
                    <Text numberOfLines={expanded.has(item.id) ? undefined : 3} style={styles.quote}>
                      "{item.quote}"
                    </Text>
                  ) : item.review ? (
                    <Text numberOfLines={expanded.has(item.id) ? undefined : 3} style={styles.review}>
                      {item.review}
                    </Text>
                  ) : null}
                </View>
              </Pressable>

              <View style={styles.footer}>
                <Pressable style={styles.footerButton} onPress={() => toggleLike(item)} disabled={!user}>
                  <Ionicons name={item.liked_by_viewer ? "heart" : "heart-outline"} size={16} color={item.liked_by_viewer ? colors.orange : colors.muted} />
                  <Text style={styles.footerButtonText}>{item.likes_count}</Text>
                </Pressable>
                <Pressable style={styles.footerButton} onPress={() => toggleExpanded(item.id)}>
                  <Ionicons name="chatbubble-outline" size={15} color={colors.muted} />
                  <Text style={styles.footerButtonText}>{item.comments_count ?? 0}</Text>
                </Pressable>
                <Pressable style={styles.footerButton} onPress={() => setShareLog(item)}>
                  <Ionicons name="share-outline" size={15} color={colors.muted} />
                </Pressable>
              </View>

              {expanded.has(item.id) && (
                <View style={styles.commentsWrap}>
                  <CommentsSection type="log" id={item.id} filmId={item.film?.id} />
                </View>
              )}
            </View>
          )}
        />
        </KeyboardAvoidingView>
      )}

      <ShareCardSheet visible={shareLog !== null} onClose={() => setShareLog(null)} log={shareLog} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, gap: 12 },
  heading: { color: colors.paper, fontFamily: font.display, fontSize: 30, letterSpacing: 0.5 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typeTabs: { flexDirection: "row", gap: 8 },
  typeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 10,
  },
  typeTabActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  typeTabText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  typeTabTextActive: { color: colors.ink },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, color: colors.paper, fontSize: 13, padding: 0 },
  categoryRow: { gap: 8, paddingVertical: 2 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  categoryChipText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  categoryChipTextActive: { color: colors.ink },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 7 },
  tabActive: { borderColor: colors.green, backgroundColor: "rgba(33,153,139,0.12)" },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  tabTextActive: { color: colors.paper },
  loader: { marginTop: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.muted, fontSize: 12, textAlign: "center", paddingHorizontal: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, padding: 14, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.paperMuted, fontSize: 12, fontWeight: "700" },
  userName: { color: colors.paper, fontSize: 12, fontWeight: "600" },
  time: { color: colors.muted, fontSize: 10 },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingBadgeText: { color: colors.gold, fontSize: 11, fontWeight: "700" },
  categoryBadge: { borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  categoryBadgeText: { color: colors.gold, fontSize: 10, fontWeight: "700" },
  body: { flexDirection: "row", gap: 12 },
  poster: { width: 56, aspectRatio: 0.69, borderRadius: 6, backgroundColor: colors.surface2 },
  posterFallback: {},
  bodyText: { flex: 1, gap: 4, justifyContent: "center" },
  filmTitle: { color: colors.paper, fontSize: 13, fontWeight: "700" },
  quote: { color: "#c9c2a8", fontSize: 12, fontStyle: "italic", lineHeight: 18 },
  review: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  footer: { flexDirection: "row", gap: 18, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 },
  footerButton: { flexDirection: "row", alignItems: "center", gap: 5 },
  footerButtonText: { color: colors.muted, fontSize: 11 },
  commentsWrap: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
});
