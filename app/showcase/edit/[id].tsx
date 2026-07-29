import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Switch } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

export default function EditShowcaseScreen() {
  const { id, name: initialName, description: initialDescription, tags: initialTags, is_ranked, is_public } = useLocalSearchParams<{
    id: string;
    name: string;
    description: string;
    tags: string;
    is_ranked: string;
    is_public: string;
  }>();
  const { language } = useLocale();
  const router = useRouter();

  const [name, setName] = useState(initialName ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [tags, setTags] = useState(initialTags ?? "");
  const [isRanked, setIsRanked] = useState(is_ranked === "1");
  const [isPublic, setIsPublic] = useState(is_public === "1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim() || !id) return;
    setBusy(true);
    setError(null);
    try {
      await api.updateList(Number(id), {
        name: name.trim(),
        description: description.trim() || undefined,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        is_ranked: isRanked,
        is_public: isPublic,
      });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : pick(language, "تعذّر الحفظ.", "Couldn't save the changes."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{pick(language, "تعديل العرض", "Edit showcase")}</Text>

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
        <TextInput value={tags} onChangeText={setTags} style={styles.input} placeholderTextColor={colors.muted} />
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

      <Pressable style={[styles.submit, (busy || !name.trim()) && { opacity: 0.6 }]} onPress={handleSave} disabled={busy || !name.trim()}>
        <Text style={styles.submitText}>{busy ? pick(language, "جارٍ الحفظ...", "Saving...") : pick(language, "حفظ التغييرات", "Save changes")}</Text>
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
