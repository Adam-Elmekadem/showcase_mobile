import React, { useCallback, useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, useWindowDimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api, ApiFilm } from "@/lib/api";
import { colors } from "@/lib/theme";
import { ScrollMorphHeader } from "@/components/ScrollMorphHeader";
import { FilmDetailBody } from "@/components/FilmDetailBody";
import { FloatingBackButton } from "@/components/FloatingBackButton";

export default function FilmDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width, height } = useWindowDimensions();

  const [film, setFilm] = useState<ApiFilm | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const { data } = await api.getFilm(slug);
      setFilm(data);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !film) {
    return (
      <View style={styles.loaderScreen}>
        <ActivityIndicator color={colors.green} size="large" />
      </View>
    );
  }

  return (
    <ScrollMorphHeader
      image={film.backdrop_url ?? film.poster_url}
      title={film.title}
      containerWidth={width}
      initialHeight={height * 0.5}
      collapsedHeight={width * 0.42}
      horizontalMargin={0}
      initialRadius={0}
      collapsedRadius={0}
      topOverlay={<FloatingBackButton />}
    >
      <FilmDetailBody film={film} />
    </ScrollMorphHeader>
  );
}

const styles = StyleSheet.create({
  loaderScreen: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.ink },
});
