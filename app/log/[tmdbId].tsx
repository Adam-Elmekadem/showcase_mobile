import React, { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Switch, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import { StarRating } from "@/components/StarRating";

const CATEGORIES: { key: "story" | "direction" | "acting" | "cinematography" | "music"; ar: string; en: string }[] = [
  { key: "story", ar: "القصة", en: "Story" },
  { key: "direction", ar: "الإخراج", en: "Direction" },
  { key: "acting", ar: "التمثيل", en: "Acting" },
  { key: "cinematography", ar: "التصوير", en: "Cinematography" },
  { key: "music", ar: "الموسيقى", en: "Music" },
];

export default function LogFilmScreen() {
  const { tmdbId, logId } = useLocalSearchParams<{ tmdbId: string; logId?: string }>();
  const { language } = useLocale();
  const router = useRouter();

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [review, setReview] = useState("");
  const [quote, setQuote] = useState("");
  const [isRewatch, setIsRewatch] = useState(false);
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(!!logId);

  useEffect(() => {
    if (!logId) return;
    api
      .getLog(Number(logId))
      .then(({ data }) => {
        setRatings({
          story: data.ratings.story ?? 0,
          direction: data.ratings.direction ?? 0,
          acting: data.ratings.acting ?? 0,
          cinematography: data.ratings.cinematography ?? 0,
          music: data.ratings.music ?? 0,
        });
        setReview(data.review ?? "");
        setQuote(data.quote ?? "");
        setIsRewatch(data.is_rewatch);
        setContainsSpoilers(data.contains_spoilers);
      })
      .catch(() => {})
      .finally(() => setLoadingExisting(false));
  }, [logId]);

  async function handleSave() {
    if (!tmdbId) return;
    setBusy(true);
    setError(null);
    const payload = {
      tmdb_id: Number(tmdbId),
      is_rewatch: isRewatch,
      contains_spoilers: containsSpoilers,
      review: review.trim() || undefined,
      quote: quote.trim() || undefined,
      rating_story: ratings.story ?? null,
      rating_direction: ratings.direction ?? null,
      rating_acting: ratings.acting ?? null,
      rating_cinematography: ratings.cinematography ?? null,
      rating_music: ratings.music ?? null,
    };
    try {
      if (logId) {
        await api.updateLog(Number(logId), payload);
      } else {
        await api.createLog(payload);
      }
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : pick(language, "تعذّر الحفظ.", "Couldn't save."));
    } finally {
      setBusy(false);
    }
  }

  if (loadingExisting) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>
        {logId ? pick(language, "تعديل التسجيل", "Update your log") : pick(language, "سجّل مشاهدتك", "Log your watch")}
      </Text>

      <View style={styles.ratingsCard}>
        {CATEGORIES.map((category) => (
          <View key={category.key} style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>{pick(language, category.ar, category.en)}</Text>
            <StarRating
              value={ratings[category.key] ?? 0}
              onChange={(value) => setRatings((current) => ({ ...current, [category.key]: value }))}
              size={20}
            />
          </View>
        ))}
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{pick(language, "المراجعة (اختياري)", "Review (optional)")}</Text>
        <TextInput
          value={review}
          onChangeText={setReview}
          placeholder={pick(language, "ماذا كان رأيك؟", "What did you think?")}
          placeholderTextColor={colors.muted}
          style={styles.textArea}
          multiline
          numberOfLines={5}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{pick(language, "اقتباس أو مشهد لا يُنسى (اختياري)", "A memorable quote or scene (optional)")}</Text>
        <TextInput
          value={quote}
          onChangeText={setQuote}
          placeholder={pick(
            language,
            'مثال: "لن أعتذر أبدًا عن هذا القرار." — المشهد الأخير',
            'e.g. "I\'ll never apologize for this decision." — the final scene'
          )}
          placeholderTextColor={colors.muted}
          style={styles.quoteArea}
          multiline
          numberOfLines={2}
          maxLength={500}
        />
        <Text style={styles.fieldHint}>
          {pick(
            language,
            "أضف اقتباسًا لإنشاء بطاقة اقتباس قابلة للمشاركة لهذه المشاهدة.",
            "Add a quote to unlock a shareable quote card for this log."
          )}
        </Text>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{pick(language, "مشاهدة متكررة", "Rewatch")}</Text>
        <Switch
          value={isRewatch}
          onValueChange={setIsRewatch}
          trackColor={{ false: colors.border, true: colors.green }}
          thumbColor={colors.paper}
        />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{pick(language, "تحتوي على حرق أحداث", "Contains spoilers")}</Text>
        <Switch
          value={containsSpoilers}
          onValueChange={setContainsSpoilers}
          trackColor={{ false: colors.border, true: colors.orange }}
          thumbColor={colors.paper}
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.submit, busy && { opacity: 0.7 }]} onPress={handleSave} disabled={busy}>
        <Text style={styles.submitText}>{busy ? pick(language, "جارٍ الحفظ...", "Saving...") : pick(language, "حفظ", "Save")}</Text>
      </Pressable>
      <Pressable style={styles.cancel} onPress={() => router.back()}>
        <Text style={styles.cancelText}>{pick(language, "إلغاء", "Cancel")}</Text>
      </Pressable>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  loaderScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
  content: { padding: 20, paddingBottom: 48, gap: 20 },
  heading: { color: colors.paper, fontSize: 20, fontWeight: "700" },
  ratingsCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ratingLabel: { color: colors.paperMuted, fontSize: 12 },
  field: { gap: 8 },
  fieldLabel: { color: colors.paperMuted, fontSize: 11, fontWeight: "600" },
  fieldHint: { color: colors.muted, fontSize: 10, marginTop: -2 },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.paper,
    padding: 12,
    fontSize: 13,
    minHeight: 110,
    textAlignVertical: "top",
  },
  quoteArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.paper,
    padding: 12,
    fontSize: 13,
    fontStyle: "italic",
    minHeight: 64,
    textAlignVertical: "top",
  },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleLabel: { color: colors.paperMuted, fontSize: 12 },
  error: { color: colors.orange, fontSize: 12 },
  submit: { backgroundColor: colors.green, borderRadius: radius.sm, paddingVertical: 14, alignItems: "center" },
  submitText: { color: colors.paper, fontWeight: "700", fontSize: 13 },
  cancel: { alignItems: "center", paddingVertical: 10 },
  cancelText: { color: colors.muted, fontSize: 12 },
});
