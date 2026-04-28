import { Feather } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Brand } from "@/components/Brand";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn, isSigningIn, error } = useAuth();
  const topPad = Platform.OS === "web" ? 24 : insets.top + 24;
  const bottomPad = Platform.OS === "web" ? 24 : insets.bottom + 24;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: topPad,
          paddingBottom: bottomPad,
          justifyContent: "space-between",
        }}
      >
        <View style={styles.brandWrap}>
          <Brand size={72} variant="stack" />
        </View>

        <View style={{ gap: 16 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Welcome</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Sign in to verify songs, browse popular tracks, and request music for your youth dance.
          </Text>

          <View style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <FeatureRow icon="search" text="Quickly verify songs with AI" />
            <FeatureRow icon="trending-up" text="See what others are vetting" />
            <FeatureRow icon="send" text="Request songs from the DJ" />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          {error ? (
            <Text style={[styles.error, { color: colors.destructive }]} testID="text-sign-in-error">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={signIn}
            disabled={isSigningIn}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: colors.primary,
                opacity: isSigningIn ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
            testID="button-sign-in-google"
          >
            {isSigningIn ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <Feather name="log-in" size={18} color={colors.primaryForeground} />
                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>

          <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
            By continuing you agree to keep your sign-in for safety and request limits.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  const colors = useColors();
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={14} color={colors.primary} />
      </View>
      <Text style={[styles.featureText, { color: colors.foreground }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brandWrap: { alignItems: "center", paddingVertical: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28, textAlign: "center" },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  featureCard: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 12, marginTop: 8 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 52,
    borderRadius: 8,
  },
  primaryButtonText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  footnote: {
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
  },
});
