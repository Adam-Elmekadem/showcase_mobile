import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "@/lib/theme";
import { ApiList } from "@/lib/api";
import { useSuggestReveal } from "@/lib/SuggestRevealContext";
import { SuggestSheet } from "@/components/SuggestSheet";

export function ShowcaseCard({ list }: { list: ApiList }) {
  const router = useRouter();
  const posters = (list.items ?? []).slice(0, 4);
  const { visible: showSend, reveal: revealSend, dismiss: dismissSend } = useSuggestReveal();
  const [suggestOpen, setSuggestOpen] = useState(false);

  return (
    <Pressable
      style={styles.card}
      onPress={() => list.user && router.push(`/showcase/${list.user.username}/${list.slug}`)}
      onLongPress={revealSend}
      delayLongPress={350}
    >
      {showSend && (
        <Pressable style={[StyleSheet.absoluteFill, styles.sendOverlay]} onPress={dismissSend}>
          <Pressable
            style={styles.sendButton}
            hitSlop={12}
            onPress={() => {
              dismissSend();
              setSuggestOpen(true);
            }}
          >
            <Ionicons name="paper-plane" size={22} color={colors.paper} />
          </Pressable>
        </Pressable>
      )}
      <SuggestSheet visible={suggestOpen} onClose={() => setSuggestOpen(false)} suggestable={{ type: "showcase", listId: list.id, title: list.name }} />
      <View style={styles.strip}>
        {posters.length === 0 ? (
          <View style={styles.emptyStrip}>
            <Ionicons name="film-outline" size={22} color={colors.muted} />
          </View>
        ) : (
          posters.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.poster,
                index > 0 && { marginLeft: -22 },
                { transform: [{ rotate: `${(index - (posters.length - 1) / 2) * 6}deg` }], zIndex: posters.length - index },
              ]}
            >
              {item.film.poster_url ? (
                <Image source={{ uri: item.film.poster_url }} style={styles.posterImage} contentFit="cover" />
              ) : null}
            </View>
          ))
        )}
      </View>
      <View style={styles.body}>
        <Text numberOfLines={1} style={styles.name}>
          {list.name}
          {list.is_ranked ? " #" : ""}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{list.user?.name?.slice(0, 1).toUpperCase() ?? "?"}</Text>
          </View>
          <Text style={styles.metaText} numberOfLines={1}>
            {list.user?.name}
          </Text>
          <Text style={styles.count}>{list.items_count ?? 0}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, overflow: "hidden" },
  strip: { height: 130, alignItems: "center", justifyContent: "center", flexDirection: "row", backgroundColor: "#0c0c14" },
  emptyStrip: { opacity: 0.5 },
  poster: { width: 60, aspectRatio: 0.69, borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: colors.surface2, overflow: "hidden" },
  posterImage: { width: "100%", height: "100%" },
  body: { padding: 12, gap: 8 },
  name: { color: colors.paper, fontSize: 14, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  avatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.paperMuted, fontSize: 8, fontWeight: "700" },
  metaText: { color: colors.muted, fontSize: 10, flex: 1 },
  count: { color: colors.muted, fontSize: 10 },
  sendOverlay: { backgroundColor: "rgba(9,9,16,0.6)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  sendButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: colors.green },
});
