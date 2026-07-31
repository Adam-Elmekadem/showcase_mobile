import React from "react";
import Svg, { Rect } from "react-native-svg";
import { colors } from "@/lib/theme";

// The two overlapping bars from the designed logo/app-icon artwork —
// kept as vector shapes (no font dependency) so it renders crisply at any
// size, unlike the wordmark text which needs an actual font file.
export function BrandMark({ size = 28 }: { size?: number }) {
  const width = size * (102 / 90);
  return (
    <Svg width={width} height={size} viewBox="0 0 102 90">
      <Rect x="0" y="50.41" width="67.6" height="28.79" fill={colors.green} />
      <Rect x="33.02" y="10.81" width="69.17" height="28.79" fill={colors.orange} transform="translate(-4.54 24.25) rotate(-19.69)" />
    </Svg>
  );
}
