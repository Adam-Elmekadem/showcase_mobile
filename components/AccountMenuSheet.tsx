import React, { useEffect, useState } from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useLocale, pick } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { colors, radius } from "@/lib/theme";

type SheetView = "menu" | "settings";

export function AccountMenuSheet({
  visible,
  onClose,
  onLogout,
}: {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { language, toggleLanguage } = useLocale();
  const { swipeDetailStyle, setSwipeDetailStyle } = usePreferences();
  const [view, setView] = useState<SheetView>("menu");

  useEffect(() => {
    if (!visible) setView("menu");
  }, [visible]);

  function goTo(path: "/profile" | "/find-friends") {
    onClose();
    router.push(path);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        {view === "menu" ? (
          <>
            {user && (
              <View style={styles.profileHeader}>
                <View style={styles.profileAvatar}>
                  {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.profileAvatarImage} contentFit="cover" />
                  ) : (
                    <Text style={styles.profileAvatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
                  )}
                </View>
                <View>
                  <Text style={styles.profileName}>{user.name}</Text>
                  <Text style={styles.profileUsername}>@{user.username}</Text>
                </View>
              </View>
            )}

            <View style={styles.list}>
              <MenuRow icon="person-outline" label={pick(language, "الملف الشخصي", "Profile")} onPress={() => goTo("/profile")} />
              <MenuRow icon="people-outline" label={pick(language, "ابحث عن أصدقاء", "Find friends")} onPress={() => goTo("/find-friends")} />
              <MenuRow icon="settings-outline" label={pick(language, "الإعدادات", "Settings")} onPress={() => setView("settings")} />
            </View>

            <Pressable style={styles.logoutButton} onPress={onLogout}>
              <Ionicons name="log-out-outline" size={16} color={colors.orange} />
              <Text style={styles.logoutText}>{pick(language, "تسجيل الخروج", "Sign out")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.headerRow}>
              <Pressable onPress={() => setView("menu")} hitSlop={8}>
                <Ionicons name={language === "ar" ? "chevron-forward" : "chevron-back"} size={20} color={colors.paper} />
              </Pressable>
              <Text style={styles.title}>{pick(language, "الإعدادات", "Settings")}</Text>
              <View style={{ width: 20 }} />
            </View>

            <View style={styles.list}>
              <Pressable style={styles.settingsRow} onPress={toggleLanguage}>
                <View style={styles.settingsRowLabel}>
                  <Ionicons name="language-outline" size={16} color={colors.paper} />
                  <Text style={styles.settingsRowText}>{pick(language, "اللغة", "Language")}</Text>
                </View>
                <View style={styles.langChip}>
                  <Text style={styles.langChipText}>{language === "ar" ? "العربية" : "English"}</Text>
                </View>
              </Pressable>

              <View style={styles.settingsRow}>
                <View style={styles.settingsRowLabel}>
                  <Ionicons name="albums-outline" size={16} color={colors.paper} />
                  <Text style={styles.settingsRowText}>{pick(language, "تفاصيل التمرير", "Swipe details")}</Text>
                </View>
                <View style={styles.styleToggle}>
                  <StyleOption
                    label={pick(language, "تمرير", "Scroll")}
                    active={swipeDetailStyle === "morph"}
                    onPress={() => setSwipeDetailStyle("morph")}
                  />
                  <StyleOption
                    label={pick(language, "قائمة", "Sheet")}
                    active={swipeDetailStyle === "sheet"}
                    onPress={() => setSwipeDetailStyle("sheet")}
                  />
                </View>
              </View>

              <View style={styles.settingsRow}>
                <View style={styles.settingsRowLabel}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.paper} />
                  <Text style={styles.settingsRowText}>{pick(language, "الإصدار", "Version")}</Text>
                </View>
                <Text style={styles.versionText}>{Constants.expoConfig?.version ?? "1.0.0"}</Text>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function StyleOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.styleOption, active && styles.styleOptionActive]} onPress={onPress}>
      <Text style={[styles.styleOptionText, active && styles.styleOptionTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MenuRow({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <Ionicons name={icon} size={18} color={colors.paper} />
      <Text style={styles.menuRowText}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20, paddingBottom: 36, gap: 16 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.paper, fontSize: 15, fontWeight: "700", textAlign: "center" },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 4 },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  profileAvatarImage: { width: "100%", height: "100%" },
  profileAvatarText: { color: colors.paperMuted, fontSize: 17, fontWeight: "600" },
  profileName: { color: colors.paper, fontSize: 14, fontWeight: "700" },
  profileUsername: { color: colors.muted, fontSize: 11, marginTop: 2 },
  list: { gap: 10 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 13 },
  menuRowText: { color: colors.paper, fontSize: 13, fontWeight: "600", flex: 1 },
  logoutButton: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.orange, borderRadius: radius.sm, paddingVertical: 13 },
  logoutText: { color: colors.orange, fontSize: 12, fontWeight: "600" },
  settingsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 13 },
  settingsRowLabel: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingsRowText: { color: colors.paper, fontSize: 13, fontWeight: "600" },
  langChip: { backgroundColor: colors.surface2, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5 },
  langChipText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  styleToggle: { flexDirection: "row", gap: 6 },
  styleOption: { backgroundColor: colors.surface2, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5 },
  styleOptionActive: { backgroundColor: colors.green },
  styleOptionText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  styleOptionTextActive: { color: colors.paper },
  versionText: { color: colors.muted, fontSize: 12 },
});
