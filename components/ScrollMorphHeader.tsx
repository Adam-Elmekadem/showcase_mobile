import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useAnimatedReaction,
  useSharedValue,
  interpolate,
  Extrapolation,
  runOnJS,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { colors, font } from "@/lib/theme";

// Drives the "card centered at rest, sliding up and shrinking into a
// squared header band as you scroll" effect. The pinned block (image, plus
// optional content above/below it) is NOT React Native's `stickyHeaderIndices`
// — combining that with an animated sticky header currently throws in
// react-native-reanimated v4 on the New Architecture (a confirmed, still-open
// library bug: software-mansion/react-native-reanimated#8284). Instead it's
// pinned via `position: absolute` with its own translateY/height/radius all
// driven by scroll position.
//
// Two performance-sensitive choices here, both hard-won:
// 1. Scroll position is tracked via useAnimatedScrollHandler (a UI-thread
//    worklet), not a plain onScroll — a plain handler bridges every single
//    scroll event through the JS thread, which is exactly what caused
//    visible stutter/dropped frames on this screen. The "at top" callback to
//    the parent still needs runOnJS, which briefly looked like the cause of
//    a "[Worklets] Cannot copy value of type FiberNode" crash — it wasn't;
//    that was actually a *different* worklet elsewhere referencing a JSX
//    element directly (see the plain-boolean comment below). Once that was
//    fixed, runOnJS here works fine, so it's back to the fast path.
// 2. The content below the pinned block does NOT sit behind an *animated*
//    spacer — resizing a ScrollView's own content height on every scroll
//    frame forces it to re-measure its content size continuously, which is
//    its own source of jank. Instead the spacer is a plain, fixed-height
//    View (sized for the pinned block's tallest/rest state), and the
//    scrollable content is shifted up via a `transform: translateY` (a
//    paint-only operation, no re-layout) by exactly the amount the pinned
//    block has shrunk by — same gap-free visual result, no relayout cost.
export function ScrollMorphHeader({
  image,
  title,
  fallbackText,
  children,
  onTopStateChange,
  containerWidth,
  containerHeight,
  initialHeight,
  collapsedHeight,
  horizontalMargin = 0,
  initialRadius = 28,
  collapsedRadius = 8,
  minContentHeight,
  topOverlay,
  centerAtRest = false,
  topInset = 0,
  renderAbove,
  aboveHeight = 0,
  collapseAboveOnScroll = false,
  renderBelow,
  belowHeight = 0,
  collapseBelowOnScroll = false,
  renderBelowCollapsed,
  collapsedBelowHeight,
  showOverlayTitle = true,
  crossfadeOverlayTitle = false,
  onImageTap,
  onImageDoubleTap,
  doubleTapBurstIcon = "heart",
  doubleTapBurstColor,
  topLeftBadge,
}: {
  image: string | null;
  title: string;
  fallbackText?: string;
  children: React.ReactNode;
  /** Called when the scroll position crosses in/out of "at top" — lets a
   * parent (e.g. a horizontal swipe pager) know when it's safe to re-enable
   * its own gesture. */
  onTopStateChange?: (atTop: boolean) => void;
  /** The screen/page size this header renders in — needed to compute the
   * card's left offset + width explicitly, and (when centerAtRest) its
   * vertical center position. */
  containerWidth: number;
  containerHeight?: number;
  initialHeight: number;
  collapsedHeight: number;
  horizontalMargin?: number;
  initialRadius?: number;
  collapsedRadius?: number;
  /** Ensures the scroll view always has enough content to actually be
   * draggable, even before any lazily-loaded content below has arrived —
   * otherwise there's nothing to scroll, so the scroll that would trigger
   * that lazy load can never start. */
  minContentHeight?: number;
  /** Floating controls (back button, etc.) rendered above everything, unaffected by scroll. */
  topOverlay?: React.ReactNode;
  /** Positions the whole pinned block vertically centered in the page at
   * rest, sliding up to the top as the user scrolls — used by the swipe
   * deck's preview card. */
  centerAtRest?: boolean;
  /** The safe-area top inset (status bar, notch) — treated as a mandatory
   * floor for the centered position so the block never renders above/under
   * it, with the remaining slack centered below that instead of all being
   * pushed to the bottom. */
  topInset?: number;
  /** Content rendered above the image, as part of the same pinned/sliding
   * block (e.g. title + genre chips + rating row). */
  renderAbove?: React.ReactNode;
  /** Estimated natural height of renderAbove — needed for the centering and
   * gap-free scroll math. */
  aboveHeight?: number;
  /** When true, renderAbove shrinks and fades out as the user scrolls (used
   * together with crossfadeOverlayTitle, so the plain-text title/chips/
   * rating above the poster hands off to the title overlaid on the now-
   * collapsed image, rather than both showing at once). */
  collapseAboveOnScroll?: boolean;
  /** Content rendered below the image, as part of the same pinned/sliding
   * block (e.g. the full log/watchlist action button, shown at rest). */
  renderBelow?: React.ReactNode;
  /** Estimated height of renderBelow — needed for the centering and
   * gap-free scroll math. */
  belowHeight?: number;
  /** When true, renderBelow shrinks and fades out entirely as the user
   * scrolls — without this (or renderBelowCollapsed), renderBelow would
   * stay pinned and visible forever, overlapping all subsequently-scrolled
   * content indefinitely. */
  collapseBelowOnScroll?: boolean;
  /** Compact content that crossfades in as renderBelow crossfades out while
   * scrolling (e.g. an icon-only menu), instead of just disappearing. */
  renderBelowCollapsed?: React.ReactNode;
  /** Height of renderBelowCollapsed once fully scrolled — defaults to 0
   * (collapseBelowOnScroll) or belowHeight (no visual collapse) when omitted. */
  collapsedBelowHeight?: number;
  /** Renders the default title overlay on the image's bottom edge. */
  showOverlayTitle?: boolean;
  /** When true, the overlay title starts invisible and fades in as the user
   * scrolls (paired with collapseAboveOnScroll's fade-out) instead of
   * always being fully visible. */
  crossfadeOverlayTitle?: boolean;
  /** Fires on a single tap of the image (e.g. open the film's full detail page). */
  onImageTap?: () => void;
  /** Fires on a double tap of the image (e.g. toggle watched), instead of onImageTap. */
  onImageDoubleTap?: () => void;
  /** Icon shown in the brief center-screen pulse on double-tap. */
  doubleTapBurstIcon?: React.ComponentProps<typeof Ionicons>["name"];
  /** Color of the double-tap burst icon — defaults to colors.paper. */
  doubleTapBurstColor?: string;
  /** Persistent status badge pinned to the image's top-left corner (e.g. a
   * watched/rewatch-count indicator) — unaffected by scroll, unlike
   * renderAbove/renderBelow. */
  topLeftBadge?: React.ReactNode;
}) {
  const scrollY = useSharedValue(0);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useAnimatedReaction(
    () => scrollY.value <= 4,
    (atTop, previouslyAtTop) => {
      if (atTop !== previouslyAtTop && onTopStateChange) {
        runOnJS(onTopStateChange)(atTop);
      }
    },
    [onTopStateChange]
  );

  function triggerTapBurst() {
    heartOpacity.value = 1;
    heartScale.value = 0.3;
    heartScale.value = withSpring(1.15, { damping: 9, stiffness: 160 });
    heartOpacity.value = withDelay(350, withTiming(0, { duration: 250 }));
  }

  // Single-vs-double-tap is resolved by the native gesture recognizer
  // (composed via Exclusive, with the double-tap gesture given first pick)
  // rather than a JS Date.now()/setTimeout race — the latter is exactly the
  // kind of thing that misfires under JS-thread contention (e.g. while a
  // fetch/mount is happening right as the second tap lands), which is a
  // real failure mode this screen has hit before.
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (!onImageDoubleTap) return;
      triggerTapBurst();
      runOnJS(onImageDoubleTap)();
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (onImageTap) runOnJS(onImageTap)();
    });

  const tapGesture = Gesture.Exclusive(doubleTapGesture, singleTapGesture);

  const collapseRange = Math.max(1, initialHeight - collapsedHeight);
  const effectiveCollapsedBelowHeight = collapsedBelowHeight ?? (collapseBelowOnScroll ? 0 : belowHeight);
  // Plain booleans, not the React elements themselves — referencing a JSX
  // node directly inside a useAnimatedStyle worklet (even just for a truthy
  // check) is what throws "[Worklets] Cannot copy value of type FiberNode",
  // since the worklet closure has to capture the actual element to do so.
  const shouldCollapseBelow = collapseBelowOnScroll || !!renderBelowCollapsed;
  const centerOffset =
    centerAtRest && containerHeight
      ? topInset + Math.max(0, (containerHeight - topInset - initialHeight - aboveHeight - belowHeight) / 2)
      : 0;
  // The pinned block's height/position at rest (scrollY=0) — used as a fixed
  // spacer size so the scroll content's own height never changes mid-scroll.
  const restBottomEdge = centerOffset + aboveHeight + initialHeight + belowHeight;

  const wrapStyle = useAnimatedStyle(() => {
    const margin = interpolate(scrollY.value, [0, collapseRange], [horizontalMargin, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, collapseRange], [centerOffset, 0], Extrapolation.CLAMP);
    return { left: margin, width: containerWidth - margin * 2, transform: [{ translateY }] };
  });

  const aboveStyle = useAnimatedStyle(() => {
    if (!collapseAboveOnScroll) return {};
    const height = interpolate(scrollY.value, [0, collapseRange], [aboveHeight, 0], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [0, collapseRange], [1, 0], Extrapolation.CLAMP);
    return { height, opacity };
  });

  const imageBoxStyle = useAnimatedStyle(() => {
    const height = interpolate(scrollY.value, [0, collapseRange], [initialHeight, collapsedHeight], Extrapolation.CLAMP);
    const borderRadius = interpolate(scrollY.value, [0, collapseRange], [initialRadius, collapsedRadius], Extrapolation.CLAMP);
    return { height, borderRadius };
  });

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, collapseRange], [0.1, 0.92], Extrapolation.CLAMP),
  }));

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  const overlayTitleStyle = useAnimatedStyle(() => ({
    opacity: crossfadeOverlayTitle ? interpolate(scrollY.value, [0, collapseRange], [0, 1], Extrapolation.CLAMP) : 1,
  }));

  const belowContainerStyle = useAnimatedStyle(() => {
    if (!shouldCollapseBelow) return { height: belowHeight };
    const height = interpolate(scrollY.value, [0, collapseRange], [belowHeight, effectiveCollapsedBelowHeight], Extrapolation.CLAMP);
    return { height, overflow: "hidden" };
  });

  const belowFullStyle = useAnimatedStyle(() => ({
    opacity: shouldCollapseBelow ? interpolate(scrollY.value, [0, collapseRange], [1, 0], Extrapolation.CLAMP) : 1,
  }));

  const belowCollapsedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, collapseRange], [0, 1], Extrapolation.CLAMP),
  }));

  const childrenShiftStyle = useAnimatedStyle(() => {
    const currentAbove = collapseAboveOnScroll
      ? interpolate(scrollY.value, [0, collapseRange], [aboveHeight, 0], Extrapolation.CLAMP)
      : aboveHeight;
    const currentBelow = shouldCollapseBelow
      ? interpolate(scrollY.value, [0, collapseRange], [belowHeight, effectiveCollapsedBelowHeight], Extrapolation.CLAMP)
      : belowHeight;
    const currentImage = interpolate(scrollY.value, [0, collapseRange], [initialHeight, collapsedHeight], Extrapolation.CLAMP);
    const currentTranslateY = interpolate(scrollY.value, [0, collapseRange], [centerOffset, 0], Extrapolation.CLAMP);
    const currentBottomEdge = currentTranslateY + currentAbove + currentImage + currentBelow;
    return { transform: [{ translateY: currentBottomEdge - restBottomEdge }] };
  });

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, minContentHeight ? { minHeight: minContentHeight } : null]}
      >
        <View style={{ height: restBottomEdge }} />
        <Animated.View style={childrenShiftStyle}>{children}</Animated.View>
      </Animated.ScrollView>

      <Animated.View pointerEvents="box-none" style={[styles.pinnedWrap, wrapStyle]}>
        {renderAbove && (
          <Animated.View style={[collapseAboveOnScroll ? styles.aboveClip : null, aboveStyle]} pointerEvents="box-none">
            {renderAbove}
          </Animated.View>
        )}

        <Animated.View style={[styles.imageBox, imageBoxStyle]}>
          <GestureDetector gesture={tapGesture}>
            <View style={StyleSheet.absoluteFill}>
              {image ? (
                <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.fallback]}>
                  <Text style={styles.fallbackText}>{fallbackText ?? title}</Text>
                </View>
              )}
            </View>
          </GestureDetector>
          <Animated.View pointerEvents="none" style={[styles.heartBurst, heartStyle]}>
            <Ionicons name={doubleTapBurstIcon} size={84} color={doubleTapBurstColor ?? colors.paper} />
          </Animated.View>
          {topLeftBadge && (
            <View pointerEvents="none" style={styles.topLeftBadgeWrap}>
              {topLeftBadge}
            </View>
          )}
          {showOverlayTitle && (
            <>
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />
              <Animated.View style={[styles.titleWrap, overlayTitleStyle]} pointerEvents="none">
                <Text style={styles.title} numberOfLines={2}>
                  {title}
                </Text>
              </Animated.View>
            </>
          )}
        </Animated.View>

        {renderBelow && (
          <Animated.View style={belowContainerStyle}>
            <Animated.View style={[StyleSheet.absoluteFill, belowFullStyle]}>{renderBelow}</Animated.View>
            {renderBelowCollapsed && (
              <Animated.View style={[StyleSheet.absoluteFill, belowCollapsedStyle]}>{renderBelowCollapsed}</Animated.View>
            )}
          </Animated.View>
        )}
      </Animated.View>

      {topOverlay}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  scrollContent: { paddingBottom: 48 },
  pinnedWrap: { position: "absolute", top: 0, backgroundColor: colors.ink },
  aboveClip: { overflow: "hidden" },
  imageBox: {
    overflow: "hidden",
    backgroundColor: colors.surface2,
  },
  fallback: { alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.surface2 },
  fallbackText: { color: colors.muted, fontSize: 16, textAlign: "center", fontFamily: font.display },
  scrim: { backgroundColor: colors.ink },
  heartBurst: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  topLeftBadgeWrap: { position: "absolute", top: 12, left: 12 },
  titleWrap: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 18 },
  title: { color: colors.paper, fontFamily: font.display, fontSize: 26, letterSpacing: 0.5 },
});
