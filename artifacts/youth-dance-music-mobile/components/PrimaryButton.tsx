import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  icon?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "default" | "lg";
  testID?: string;
}

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  fullWidth,
  size = "default",
  testID,
}: Props) {
  const colors = useColors();

  const palette = (() => {
    switch (variant) {
      case "secondary":
        return { bg: colors.secondary, fg: colors.secondaryForeground, border: "transparent" };
      case "outline":
        return { bg: "transparent", fg: colors.foreground, border: colors.border };
      case "ghost":
        return { bg: "transparent", fg: colors.foreground, border: "transparent" };
      case "destructive":
        return { bg: colors.destructive, fg: colors.destructiveForeground, border: "transparent" };
      case "primary":
      default:
        return { bg: colors.primary, fg: colors.primaryForeground, border: "transparent" };
    }
  })();

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        size === "lg" ? styles.lg : styles.default,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === "outline" ? 1 : 0,
          width: fullWidth ? "100%" : undefined,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Feather name={icon} size={size === "lg" ? 18 : 16} color={palette.fg} /> : null}
          <Text
            style={[
              styles.label,
              { color: palette.fg, fontSize: size === "lg" ? 16 : 14 },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  default: { paddingHorizontal: 16, paddingVertical: 11, minHeight: 44 },
  lg: { paddingHorizontal: 22, paddingVertical: 14, minHeight: 52 },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontFamily: "Inter_600SemiBold", letterSpacing: 0.1 },
});
