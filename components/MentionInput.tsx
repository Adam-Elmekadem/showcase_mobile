import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, NativeSyntheticEvent, TextInputSelectionChangeEventData } from "react-native";
import { useRouter } from "expo-router";
import { api, MentionPerson, MentionRole, MentionUser } from "@/lib/api";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";

type Candidate = { type: "user" | "person"; id: string; name: string; sub: string; avatar: string | null };

const ROLE_LABELS: Record<MentionRole, { ar: string; en: string }> = {
  director: { ar: "مخرج", en: "Director" },
  writer: { ar: "كاتب", en: "Writer" },
  cinematographer: { ar: "مدير تصوير", en: "Cinematographer" },
  composer: { ar: "ملحن", en: "Composer" },
  actor: { ar: "ممثل", en: "Actor" },
};

function personSubLabel(person: MentionPerson, language: "ar" | "en"): string {
  if (person.role && ROLE_LABELS[person.role]) return pick(language, ROLE_LABELS[person.role].ar, ROLE_LABELS[person.role].en);
  return pick(language, "شخصية سينمائية", "Film person");
}

function candidatesFrom(users: MentionUser[], people: MentionPerson[], language: "ar" | "en"): Candidate[] {
  return [
    ...users.map((user) => ({ type: "user" as const, id: user.username, name: user.name, sub: `@${user.username}`, avatar: user.avatar_url })),
    ...people.map((person) => ({ type: "person" as const, id: person.slug, name: person.name, sub: personSubLabel(person, language), avatar: person.profile_url })),
  ];
}

function findActiveQuery(value: string, caret: number): { start: number; query: string } | null {
  const upToCaret = value.slice(0, caret);
  const match = upToCaret.match(/(?:^|[\s])@([^\s@]{0,30})$/);
  if (!match) return null;
  const start = caret - match[0].length + (match[0].startsWith("@") ? 0 : 1);
  return { start, query: match[1] };
}

const MENTION_PATTERN = /@\[([^\]]+)\]\((user|person):([a-zA-Z0-9_.-]+)\)/g;

export function renderMentionText(body: string, textStyle: object, linkStyle: object): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  MENTION_PATTERN.lastIndex = 0;
  while ((match = MENTION_PATTERN.exec(body)) !== null) {
    if (match.index > lastIndex) nodes.push(<Text key={`t-${key++}`} style={textStyle}>{body.slice(lastIndex, match.index)}</Text>);
    const [, name, type, id] = match;
    nodes.push(
      <MentionSpan key={`m-${key++}`} name={name} type={type as "user" | "person"} id={id} style={linkStyle} />
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) nodes.push(<Text key={`t-${key++}`} style={textStyle}>{body.slice(lastIndex)}</Text>);
  return nodes;
}

function MentionSpan({ name, type, id, style }: { name: string; type: "user" | "person"; id: string; style: object }) {
  const router = useRouter();
  return (
    <Text style={style} onPress={() => router.push(type === "user" ? `/user/${id}` : `/person/${id}`)}>
      @{name}
    </Text>
  );
}

export function MentionText({ body, style, linkStyle }: { body: string; style: object; linkStyle?: object }) {
  return <Text style={style}>{renderMentionText(body, style, linkStyle ?? { color: colors.green, fontWeight: "700" })}</Text>;
}

export function MentionTextInput({
  value,
  onChangeText,
  placeholder,
  multiline = true,
  style,
  filmId,
  autoFocus,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  style?: object;
  filmId?: number;
  autoFocus?: boolean;
}) {
  const { language } = useLocale();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [query, setQuery] = useState<{ start: number; query: string } | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const active = findActiveQuery(value, selection.start);
    setQuery(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, selection.start]);

  useEffect(() => {
    if (!query || query.query.length === 0) {
      setCandidates([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.searchMentions(query.query, filmId);
        setCandidates(candidatesFrom(data.users, data.people, language));
      } catch {
        setCandidates([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, filmId, language]);

  function handleSelectionChange(event: NativeSyntheticEvent<TextInputSelectionChangeEventData>) {
    setSelection(event.nativeEvent.selection);
  }

  function selectCandidate(candidate: Candidate) {
    if (!query) return;
    const token = `@[${candidate.name}](${candidate.type}:${candidate.id}) `;
    const nextValue = value.slice(0, query.start) + token + value.slice(selection.start);
    onChangeText(nextValue);
    const nextCaret = query.start + token.length;
    setSelection({ start: nextCaret, end: nextCaret });
    setQuery(null);
    setCandidates([]);
  }

  const showPopup = query !== null && (candidates.length > 0 || loading || query.query.length > 0);

  return (
    <View>
      {showPopup && (
        <View style={styles.popup}>
          {loading && candidates.length === 0 ? (
            <ActivityIndicator size="small" color={colors.muted} style={{ padding: 10 }} />
          ) : candidates.length === 0 ? (
            <Text style={styles.popupEmpty}>{pick(language, "لا توجد نتائج", "No matches")}</Text>
          ) : (
            candidates.map((candidate) => (
              <Pressable key={`${candidate.type}-${candidate.id}`} style={styles.popupItem} onPress={() => selectCandidate(candidate)}>
                <View style={styles.popupAvatar}>
                  <Text style={styles.popupAvatarText}>{candidate.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.popupName}>{candidate.name}</Text>
                  <Text style={styles.popupSub}>{candidate.sub}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      )}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onSelectionChange={handleSelectionChange}
        selection={selection}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={style}
        multiline={multiline}
        autoFocus={autoFocus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  popup: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface2,
    marginBottom: 6,
    maxHeight: 220,
    overflow: "hidden",
  },
  popupEmpty: { color: colors.muted, fontSize: 11, padding: 10 },
  popupItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  popupAvatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  popupAvatarText: { color: colors.paperMuted, fontSize: 11, fontWeight: "700" },
  popupName: { color: colors.paper, fontSize: 12, fontWeight: "600" },
  popupSub: { color: colors.muted, fontSize: 10 },
});
