import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 14, radius = 6, style }: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.muted, opacity },
        style,
      ]}
    />
  );
}

export function SongCardSkeleton() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.row}>
        <Skeleton width={64} height={64} radius={8} />
        <View style={styles.info}>
          <Skeleton width="80%" height={14} />
          <Skeleton width="55%" height={12} style={{ marginTop: 8 }} />
          <View style={styles.metaRow}>
            <Skeleton width={84} height={20} radius={999} />
            <Skeleton width={64} height={20} radius={999} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function SongResultSkeleton() {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 0, overflow: "hidden" },
      ]}
    >
      <View style={[styles.banner, { backgroundColor: colors.muted }]}>
        <Skeleton width={36} height={36} radius={18} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <View style={{ padding: 14 }}>
        <View style={styles.row}>
          <Skeleton width={64} height={64} radius={8} />
          <View style={styles.info}>
            <Skeleton width="80%" height={14} />
            <Skeleton width="55%" height={12} style={{ marginTop: 8 }} />
            <View style={styles.metaRow}>
              <Skeleton width={84} height={20} radius={999} />
              <Skeleton width={64} height={20} radius={999} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  info: { flex: 1, gap: 4 },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
