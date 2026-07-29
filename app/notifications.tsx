import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiNotification, NotificationType } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors } from "@/lib/theme";

const ICONS: Record<NotificationType, React.ComponentProps<typeof Ionicons>["name"]> = {
  like: "heart",
  comment: "chatbubble",
  follow: "person-add",
  mention: "at",
};

function notificationCopy(language: "ar" | "en", notification: ApiNotification): string {
  const name = notification.actor?.name ?? "";
  if (notification.type === "like") {
    return pick(language, `أعجب ${name} بمراجعتك لـ ${notification.preview ?? ""}`, `${name} liked your review of ${notification.preview ?? ""}`);
  }
  if (notification.type === "follow") {
    return pick(language, `بدأ ${name} بمتابعتك`, `${name} started following you`);
  }
  if (notification.type === "mention") {
    return pick(language, `ذكرك ${name} في تعليق`, `${name} mentioned you in a comment`);
  }
  return pick(language, `علّق ${name}`, `${name} commented`);
}

export default function NotificationsScreen() {
  const { language } = useLocale();
  const router = useRouter();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.getNotifications();
      setNotifications(data);
      if (data.some((item) => !item.read_at)) {
        api.markAllNotificationsRead().catch(() => {});
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openNotification(notification: ApiNotification) {
    if (notification.type === "follow" && notification.actor) {
      router.push(`/user/${notification.actor.username}`);
      return;
    }
    if (notification.link) {
      router.push(notification.link as never);
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
      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{pick(language, "لا يوجد نشاط بعد.", "No activity yet.")}</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openNotification(item)}>
              <View style={styles.icon}>
                <Ionicons name={ICONS[item.type]} size={15} color={colors.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.text}>{notificationCopy(language, item)}</Text>
                {item.type === "comment" && item.preview && (
                  <Text style={styles.preview} numberOfLines={1}>
                    "{item.preview}"
                  </Text>
                )}
              </View>
              {!item.read_at && <View style={styles.dot} />}
            </Pressable>
          )}
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
  icon: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(33,153,139,0.12)", alignItems: "center", justifyContent: "center" },
  text: { color: colors.paper, fontSize: 12, lineHeight: 17 },
  preview: { color: colors.muted, fontSize: 10, fontStyle: "italic", marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.orange },
});
