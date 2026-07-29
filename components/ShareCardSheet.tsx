import React, { useEffect, useRef, useState } from "react";
import { View, Text, Modal, Pressable, ActivityIndicator, StyleSheet, ScrollView } from "react-native";
import Constants, { AppOwnership } from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import ViewShot from "react-native-view-shot";
import { ApiLog } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import { ShareCard, ShareCardVariant } from "@/components/ShareCard";

export function ShareCardSheet({ visible, onClose, log }: { visible: boolean; onClose: () => void; log: ApiLog | null }) {
  const { language } = useLocale();
  const viewShotRef = useRef<React.ComponentRef<typeof ViewShot>>(null);

  const hasQuote = Boolean(log?.quote);
  const hasReview = Boolean(log?.review);
  const [variant, setVariant] = useState<ShareCardVariant>(hasQuote ? "quote" : "review");
  const [busy, setBusy] = useState<"save" | "share" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // ShareCardSheet stays mounted persistently (only `visible`/`log` change), so the
  // useState initializer above only runs once. Reset the default variant + any stale
  // message whenever a different log is opened, so a quote-only log never gets stuck
  // showing the review-card layout (or vice versa).
  useEffect(() => {
    if (!log) return;
    setVariant(log.quote ? "quote" : "review");
    setMessage(null);
    setBusy(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log?.id]);

  if (!log) return null;

  async function capture(): Promise<string | null> {
    try {
      const uri = await viewShotRef.current?.capture?.();
      return uri ?? null;
    } catch {
      return null;
    }
  }

  async function handleSave() {
    setMessage(null);
    // expo-media-library needs its config plugin baked into a native build; Expo Go
    // (unlike a custom dev client) can't pick that up, so the native module never exists there.
    if (Constants.appOwnership === AppOwnership.Expo) {
      setMessage(
        pick(
          language,
          "الحفظ في الصور غير متاح في معاينة Expo Go. يتطلب هذا نسخة تطوير مخصّصة.",
          "Saving to Photos isn't available in the Expo Go preview — it needs a custom development build."
        )
      );
      return;
    }
    setBusy("save");
    try {
      const MediaLibrary = await import("expo-media-library");
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        setMessage(pick(language, "بحاجة إلى إذن الوصول للصور للحفظ.", "Photo library permission is needed to save."));
        return;
      }
      const uri = await capture();
      if (!uri) {
        setMessage(pick(language, "تعذّر إنشاء الصورة.", "Couldn't generate the image."));
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      setMessage(pick(language, "تم الحفظ في مكتبة الصور.", "Saved to your photo library."));
    } catch {
      setMessage(pick(language, "تعذّر الحفظ. حاول مجددًا.", "Couldn't save. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  async function handleShare() {
    setMessage(null);
    setBusy("share");
    try {
      const uri = await capture();
      if (!uri) {
        setMessage(pick(language, "تعذّر إنشاء الصورة.", "Couldn't generate the image."));
        return;
      }
      const Sharing = await import("expo-sharing");
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setMessage(pick(language, "المشاركة غير متاحة على هذا الجهاز.", "Sharing isn't available on this device."));
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: "image/png" });
    } catch {
      setMessage(pick(language, "تعذّرت المشاركة. حاول مجددًا.", "Couldn't share. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{pick(language, "شارك مراجعتك", "Share your review")}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.muted} />
          </Pressable>
        </View>

        {hasQuote && hasReview && (
          <View style={styles.toggle}>
            <Pressable style={[styles.toggleButton, variant === "quote" && styles.toggleButtonActive]} onPress={() => setVariant("quote")}>
              <Text style={[styles.toggleText, variant === "quote" && styles.toggleTextActive]}>{pick(language, "بطاقة الاقتباس", "Quote card")}</Text>
            </Pressable>
            <Pressable style={[styles.toggleButton, variant === "review" && styles.toggleButtonActive]} onPress={() => setVariant("review")}>
              <Text style={[styles.toggleText, variant === "review" && styles.toggleTextActive]}>{pick(language, "بطاقة المراجعة", "Review card")}</Text>
            </Pressable>
          </View>
        )}

        <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cardScrollContent}>
          <ShareCard ref={viewShotRef} log={log} variant={variant} />
        </ScrollView>

        {message && <Text style={styles.message}>{message}</Text>}

        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={handleSave} disabled={busy !== null}>
            {busy === "save" ? (
              <ActivityIndicator size="small" color={colors.paper} />
            ) : (
              <Ionicons name="download-outline" size={16} color={colors.paper} />
            )}
            <Text style={styles.actionButtonText}>{pick(language, "حفظ في الصور", "Save to Photos")}</Text>
          </Pressable>
          <Pressable style={[styles.actionButton, styles.actionButtonOutline]} onPress={handleShare} disabled={busy !== null}>
            {busy === "share" ? (
              <ActivityIndicator size="small" color={colors.paper} />
            ) : (
              <Ionicons name="share-outline" size={16} color={colors.paper} />
            )}
            <Text style={styles.actionButtonText}>{pick(language, "مشاركة", "Share")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 36, gap: 14, maxHeight: "88%" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.paper, fontSize: 16, fontWeight: "700" },
  toggle: { flexDirection: "row", gap: 8 },
  toggleButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingVertical: 9, alignItems: "center" },
  toggleButtonActive: { borderColor: colors.green, backgroundColor: "rgba(33,153,139,0.12)" },
  toggleText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  toggleTextActive: { color: colors.paper },
  cardScroll: { flexGrow: 0 },
  cardScrollContent: { alignItems: "center", paddingVertical: 8 },
  message: { color: colors.muted, fontSize: 11, textAlign: "center" },
  actions: { flexDirection: "row", gap: 10 },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
    borderRadius: radius.sm,
    paddingVertical: 13,
  },
  actionButtonOutline: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.border },
  actionButtonText: { color: colors.paper, fontWeight: "700", fontSize: 12 },
});
