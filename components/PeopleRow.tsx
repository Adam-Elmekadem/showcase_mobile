import React from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { colors } from "@/lib/theme";
import { ApiPerson } from "@/lib/api";

export function PeopleRow({ title, people }: { title: string; people: ApiPerson[] }) {
  const router = useRouter();
  if (!people || people.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        horizontal
        data={people}
        keyExtractor={(item, index) => `${item.slug}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/person/${item.slug}`)}>
            <View style={styles.avatar}>
              {item.profile_url ? (
                <Image source={{ uri: item.profile_url }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={styles.avatarFallback}>{item.name.slice(0, 1)}</Text>
              )}
            </View>
            <Text numberOfLines={1} style={styles.name}>
              {item.name}
            </Text>
            {item.character && (
              <Text numberOfLines={1} style={styles.role}>
                {item.character}
              </Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const CARD_WIDTH = 84;

const styles = StyleSheet.create({
  section: { gap: 10 },
  title: { color: colors.paperMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  row: { gap: 14 },
  card: { width: CARD_WIDTH, gap: 6 },
  avatar: { width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: CARD_WIDTH / 2, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  avatarFallback: { color: colors.muted, fontSize: 22, fontWeight: "600" },
  name: { color: colors.paper, fontSize: 11, fontWeight: "600", textAlign: "center" },
  role: { color: colors.muted, fontSize: 10, textAlign: "center" },
});
