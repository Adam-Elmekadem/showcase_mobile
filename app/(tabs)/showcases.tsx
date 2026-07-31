import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiList } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius, font } from "@/lib/theme";
import { ShowcaseCard } from "@/components/ShowcaseCard";
import { HeaderActions } from "@/components/HeaderActions";
import { AppLogo } from "@/components/AppLogo";

type Scope = "all" | "mine";

export default function ShowcasesScreen() {
  const { language } = useLocale();
  const { user } = useAuth();
  const router = useRouter();

  const [scope, setScope] = useState<Scope>("all");
  const [lists, setLists] = useState<ApiList[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (currentScope: Scope) => {
      setLoading(true);
      try {
        const { data } = await api.getLists(currentScope === "mine" ? user?.username : undefined, 40);
        setLists(data);
      } catch {
        setLists([]);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useFocusEffect(
    useCallback(() => {
      load(scope);
    }, [load, scope])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <AppLogo />
        <View style={styles.headerRow}>
          <Text style={styles.heading}>{pick(language, "العروض", "Showcases")}</Text>
          <View style={styles.headerActionsRow}>
            {user && (
              <Pressable style={styles.createButton} onPress={() => router.push("/showcase/new")}>
                <Ionicons name="add" size={18} color={colors.paper} />
              </Pressable>
            )}
            <HeaderActions />
          </View>
        </View>

        {user && (
          <View style={styles.tabs}>
            <Pressable style={[styles.tab, scope === "all" && styles.tabActive]} onPress={() => setScope("all")}>
              <Text style={[styles.tabText, scope === "all" && styles.tabTextActive]}>{pick(language, "الكل", "All")}</Text>
            </Pressable>
            <Pressable style={[styles.tab, scope === "mine" && styles.tabActive]} onPress={() => setScope("mine")}>
              <Text style={[styles.tabText, scope === "mine" && styles.tabTextActive]}>{pick(language, "عروضي", "Mine")}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.green} />
      ) : lists.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {scope === "mine"
              ? pick(language, "لم تنشئ أي عرض بعد.", "You haven't created a showcase yet.")
              : pick(language, "لا توجد عروض بعد.", "No showcases yet.")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          renderItem={({ item }) => <ShowcaseCard list={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14, gap: 14 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heading: { color: colors.paper, fontFamily: font.display, fontSize: 30, letterSpacing: 0.5 },
  headerActionsRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  createButton: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 7 },
  tabActive: { borderColor: colors.green, backgroundColor: "rgba(33,153,139,0.12)" },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  tabTextActive: { color: colors.paper },
  loader: { marginTop: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.muted, fontSize: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
});
