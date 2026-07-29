import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useLocale, pick } from "@/lib/i18n";
import { ApiError } from "@/lib/api";
import { colors, radius } from "@/lib/theme";

export default function LoginScreen() {
  const { language, toggleLanguage } = useLocale();
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const requestIdRef = useRef(0);

  function switchMode() {
    // Abandon any in-flight request so it can't resurrect the loading/error
    // state on the screen the user has already navigated away from.
    requestIdRef.current += 1;
    setBusy(false);
    setError(null);
    setMode((current) => (current === "login" ? "register" : "login"));
  }

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    const requestId = ++requestIdRef.current;
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ name, username, email, password, password_confirmation: passwordConfirmation });
      }
      if (requestId !== requestIdRef.current) return;
      router.replace("/");
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      if (err instanceof ApiError) {
        const firstFieldError = err.errors ? Object.values(err.errors)[0]?.[0] : undefined;
        setError(firstFieldError ?? err.message);
      } else {
        setError(pick(language, "حدث خطأ غير متوقع.", "Something went wrong."));
      }
    } finally {
      if (requestId === requestIdRef.current) setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Pressable style={styles.langToggle} onPress={toggleLanguage}>
          <Text style={styles.langToggleText}>{language === "ar" ? "EN" : "AR"}</Text>
        </Pressable>

        <Text style={styles.kicker}>SHOWCASE / {mode === "login" ? "SIGN IN" : "JOIN"}</Text>
        <Text style={styles.heading}>
          {mode === "login" ? pick(language, "مرحبًا بعودتك", "Welcome back") : pick(language, "أنشئ حسابك", "Create your account")}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "login"
            ? pick(language, "سجّل الدخول لمتابعة رحلتك السينمائية.", "Sign in to continue your film journey.")
            : pick(language, "سجّل الأفلام التي شاهدتها وابدأ في بناء ذائقتك.", "Log the films you watch and start building your taste.")}
        </Text>

        <View style={styles.form}>
          {mode === "register" && (
            <>
              <Field label={pick(language, "الاسم الكامل", "Full name")} value={name} onChangeText={setName} />
              <Field
                label={pick(language, "اسم المستخدم", "Username")}
                value={username}
                onChangeText={(v) => setUsername(v.toLowerCase())}
                autoCapitalize="none"
              />
            </>
          )}
          <Field
            label={pick(language, "البريد الإلكتروني", "Email")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field label={pick(language, "كلمة المرور", "Password")} value={password} onChangeText={setPassword} secureTextEntry />
          {mode === "register" && (
            <Field
              label={pick(language, "تأكيد كلمة المرور", "Confirm password")}
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              secureTextEntry
            />
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.submit, busy && styles.submitBusy]} onPress={handleSubmit} disabled={busy}>
            <Text style={styles.submitText}>
              {busy
                ? pick(language, "جارٍ التحميل...", "Loading...")
                : mode === "login"
                ? pick(language, "تسجيل الدخول", "Sign in")
                : pick(language, "إنشاء الحساب", "Create account")}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={switchMode}>
          <Text style={styles.switchText}>
            {mode === "login"
              ? pick(language, "ليس لديك حساب؟ أنشئ واحدًا", "Don't have an account? Create one")
              : pick(language, "لديك حساب بالفعل؟ سجّل الدخول", "Already have an account? Sign in")}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.ink },
  container: { flexGrow: 1, padding: 24, paddingTop: 90, backgroundColor: colors.ink },
  langToggle: {
    position: "absolute",
    top: 56,
    right: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langToggleText: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  kicker: { color: colors.green, fontSize: 10, letterSpacing: 1.5, fontWeight: "700", marginBottom: 10 },
  heading: { color: colors.paper, fontSize: 34, fontWeight: "600", letterSpacing: -0.5, marginBottom: 12 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: 28 },
  form: { gap: 16 },
  field: { gap: 6 },
  fieldLabel: { color: colors.paperMuted, fontSize: 11, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.paper,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  error: { color: colors.orange, fontSize: 12 },
  submit: {
    backgroundColor: colors.green,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  submitBusy: { opacity: 0.7 },
  submitText: { color: colors.paper, fontWeight: "700", fontSize: 13 },
  switchText: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 24 },
});
