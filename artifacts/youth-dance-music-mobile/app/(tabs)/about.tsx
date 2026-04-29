import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Brand } from "@/components/Brand";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, API_BASE } from "@/lib/api";

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const topPad = Platform.OS === "web" ? 67 + 16 : insets.top + 16;
  const tabBarSpace = Platform.OS === "web" ? 100 : 90;

  async function performDelete() {
    setDeleting(true);
    try {
      await apiFetch("/api/auth/account", { method: "DELETE" });
      // The backend has already revoked the bearer token; clear local state.
      await signOut();
    } catch (err) {
      setDeleting(false);
      const message = err instanceof Error ? err.message : "Please try again.";
      if (Platform.OS === "web") {
        window.alert(`Couldn't delete account. ${message}`);
      } else {
        Alert.alert("Couldn't delete account", message);
      }
    }
  }

  function confirmDelete() {
    if (deleting) return;
    if (Platform.OS === "web") {
      const ok = window.confirm(
        "Delete your account? This permanently removes your Youth Dance Music account, dances, song requests, and any subscription. This cannot be undone.",
      );
      if (ok) performDelete();
      return;
    }
    Alert.alert(
      "Delete your account?",
      "This permanently removes your Youth Dance Music account, dances, song requests, and any subscription. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete account", style: "destructive", onPress: performDelete },
      ],
    );
  }

  const openWeb = () => {
    if (!API_BASE) return;
    if (Platform.OS === "web") {
      window.open(API_BASE, "_blank");
    } else {
      WebBrowser.openBrowserAsync(API_BASE).catch(() => {});
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: topPad, paddingBottom: tabBarSpace, gap: 16 }}
      >
        <View style={styles.brandWrap}>
          <Brand size={56} variant="stack" />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>About this app</Text>
          <Text style={[styles.cardText, { color: colors.mutedForeground }]}>
            Youth Dance Music helps parents, leaders, and DJs quickly check whether a song is
            appropriate for a youth dance, and lets dancers send song requests to a DJ during an
            event using a simple code or QR scan.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>What you can do here</Text>
          <FeatureRow icon="search" title="Verify songs" subtitle="Check any track from Spotify with an AI-powered review." />
          <FeatureRow icon="trending-up" title="Browse popular songs" subtitle="See what others are vetting and add them to your dance." />
          <FeatureRow icon="send" title="Request a song" subtitle="Use a dance code or scan a QR to send a song to the DJ." />
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Your account</Text>
          {user ? (
            <View style={styles.accountRow} testID="row-account">
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.muted }]}>
                  <Feather name="user" size={20} color={colors.mutedForeground} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.accountName, { color: colors.foreground }]} numberOfLines={1} testID="text-account-name">
                  {user.name || user.email}
                </Text>
                {user.email && user.name ? (
                  <Text style={[styles.accountEmail, { color: colors.mutedForeground }]} numberOfLines={1} testID="text-account-email">
                    {user.email}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          <Pressable
            onPress={signOut}
            style={({ pressed }) => [
              styles.outlineRow,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            testID="button-sign-out"
          >
            <Feather name="log-out" size={16} color={colors.foreground} />
            <Text style={[styles.outlineRowText, { color: colors.foreground }]}>Sign out</Text>
          </Pressable>

          <Pressable
            onPress={openWeb}
            disabled={!API_BASE}
            style={({ pressed }) => [
              styles.outlineRow,
              { borderColor: colors.border, opacity: !API_BASE ? 0.5 : pressed ? 0.7 : 1 },
            ]}
            testID="button-open-web-app"
          >
            <Feather name="external-link" size={16} color={colors.foreground} />
            <Text style={[styles.outlineRowText, { color: colors.foreground }]}>
              Open the web app
            </Text>
          </Pressable>

          <Pressable
            onPress={confirmDelete}
            disabled={deleting}
            style={({ pressed }) => [
              styles.outlineRow,
              {
                borderColor: colors.destructive,
                opacity: deleting ? 0.5 : pressed ? 0.7 : 1,
              },
            ]}
            testID="button-delete-account"
          >
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[styles.outlineRowText, { color: colors.destructive }]}>
              {deleting ? "Deleting account..." : "Delete account"}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>v1.0.0 — Youth Dance Music</Text>
      </ScrollView>
    </View>
  );
}

function FeatureRow({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.featureTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brandWrap: { alignItems: "center", paddingVertical: 12 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  cardText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  featureRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginTop: 4 },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  featureText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  accountName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  accountEmail: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  outlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
  },
  outlineRowText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  footer: { textAlign: "center", fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 },
});
