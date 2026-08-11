import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  size?: number;
  showWordmark?: boolean;
  variant?: "row" | "stack";
}

export function Brand({ size = 36, showWordmark = true, variant = "row" }: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        variant === "stack" ? styles.stack : styles.row,
      ]}
    >
      <Image
        source={require("@/assets/images/logo-mark.png")}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.18) }}
        resizeMode="cover"
      />
      {showWordmark && (
        <View style={variant === "stack" ? styles.wordmarkStack : styles.wordmarkRow}>
          <Text
            style={[
              styles.wordmark,
              {
                color: colors.foreground,
                fontSize: variant === "stack" ? 20 : Math.max(15, Math.round(size * 0.42)),
              },
            ]}
            numberOfLines={1}
          >
            Youth Dance Music
          </Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]} numberOfLines={1}>
            Safe Song Verification
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  row: { flexDirection: "row", gap: 12 },
  stack: { flexDirection: "column", gap: 12, alignItems: "center" },
  wordmarkRow: { justifyContent: "center" },
  wordmarkStack: { alignItems: "center" },
  wordmark: { fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  tagline: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 1 },
});
