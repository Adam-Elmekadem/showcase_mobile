import React from "react";
import { View, Text, StyleSheet, FlatList as RNFlatList } from "react-native";
import { FlatList as GHFlatList } from "react-native-gesture-handler";
import { colors, font } from "@/lib/theme";
import { FilmCard, FilmCardData } from "@/components/FilmCard";

const CARD_WIDTH = 108;

export function HorizontalFilms({
  title,
  films,
  inBottomSheet = false,
}: {
  title: string;
  films: FilmCardData[];
  // @gorhom/bottom-sheet's pan gesture needs a gesture-handler-based
  // FlatList to correctly hand off horizontal drags instead of eating them
  // (see PeopleRow.tsx for the same reasoning). Everywhere else (plain
  // ScrollView contexts, e.g. the Explore screen's stacked rows) that same
  // swap backfires -- nested gesture-handler FlatLists there fight the
  // outer ScrollView's own gesture instead of cooperating with it, which is
  // what was blocking vertical scrolling. So this only opts in where it's
  // actually needed.
  inBottomSheet?: boolean;
}) {
  if (films.length === 0) return null;
  const List = inBottomSheet ? GHFlatList : RNFlatList;
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      <List
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
