import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

export type StatusKind = "approved" | "caution" | "unfit" | "info" | "neutral";

interface Props {
  kind: StatusKind;
  label?: string;
  compact?: boolean;
}

const ICONS: Record<StatusKind, keyof typeof Feather.glyphMap> = {
  approved: "check-circle",
  caution: "alert-triangle",
  unfit: "x-circle",
  info: "info",
  neutral: "music",
};

const LABELS: Record<StatusKind, string> = {
  approved: "Approved",
  caution: "Use Caution",
  unfit: "Not Recommended",
  info: "Info",
  neutral: "Pending",
};

export function StatusBadge({ kind, label, compact }: Props) {
  const colors = useColors();
  const tone = useTone(kind);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: tone.bg,
          paddingVertical: compact ? 4 : 6,
          paddingHorizontal: compact ? 8 : 10,
        },
      ]}
    >
      <Feather name={ICONS[kind]} size={compact ? 12 : 14} color={tone.fg} />
      <Text
        style={[
          styles.text,
          { color: tone.fg, fontSize: compact ? 11 : 12 },
        ]}
        numberOfLines={1}
      >
        {label ?? LABELS[kind]}
      </Text>
    </View>
  );
}

function useTone(kind: StatusKind) {
  const colors = useColors();
  switch (kind) {
    case "approved":
      return { bg: colors.successSurface, fg: colors.success };
    case "caution":
      return { bg: colors.warningSurface, fg: colors.warning };
    case "unfit":
      return { bg: colors.destructiveSurface, fg: colors.destructive };
    case "info":
      return { bg: colors.muted, fg: colors.primary };
    case "neutral":
    default:
      return { bg: colors.muted, fg: colors.mutedForeground };
  }
}

export function recommendationToKind(rec: string | null | undefined): StatusKind {
  switch ((rec ?? "").toLowerCase()) {
    case "approved":
      return "approved";
    case "caution":
    case "review":
    case "review-needed":
      return "caution";
    case "unfit":
    case "not-recommended":
    case "unsafe":
      return "unfit";
    default:
      return "neutral";
  }
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: { fontFamily: "Inter_600SemiBold" },
});
