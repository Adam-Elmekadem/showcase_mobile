import React from "react";
import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

const ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  index: { active: "compass", inactive: "compass-outline" },
  community: { active: "people", inactive: "people-outline" },
  showcases: { active: "grid", inactive: "grid-outline" },
  watchlist: { active: "bookmark", inactive: "bookmark-outline" },
  challenges: { active: "trophy", inactive: "trophy-outline" },
};

function TabIcon({ routeName, focused, size }: { routeName: string; focused: boolean; size: number }) {
  const icons = ICONS[routeName];
  // All five tabs: a plain solid-green icon when active, no circular
  // background wrap.
  return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={focused ? colors.green : colors.paper} />;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        // Flush against the screen's own bottom edge — rounded only at the
        // top, like the bar is emerging from the bottom of the phone —
        // rather than floating with margins on every side.
        tabBarStyle: [styles.tabBar, { height: 64 + insets.bottom, paddingBottom: insets.bottom }],
        tabBarBackground: () => <View style={styles.tabBarSolid} />,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Explore",
          tabBarIcon: ({ focused, size }) => <TabIcon routeName="index" focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ focused, size }) => <TabIcon routeName="community" focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="showcases"
        options={{
          title: "Showcases",
          tabBarIcon: ({ focused, size }) => <TabIcon routeName="showcases" focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: "Watchlist",
          tabBarIcon: ({ focused, size }) => <TabIcon routeName="watchlist" focused={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: "Challenges",
          tabBarIcon: ({ focused, size }) => <TabIcon routeName="challenges" focused={focused} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 0,
    overflow: "hidden",
    elevation: 0,
  },
  tabBarSolid: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.inkSoft,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: colors.border,
  },
  tabBarItem: { paddingVertical: 10 },
});
