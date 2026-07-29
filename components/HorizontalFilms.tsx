import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { colors } from "@/lib/theme";
import { FilmCard, FilmCardData } from "@/components/FilmCard";

const CARD_WIDTH = 108;

export function HorizontalFilms({ title, films }: { title: string; films: FilmCardData[] }) {
  if (films.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        horizontal
        data={films}
        keyExtractor={(item, index) => `${item.tmdb_id}-${index}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item }) => <FilmCard film={item} width={CARD_WIDTH} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  title: { color: colors.paperMuted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  row: { gap: 14 },
});
