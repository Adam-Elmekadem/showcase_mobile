import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, ApiComment, CommentableType } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLocale, pick } from "@/lib/i18n";
import { colors, radius } from "@/lib/theme";
import { MentionTextInput, MentionText } from "@/components/MentionInput";

function timeAgo(iso: string, language: "ar" | "en") {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return pick(language, "الآن", "now");
  if (minutes < 60) return pick(language, `قبل ${minutes} د`, `${minutes}m ago`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return pick(language, `قبل ${hours} س`, `${hours}h ago`);
  const days = Math.floor(hours / 24);
  return pick(language, `قبل ${days} يوم`, `${days}d ago`);
}

function CommentRow({
  comment,
  onReply,
  onDelete,
  isReply = false,
}: {
  comment: ApiComment;
  onReply: (comment: ApiComment) => void;
  onDelete: (comment: ApiComment) => void;
  isReply?: boolean;
}) {
  const { language } = useLocale();
  const router = useRouter();

  return (
    <View style={[styles.row, isReply && styles.replyRow]}>
      <Pressable onPress={() => comment.user && router.push(`/user/${comment.user.username}`)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{comment.user?.name?.slice(0, 1).toUpperCase() ?? "?"}</Text>
        </View>
      </Pressable>
      <View style={styles.rowBody}>
        <Text style={styles.rowHeader}>
          <Text style={styles.rowName}>{comment.user?.name ?? "—"}</Text>
          <Text style={styles.rowTime}>  ·  {timeAgo(comment.created_at, language)}</Text>
        </Text>
        <MentionText body={comment.body} style={styles.rowText} />
        <View style={styles.rowActions}>
          {!isReply && (
            <Pressable onPress={() => onReply(comment)}>
              <Text style={styles.rowActionText}>{pick(language, "رد", "Reply")}</Text>
            </Pressable>
          )}
          {comment.is_own && (
            <Pressable onPress={() => onDelete(comment)}>
              <Text style={[styles.rowActionText, { color: colors.orange }]}>{pick(language, "حذف", "Delete")}</Text>
            </Pressable>
          )}
        </View>
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.replies}>
            {comment.replies.map((reply) => (
              <CommentRow key={reply.id} comment={reply} onReply={onReply} onDelete={onDelete} isReply />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export function CommentsSection({ type, id, filmId }: { type: CommentableType; id: number; filmId?: number }) {
  const { user } = useAuth();
  const { language } = useLocale();
  const [comments, setComments] = useState<ApiComment[] | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ApiComment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.getComments(type, id);
      setComments(data);
    } catch {
      setComments([]);
    }
  }, [type, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.createComment(type, id, body.trim(), replyTo?.id);
      setBody("");
      setReplyTo(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(comment: ApiComment) {
    setComments((current) => current?.filter((c) => c.id !== comment.id) ?? null);
    try {
      await api.deleteComment(comment.id);
    } catch {
      load();
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{pick(language, "التعليقات", "Comments")}</Text>

      {comments === null ? (
        <ActivityIndicator color={colors.green} style={{ marginVertical: 12 }} />
      ) : comments.length === 0 ? (
        <Text style={styles.empty}>{pick(language, "لا توجد تعليقات بعد.", "No comments yet.")}</Text>
      ) : (
        <View style={{ gap: 14 }}>
          {comments.map((comment) => (
            <CommentRow key={comment.id} comment={comment} onReply={setReplyTo} onDelete={handleDelete} />
          ))}
        </View>
      )}

      {user && (
        <View style={styles.composer}>
          {replyTo && (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>
                {pick(language, "الرد على", "Replying to")} {replyTo.user?.name}
              </Text>
              <Pressable onPress={() => setReplyTo(null)}>
                <Ionicons name="close" size={14} color={colors.muted} />
              </Pressable>
            </View>
          )}
          <View style={styles.composerRow}>
            <View style={{ flex: 1 }}>
              <MentionTextInput
                value={body}
                onChangeText={setBody}
                placeholder={pick(language, "أضف تعليقًا...", "Add a comment...")}
                style={styles.input}
                filmId={filmId}
              />
            </View>
            <Pressable style={styles.sendButton} onPress={submit} disabled={submitting || !body.trim()}>
              <Ionicons name="send" size={16} color={body.trim() ? colors.green : colors.muted} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  sectionTitle: { color: colors.paperMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  empty: { color: colors.muted, fontSize: 12 },
  row: { flexDirection: "row", gap: 10 },
  replyRow: { marginTop: 10 },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.paperMuted, fontSize: 11, fontWeight: "600" },
  rowBody: { flex: 1, gap: 3 },
  rowHeader: { fontSize: 11 },
  rowName: { color: colors.paper, fontWeight: "700" },
  rowTime: { color: colors.muted },
  rowText: { color: colors.paperMuted, fontSize: 13, lineHeight: 19 },
  rowActions: { flexDirection: "row", gap: 14, marginTop: 2 },
  rowActionText: { color: colors.muted, fontSize: 10, fontWeight: "600" },
  replies: { marginTop: 4, paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: colors.line },
  composer: { marginTop: 8, gap: 8 },
  replyBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  replyBannerText: { color: colors.muted, fontSize: 10 },
  composerRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    maxHeight: 100,
  },
  sendButton: { width: 38, height: 38, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
});
