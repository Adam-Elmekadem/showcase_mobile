import React, { useEffect, useState } from "react";
import { View, Text, Modal, Pressable, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiUser } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export type Suggestable = { type: "film"; tmdbId: number; title: string } | { type: "showcase"; listId: number; title: string };

export function SuggestSheet({ visible, onClose, suggestable }: { visible: boolean; onClose: () => void; suggestable: Suggestable | null }) {
  const { language } = useLocale();
  const [mutuals, setMutuals] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingTo, setSendingTo] = useState<number | null>(null);
  const [sentTo, setSentTo] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setMessage(null);
    setSentTo(new Set());
    setLoading(true);
    api
      .getMutuals()
      .then(({ data }) => setMutuals(data))
      .catch(() => setMutuals([]))
      .finally(() => setLoading(false));
  }, [visible]);

  if (!suggestable) return null;

  async function send(recipient: ApiUser) {
    if (!suggestable || sendingTo) return;
    setSendingTo(recipient.id);
    try {
      await api.sendSuggestion(recipient.username, suggestable.type === "film" ? { tmdbId: suggestable.tmdbId } : { listId: suggestable.listId });
      setSentTo((current) => new Set(current).add(recipient.id));
    } catch {
      setMessage(pick(language, "تعذّر الإرسال. حاول مجددًا.", "Couldn't send. Please try again."));
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{pick(language, "اقترح على صديق", "Suggest to a friend")}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {suggestable.title}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {message && <Text style={styles.message}>{message}</Text>}

        {loading ? (
          <ActivityIndicator color={colors.green} style={{ marginVertical: 24 }} />
        ) : mutuals.length === 0 ? (
          <Text style={styles.hint}>
            {pick(language, "لا يوجد أصدقاء متبادلون بعد.", "No mutual friends yet — suggestions only go to people who follow you back.")}
          </Text>
        ) : (
          <FlatList
            data={mutuals}
            keyExtractor={(item) => String(item.id)}
            style={{ maxHeight: 360 }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => {
              const sent = sentTo.has(item.id);
              return (
                <Pressable style={styles.row} onPress={() => send(item)} disabled={sent || sendingTo !== null}>
                  <View style={styles.avatar}>
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} contentFit="cover" />
                    ) : (
                      <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.username}>@{item.username}</Text>
                  </View>
                  {sendingTo === item.id ? (
                    <ActivityIndicator color={colors.green} size="small" />
                  ) : sent ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                  ) : (
                    <Ionicons name="paper-plane-outline" size={18} color={colors.paper} />
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
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 30, gap: 14, maxHeight: "80%" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { color: colors.paper, fontSize: 15, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  message: { color: colors.orange, fontSize: 11, textAlign: "center" },
  hint: { color: colors.muted, fontSize: 12, textAlign: "center", paddingVertical: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 11 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: colors.paperMuted, fontSize: 13, fontWeight: "600" },
  name: { color: colors.paper, fontSize: 13, fontWeight: "600" },
  username: { color: colors.muted, fontSize: 11, marginTop: 1 },
});
