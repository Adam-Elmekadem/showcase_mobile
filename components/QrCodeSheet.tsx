import React, { useRef, useState } from "react";
import { View, Text, Modal, Pressable, ActivityIndicator, StyleSheet, Alert } from "react-native";
import Constants, { AppOwnership } from "expo-constants";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import ViewShot from "react-native-view-shot";
import { colors, radius } from "@/lib/theme";
import { useLocale, pick } from "@/lib/i18n";
import { BrandMark } from "@/components/BrandMark";

export function QrCodeSheet({ visible, onClose, username }: { visible: boolean; onClose: () => void; username: string }) {
  const { language } = useLocale();
  const viewShotRef = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const profileUrl = Linking.createURL(`/user/${username}`);

  async function handleDownload() {
    setMessage(null);
    // Same limitation as ShareCardSheet's save flow: the media-library native
    // module only exists in a custom dev/production build, not Expo Go.
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
    setBusy(true);
    try {
      const MediaLibrary = await import("expo-media-library/legacy");
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (!permission.granted) {
        setMessage(pick(language, "بحاجة إلى إذن الوصول للصور للحفظ.", "Photo library permission is needed to save."));
        return;
      }
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) {
        setMessage(pick(language, "تعذّر إنشاء الصورة.", "Couldn't generate the image."));
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      setMessage(pick(language, "تم الحفظ في مكتبة الصور.", "Saved to your photo library."));
    } catch {
      setMessage(pick(language, "تعذّر الحفظ. حاول مجددًا.", "Couldn't save. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>{pick(language, "رمز QR الخاص بك", "Your QR code")}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.muted} />
          </Pressable>
        </View>

        <Text style={styles.subtitle}>
          {pick(language, "امسح هذا الرمز لفتح ملفك الشخصي مباشرة.", "Scan this code to open your profile instantly.")}
        </Text>

        <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }} style={styles.card}>
          <BrandMark size={22} />
          <View style={styles.qrWrap}>
            <QRCode value={profileUrl} size={200} color={colors.ink} backgroundColor={colors.paper} />
          </View>
          <Text style={styles.username}>@{username}</Text>
        </ViewShot>

        {message && <Text style={styles.message}>{message}</Text>}

        <Pressable style={styles.actionButton} onPress={handleDownload} disabled={busy}>
          {busy ? <ActivityIndicator size="small" color={colors.paper} /> : <Ionicons name="download-outline" size={16} color={colors.paper} />}
          <Text style={styles.actionButtonText}>{pick(language, "تنزيل الصورة", "Download image")}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 36, gap: 14 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: colors.paper, fontSize: 16, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: "center" },
  card: {
    alignSelf: "center",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 24,
    paddingHorizontal: 28,
  },
  qrWrap: { padding: 12, backgroundColor: colors.paper, borderRadius: radius.sm },
  username: { color: colors.paper, fontSize: 14, fontWeight: "700" },
  message: { color: colors.muted, fontSize: 11, textAlign: "center" },
  actionButton: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green,
    borderRadius: radius.sm,
    paddingVertical: 13,
  },
  actionButtonText: { color: colors.paper, fontWeight: "700", fontSize: 12 },
});
