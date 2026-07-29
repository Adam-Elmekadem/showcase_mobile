import React, { useEffect, useState } from "react";
import { View, Text, Modal, Pressable, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiList } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export function AddToShowcaseSheet({
  visible,
  onClose,
  filmSlug,
  tmdbId,
}: {
  visible: boolean;
  onClose: () => void;
  filmSlug: string;
  tmdbId: number;
}) {
  const { language } = useLocale();
  const router = useRouter();
  const [showcases, setShowcases] = useState<ApiList[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setShowcases(null);
    api
      .getFilmMyShowcases(filmSlug)
      .then(({ data }) => setShowcases(data))
      .catch(() => setShowcases([]));
  }, [visible, filmSlug]);

  async function toggle(list: ApiList) {
    setBusyId(list.id);
    try {
      if (list.contains_film) {
        await api.removeListItem(list.id, tmdbId);
      } else {
        await api.addListItem(list.id, tmdbId);
      }
      setShowcases((current) => current?.map((item) => (item.id === list.id ? { ...item, contains_film: !item.contains_film } : item)) ?? null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{pick(language, "أضف إلى عرض", "Add to showcase")}</Text>

        {showcases === null ? (
          <ActivityIndicator color={colors.green} style={{ marginVertical: 20 }} />
        ) : showcases.length === 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={styles.empty}>{pick(language, "لا توجد لديك عروض بعد.", "You don't have any showcases yet.")}</Text>
            <Pressable
              style={styles.createButton}
              onPress={() => {
                onClose();
                router.push("/showcase/new");
              }}
            >
              <Text style={styles.createButtonText}>{pick(language, "أنشئ عرضًا", "Create a showcase")}</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={showcases}
            keyExtractor={(item) => String(item.id)}
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => toggle(item)} disabled={busyId === item.id}>
                <View style={[styles.checkbox, item.contains_film && styles.checkboxChecked]}>
                  {item.contains_film && <Ionicons name="checkmark" size={13} color={colors.paper} />}
                </View>
                <Text style={styles.rowText}>{item.name}</Text>
                {busyId === item.id && <ActivityIndicator size="small" color={colors.muted} />}
              </Pressable>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 36, gap: 16 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center" },
  title: { color: colors.paper, fontSize: 16, fontWeight: "700" },
  empty: { color: colors.muted, fontSize: 12 },
  createButton: { backgroundColor: colors.green, borderRadius: radius.sm, paddingVertical: 12, alignItems: "center" },
  createButtonText: { color: colors.paper, fontWeight: "700", fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: colors.green, borderColor: colors.green },
  rowText: { color: colors.paper, fontSize: 13, flex: 1 },
});
