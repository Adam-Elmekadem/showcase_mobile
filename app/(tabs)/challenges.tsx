import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useFocusEffect } from "expo-router";
import { api, Challenge, ChallengePeriod } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius, font } from "@/lib/theme";
import { HeaderActions } from "@/components/HeaderActions";
import { AppLogo } from "@/components/AppLogo";
import { SafeAreaView } from "react-native-safe-area-context";

const PERIODS: { key: ChallengePeriod; ar: string; en: string }[] = [
  { key: "daily", ar: "يومي", en: "Daily" },
  { key: "weekly", ar: "أسبوعي", en: "Weekly" },
  { key: "monthly", ar: "شهري", en: "Monthly" },
  { key: "yearly", ar: "سنوي", en: "Yearly" },
];

export default function ChallengesScreen() {
  const { language } = useLocale();
  const [period, setPeriod] = useState<ChallengePeriod>("weekly");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (currentPeriod: ChallengePeriod) => {
    setLoading(true);
    try {
      const { data } = await api.getChallenges(currentPeriod);
      setChallenges(data);
    } catch {
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(period);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <AppLogo />
        <View style={styles.titleRow}>
          <Text style={styles.heading}>{pick(language, "التحديات", "Challenges")}</Text>
          <HeaderActions />
        </View>

        <View style={styles.tabs}>
          {PERIODS.map((p) => (
            <Pressable key={p.key} style={[styles.tab, period === p.key && styles.tabActive]} onPress={() => setPeriod(p.key)}>
              <Text style={[styles.tabText, period === p.key && styles.tabTextActive]}>{pick(language, p.ar, p.en)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.green} />
      ) : challenges.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{pick(language, "لا توجد تحديات حاليًا.", "No challenges right now.")}</Text>
        </View>
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => <ChallengeCard challenge={item} language={language} />}
        />
      )}
    </SafeAreaView>
  );
}

function ChallengeCard({ challenge, language }: { challenge: Challenge; language: "ar" | "en" }) {
  const pct = challenge.target > 0 ? Math.min(1, challenge.progress / challenge.target) : 0;
  const complete = challenge.progress >= challenge.target;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>{challenge.title}</Text>
        {complete && (
          <View style={styles.completeBadge}>
            <Text style={styles.completeBadgeText}>{pick(language, "مكتمل", "Done")}</Text>
          </View>
        )}
      </View>
      {challenge.description && <Text style={styles.cardDescription}>{challenge.description}</Text>}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {challenge.progress}/{challenge.target}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heading: { color: colors.paper, fontFamily: font.display, fontSize: 30, letterSpacing: 0.5 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 7 },
  tabActive: { borderColor: colors.green, backgroundColor: "rgba(33,153,139,0.12)" },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  tabTextActive: { color: colors.paper },
  loader: { marginTop: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: colors.muted, fontSize: 12 },
  list: { padding: 16 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 16, gap: 8 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { color: colors.paper, fontFamily: font.display, fontSize: 17, letterSpacing: 0.3, flex: 1 },
  cardDescription: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: "hidden", marginTop: 4 },
  progressFill: { height: "100%", backgroundColor: colors.green, borderRadius: 3 },
  progressText: { color: colors.paperMuted, fontSize: 11 },
  completeBadge: { backgroundColor: colors.green, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  completeBadgeText: { color: colors.ink, fontSize: 10, fontWeight: "700" },
});
