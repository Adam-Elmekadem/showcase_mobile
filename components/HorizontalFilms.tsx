import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FlatList } from "react-native-gesture-handler";
import { colors, font } from "@/lib/theme";
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
        renderItem={({ item }) => <FilmCard film={item} width={CARD_WIDTH} siblings={films} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  title: { color: colors.paperMuted, fontFamily: font.display, fontSize: 15, letterSpacing: 1, textTransform: "uppercase" },
  row: { gap: 14 },
});
