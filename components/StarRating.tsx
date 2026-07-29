import React, { useState } from "react";
import { View, Text, Pressable, GestureResponderEvent, StyleSheet } from "react-native";
import { colors } from "@/lib/theme";

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 22,
}: {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  function valueFromEvent(event: GestureResponderEvent, star: number) {
    const isHalf = event.nativeEvent.locationX < size / 2;
    return isHalf ? star - 0.5 : star;
  }

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, display - (star - 1)));
        const content = (
          <View style={{ width: size, height: size }}>
            <Text style={[styles.star, { fontSize: size, color: colors.border, lineHeight: size }]}>★</Text>
            <View style={[styles.fillClip, { width: `${fill * 100}%` }]}>
              <Text style={[styles.star, { fontSize: size, color: colors.gold, lineHeight: size }]}>★</Text>
            </View>
          </View>
        );
        if (readOnly) {
          return <View key={star}>{content}</View>;
        }
        return (
          <Pressable
            key={star}
            onPress={(event) => {
              const next = valueFromEvent(event, star);
              onChange?.(next === value ? 0 : next);
            }}
          >
            {content}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 3 },
  star: { position: "absolute", top: 0, left: 0 },
  fillClip: { position: "absolute", top: 0, left: 0, height: "100%", overflow: "hidden" },
});
