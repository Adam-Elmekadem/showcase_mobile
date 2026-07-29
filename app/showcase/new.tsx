import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Switch } from "react-native";
import { useRouter } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export default function NewShowcaseScreen() {
  const { language } = useLocale();
  const { user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isRanked, setIsRanked] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.createList({
        name: name.trim(),
        description: description.trim() || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        is_ranked: isRanked,
        is_public: isPublic,
      });
      router.replace(`/showcase/${user?.username}/${data.slug}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : pick(language, "تعذّر الإنشاء.", "Couldn't create the showcase."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{pick(language, "عرض جديد", "New showcase")}</Text>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{pick(language, "الاسم", "Name")}</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={colors.muted} />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{pick(language, "الوصف (اختياري)", "Description (optional)")}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          style={styles.textArea}
          multiline
          numberOfLines={4}
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{pick(language, "الوسوم (مفصولة بفواصل)", "Tags (comma-separated)")}</Text>
        <TextInput
          value={tags}
          onChangeText={setTags}
          style={styles.input}
          placeholder={pick(language, "رعب, كلاسيكي, ٩٠", "horror, classics, 90s")}
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{pick(language, "عرض مرتّب (بترتيب)", "Ranked list")}</Text>
        <Switch value={isRanked} onValueChange={setIsRanked} trackColor={{ false: colors.border, true: colors.green }} thumbColor={colors.paper} />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{pick(language, "عام", "Public")}</Text>
        <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ false: colors.border, true: colors.green }} thumbColor={colors.paper} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.submit, (busy || !name.trim()) && { opacity: 0.6 }]} onPress={handleCreate} disabled={busy || !name.trim()}>
        <Text style={styles.submitText}>{busy ? pick(language, "جارٍ الإنشاء...", "Creating...") : pick(language, "إنشاء", "Create")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { padding: 20, paddingBottom: 48, gap: 18 },
  heading: { color: colors.paper, fontSize: 20, fontWeight: "700" },
  field: { gap: 8 },
  fieldLabel: { color: colors.paperMuted, fontSize: 11, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, color: colors.paper, paddingHorizontal: 12, paddingVertical: 12, fontSize: 13 },
  textArea: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, color: colors.paper, padding: 12, fontSize: 13, minHeight: 90, textAlignVertical: "top" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  toggleLabel: { color: colors.paperMuted, fontSize: 12 },
  error: { color: colors.orange, fontSize: 12 },
  submit: { backgroundColor: colors.green, borderRadius: radius.sm, paddingVertical: 14, alignItems: "center" },
  submitText: { color: colors.paper, fontWeight: "700", fontSize: 13 },
});
