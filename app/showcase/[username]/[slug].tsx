import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable, useWindowDimensions, KeyboardAvoidingView, Platform } from "react-native";
// The draggable card itself needs a gesture-handler-aware touchable (not core
// RN's Pressable) so its long-press shares the same native gesture arena as
// the list's underlying Pan gesture. Mixing the two causes Android to hand
// the touch to the wrong responder: the long-press fires (picking the item
// up) but the drag gesture never receives movement, so on release it snaps
// straight to whatever the placeholder index defaulted to (index 0).
import { Pressable as DragPressable } from "react-native-gesture-handler";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter, useNavigation, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { NestableScrollContainer, NestableDraggableFlatList } from "react-native-draggable-flatlist";
import { api, ApiList, SearchResult } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import { CommentsSection } from "@/components/CommentsSection";
import { AddFilmSheet } from "@/components/AddFilmSheet";

export default function ShowcaseDetailScreen() {
  const { username, slug } = useLocalSearchParams<{ username: string; slug: string }>();
  const { language } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [list, setList] = useState<ApiList | null>(null);
  const [loading, setLoading] = useState(true);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  const load = useCallback(async () => {
    if (!username || !slug) return;
    setLoading(true);
    try {
      const { data } = await api.getList(username, slug);
      setList(data);
      navigation.setOptions({ title: data.name });
    } finally {
      setLoading(false);
    }
  }, [username, slug, navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isOwner = !!user && !!list?.user && user.username === list.user.username;

  useEffect(() => {
    if (!list) return;
    navigation.setOptions({
      headerRight: isOwner
        ? () => (
            <View style={styles.headerActions}>
              <Pressable
                hitSlop={8}
                onPress={() =>
                  router.push({
                    pathname: "/showcase/edit/[id]",
                    params: {
                      id: String(list.id),
                      name: list.name,
                      description: list.description ?? "",
                      tags: (list.tags ?? []).join(","),
                      is_ranked: list.is_ranked ? "1" : "0",
                      is_public: list.is_public ? "1" : "0",
                      username: list.user?.username ?? "",
                      slug: list.slug,
                    },
                  })
                }
              >
                <Ionicons name="create-outline" size={20} color={colors.paper} />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => setAddSheetOpen(true)}>
                <Ionicons name="add-circle-outline" size={22} color={colors.paper} />
              </Pressable>
            </View>
          )
        : undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, isOwner, navigation]);

  async function removeItem(filmId: number) {
    if (!list) return;
    setList((current) => (current ? { ...current, items: current.items?.filter((i) => i.film.id !== filmId) } : current));
    try {
      await api.removeListItem(list.id, filmId);
    } catch {
      load();
    }
  }

  async function handleAddFilm(film: SearchResult) {
    if (!list) return;
    await api.addListItem(list.id, film.tmdb_id);
    setAddSheetOpen(false);
    load();
  }

  async function handleDragEnd(data: NonNullable<ApiList["items"]>) {
    if (!list) return;
    setList({ ...list, items: data });
    try {
      await api.reorderListItems(list.id, data.map((i) => i.id));
    } catch {
      load();
    }
  }

  if (loading || !list) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  const posterWidth = (width - 16 * 2 - 12 * 2) / 3;
  const canReorder = isOwner && list.is_ranked;
  const existingTmdbIds = (list.items ?? []).map((i) => i.film.tmdb_id);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
    <NestableScrollContainer style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{list.user?.name?.slice(0, 1).toUpperCase() ?? "?"}</Text>
        </View>
        <Pressable onPress={() => list.user && router.push(`/user/${list.user.username}`)}>
          <Text style={styles.byline}>
            {pick(language, "بواسطة", "by")} {list.user?.name}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.title}>{list.name}</Text>
      {list.description && <Text style={styles.description}>{list.description}</Text>}

      {list.tags && list.tags.length > 0 && (
        <View style={styles.chipRow}>
          {list.tags.map((tag) => (
            <View key={tag} style={styles.chip}>
              <Text style={styles.chipText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {user && list.items && list.items.length > 0 && (
        <View style={styles.statBlock}>
          <Ionicons name="eye-outline" size={14} color={colors.green} />
          <Text style={styles.statText}>
            {pick(
              language,
              `شاهدت ${list.items.filter((i) => i.film.viewer_watched).length} من ${list.items.length} فيلمًا من هذا العرض`,
              `You've watched ${list.items.filter((i) => i.film.viewer_watched).length}/${list.items.length} films from this showcase`
            )}
          </Text>
        </View>
      )}

      {isOwner && (
        <Pressable style={styles.addFilmButton} onPress={() => setAddSheetOpen(true)}>
          <Ionicons name="add" size={16} color={colors.paper} />
          <Text style={styles.addFilmButtonText}>{pick(language, "أضف فيلمًا", "Add a film")}</Text>
        </Pressable>
      )}

      {canReorder ? (
        <NestableDraggableFlatList
          data={list.items ?? []}
          keyExtractor={(item) => String(item.id)}
          scrollEnabled={false}
          contentContainerStyle={styles.dragListContent}
          onDragBegin={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
          onDragEnd={({ data }) => handleDragEnd(data)}
          renderItem={({ item, getIndex, drag, isActive }) => {
            const index = getIndex() ?? 0;
            return (
              <DragPressable
                onPress={() => router.push(`/film/${item.film.slug}`)}
                onLongPress={drag}
                delayLongPress={350}
                disabled={isActive}
                style={[styles.dragRow, isActive && styles.dragRowActive]}
              >
                <Ionicons name="reorder-three" size={18} color={colors.muted} />
                <Text style={styles.dragRowIndex}>{index + 1}</Text>
                <View style={styles.dragRowThumb}>
                  {item.film.poster_url ? (
                    <Image source={{ uri: item.film.poster_url }} style={styles.posterImage} contentFit="cover" />
                  ) : null}
                </View>
                <Text numberOfLines={1} style={styles.dragRowTitle}>
                  {item.film.title}
                </Text>
                <Pressable style={styles.dragRowRemove} onPress={() => removeItem(item.film.id)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={colors.muted} />
                </Pressable>
              </DragPressable>
            );
          }}
        />
      ) : (
        <View style={styles.grid}>
          {(list.items ?? []).map((item, index) => (
            <View key={item.id} style={{ width: posterWidth }}>
              <Pressable onPress={() => router.push(`/film/${item.film.slug}`)}>
                <View style={[styles.poster, { width: posterWidth, height: posterWidth / 0.69 }]}>
                  {item.film.poster_url ? (
                    <Image source={{ uri: item.film.poster_url }} style={styles.posterImage} contentFit="cover" />
                  ) : null}
                  {list.is_ranked && (
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>{index + 1}</Text>
                    </View>
                  )}
                  {isOwner && (
                    <Pressable style={styles.removeButton} onPress={() => removeItem(item.film.id)} hitSlop={6}>
                      <Ionicons name="close" size={13} color={colors.paper} />
                    </Pressable>
                  )}
                </View>
              </Pressable>
              <Text numberOfLines={1} style={styles.filmTitle}>
                {item.film.title}
              </Text>
            </View>
          ))}
        </View>
      )}

      {(!list.items || list.items.length === 0) && (
        <Text style={styles.empty}>{pick(language, "لا توجد أفلام في هذا العرض بعد.", "No films in this showcase yet.")}</Text>
      )}

      {canReorder && (list.items?.length ?? 0) > 1 && (
        <Text style={styles.dragTip}>{pick(language, "اضغط مطولاً على فيلم لإعادة ترتيب القائمة.", "Long-press a film to drag and reorder.")}</Text>
      )}

      <CommentsSection type="showcase" id={list.id} />

      <AddFilmSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onAdd={handleAddFilm}
        existingTmdbIds={existingTmdbIds}
      />
    </NestableScrollContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  loaderScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  content: { padding: 16, gap: 16, paddingBottom: 48 },
  headerActions: { flexDirection: "row", gap: 16, marginRight: 4 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.paperMuted, fontSize: 10, fontWeight: "700" },
  byline: { color: colors.muted, fontSize: 11 },
  title: { color: colors.paper, fontSize: 24, fontWeight: "700" },
  description: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: colors.muted, fontSize: 11 },
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
  addFilmButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 11 },
  addFilmButtonText: { color: colors.paper, fontSize: 12, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  poster: { borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  posterImage: { width: "100%", height: "100%" },
  rankBadge: { position: "absolute", top: 6, left: 6, backgroundColor: "rgba(9,9,16,0.75)", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  rankBadgeText: { color: colors.gold, fontSize: 10, fontWeight: "700" },
  removeButton: { position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(9,9,16,0.75)", alignItems: "center", justifyContent: "center" },
  dragListContent: { gap: 8 },
  dragRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 8,
  },
  dragRowActive: { borderColor: colors.green, backgroundColor: colors.surface2 },
  dragRowIndex: { color: colors.gold, fontSize: 12, fontWeight: "700", width: 18, textAlign: "center" },
  dragRowThumb: { width: 40, height: 58, borderRadius: radius.sm, overflow: "hidden", backgroundColor: colors.surface2 },
  dragRowTitle: { flex: 1, color: colors.paper, fontSize: 13, fontWeight: "600" },
  dragRowRemove: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  dragTip: { color: colors.muted, fontSize: 11, textAlign: "center", marginTop: -4 },
  filmTitle: { color: colors.paperMuted, fontSize: 11, marginTop: 6 },
  empty: { color: colors.muted, fontSize: 12 },
});
