import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import { QUOTE_CATEGORIES, QuoteCategory } from "@/lib/quoteCategories";

export default function QuoteFilmScreen() {
  const { tmdbId } = useLocalSearchParams<{ tmdbId: string }>();
  const { language } = useLocale();
  const router = useRouter();

  const [quote, setQuote] = useState("");
  const [category, setCategory] = useState<QuoteCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!tmdbId) return;
    if (!quote.trim()) {
      setError(pick(language, "أضف نص الاقتباس أولاً.", "Add the quote text first."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createLog({
        tmdb_id: Number(tmdbId),
        quote: quote.trim(),
        quote_category: category ?? undefined,
      });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : pick(language, "تعذّر الحفظ.", "Couldn't save."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{pick(language, "شارك اقتباسًا", "Share a quote")}</Text>
        <Text style={styles.subheading}>
          {pick(
            language,
            "فقط الاقتباس — بدون تقييم أو مراجعة.",
            "Just the quote — no rating or review needed."
          )}
        </Text>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{pick(language, "الاقتباس أو المشهد", "The quote or scene")}</Text>
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
            numberOfLines={4}
            maxLength={500}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{pick(language, "الفئة (اختياري)", "Category (optional)")}</Text>
          <View style={styles.chipRow}>
            {QUOTE_CATEGORIES.map((cat) => {
              const active = category === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(active ? null : cat.key)}
                >
                  <Ionicons name={cat.icon as never} size={13} color={active ? colors.ink : colors.muted} />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{pick(language, cat.ar, cat.en)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={[styles.submit, busy && { opacity: 0.7 }]} onPress={handleSave} disabled={busy}>
          <Text style={styles.submitText}>{busy ? pick(language, "جارٍ الحفظ...", "Saving...") : pick(language, "نشر الاقتباس", "Post quote")}</Text>
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
  content: { padding: 20, paddingBottom: 48, gap: 20 },
  heading: { color: colors.paper, fontSize: 20, fontWeight: "700" },
  subheading: { color: colors.muted, fontSize: 12, marginTop: -12 },
  field: { gap: 8 },
  fieldLabel: { color: colors.paperMuted, fontSize: 11, fontWeight: "600" },
  quoteArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.paper,
    padding: 12,
    fontSize: 14,
    fontStyle: "italic",
    minHeight: 100,
    textAlignVertical: "top",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: colors.ink },
  error: { color: colors.orange, fontSize: 12 },
  submit: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingVertical: 14, alignItems: "center" },
  submitText: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  cancel: { alignItems: "center", paddingVertical: 10 },
  cancelText: { color: colors.muted, fontSize: 12 },
});
