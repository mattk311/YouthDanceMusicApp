import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/PrimaryButton";
import { useColors } from "@/hooks/useColors";
import { apiFetch, type UsageData, type SubscriptionPriceData } from "@/lib/api";

const FREE_DAILY_LIMIT = 5;

const BENEFITS = [
  {
    icon: "search" as const,
    title: "Unlimited song searches",
    freeTip: `${FREE_DAILY_LIMIT} searches per day on the free plan`,
    proTip: "No daily limits — search as many songs as you need",
  },
  {
    icon: "trending-up" as const,
    title: "Popular songs",
    freeTip: "See which songs other groups are using",
    proTip: "Browse trending verified tracks from youth groups",
  },
  {
    icon: "zap" as const,
    title: "AI-powered evaluations",
    freeTip: "Full song analysis with reasoning and concerns",
    proTip: "Priority AI evaluation with detailed feedback",
  },
  {
    icon: "heart" as const,
    title: "Support development",
    freeTip: "Help keep the app free for youth groups everywhere",
    proTip: "Your subscription directly funds ongoing improvements",
  },
];

export default function SubscriptionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const usageQuery = useQuery({
    queryKey: ["usage"],
    queryFn: () => apiFetch<UsageData>("/api/usage"),
  });

  const priceQuery = useQuery({
    queryKey: ["subscription-price"],
    queryFn: () => apiFetch<SubscriptionPriceData>("/api/subscription/price"),
    enabled: !usageQuery.data?.isSubscribed,
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ url: string }>("/api/subscription/checkout", { method: "POST" }),
    onSuccess: (data) => {
      if (data.url) Linking.openURL(data.url);
    },
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ url: string }>("/api/subscription/portal", { method: "POST" }),
    onSuccess: (data) => {
      if (data.url) Linking.openURL(data.url);
    },
  });

  const isPro = usageQuery.data?.isSubscribed ?? false;
  const usage = usageQuery.data;

  const formattedPrice = priceQuery.data
    ? `$${(priceQuery.data.unit_amount / 100).toFixed(2)}/month`
    : null;

  const accentColor = isPro ? colors.warning : colors.primary;
  const accentSurface = isPro ? colors.warningSurface : colors.muted;

  const mutationError =
    (checkoutMutation.error as Error)?.message ||
    (portalMutation.error as Error)?.message ||
    null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Pressable
        onPress={() => router.back()}
        style={[styles.closeBtn, { top: insets.top + 14 }]}
        hitSlop={14}
      >
        <Feather name="x" size={22} color={colors.mutedForeground} />
      </Pressable>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {usageQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
        ) : (
          <>
            {/* ── Hero ─────────────────────────────────────── */}
            <View style={styles.hero}>
              <View style={[styles.iconRing, { backgroundColor: accentSurface }]}>
                <Feather name="award" size={44} color={accentColor} />
              </View>

              <Text style={[styles.heroTitle, { color: colors.foreground }]}>
                {isPro ? "Pro Account Active" : "Upgrade to Pro"}
              </Text>

              {isPro ? (
                <View style={[styles.statusBadge, { backgroundColor: colors.successSurface }]}>
                  <Feather name="check-circle" size={13} color={colors.success} />
                  <Text style={[styles.statusBadgeText, { color: colors.success }]}>
                    Active Subscription
                  </Text>
                </View>
              ) : (
                <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
                  Remove daily limits and unlock everything
                </Text>
              )}
            </View>

            {/* ── Daily usage bar (free users only) ────────── */}
            {!isPro && usage ? (
              <View
                style={[
                  styles.usageCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <View style={styles.usageRow}>
                  <Text style={[styles.usageLabel, { color: colors.mutedForeground }]}>
                    Searches used today
                  </Text>
                  <Text
                    style={[
                      styles.usageRemaining,
                      {
                        color:
                          usage.remaining > 0 ? colors.success : colors.destructive,
                      },
                    ]}
                  >
                    {usage.remaining > 0
                      ? `${usage.remaining} left`
                      : "Limit reached"}
                  </Text>
                </View>
                <View style={styles.usageBarWrap}>
                  <View
                    style={[
                      styles.usageBarTrack,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <View
                      style={[
                        styles.usageBarFill,
                        {
                          backgroundColor:
                            usage.remaining > 0
                              ? colors.primary
                              : colors.destructive,
                          width: `${Math.min(
                            100,
                            (usage.count / FREE_DAILY_LIMIT) * 100,
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.usageCount, { color: colors.foreground }]}>
                    {usage.count} / {FREE_DAILY_LIMIT}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* ── Price (free users only) ───────────────────── */}
            {!isPro ? (
              <View style={styles.priceBlock}>
                {priceQuery.isLoading ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : formattedPrice ? (
                  <>
                    <Text style={[styles.price, { color: colors.foreground }]}>
                      {formattedPrice}
                    </Text>
                    <Text style={[styles.priceSub, { color: colors.mutedForeground }]}>
                      Cancel anytime · No commitment
                    </Text>
                  </>
                ) : null}
              </View>
            ) : null}

            {/* ── Benefits list ─────────────────────────────── */}
            <View
              style={[
                styles.benefitsCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.benefitsHeading, { color: colors.foreground }]}>
                {isPro ? "Your Pro benefits" : "What you'll get"}
              </Text>

              {BENEFITS.map((b, i) => (
                <View
                  key={b.icon}
                  style={[
                    styles.benefitRow,
                    i < BENEFITS.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.benefitIconWrap,
                      { backgroundColor: accentSurface },
                    ]}
                  >
                    <Feather name={b.icon} size={16} color={accentColor} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.benefitTitle, { color: colors.foreground }]}>
                      {b.title}
                    </Text>
                    <Text
                      style={[
                        styles.benefitDetail,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {isPro ? b.proTip : b.freeTip}
                    </Text>
                  </View>

                  <Feather
                    name="check"
                    size={16}
                    color={isPro ? colors.success : colors.mutedForeground}
                  />
                </View>
              ))}
            </View>

            {/* ── Error ─────────────────────────────────────── */}
            {mutationError ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: colors.destructiveSurface,
                    borderColor: colors.destructive,
                  },
                ]}
              >
                <Feather name="alert-circle" size={14} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  {mutationError}
                </Text>
              </View>
            ) : null}

            {/* ── CTA ───────────────────────────────────────── */}
            <View style={styles.actions}>
              {isPro ? (
                <PrimaryButton
                  label={portalMutation.isPending ? "Opening…" : "Manage Subscription"}
                  icon="settings"
                  onPress={() => portalMutation.mutate()}
                  loading={portalMutation.isPending}
                  fullWidth
                />
              ) : (
                <>
                  <PrimaryButton
                    label={checkoutMutation.isPending ? "Opening…" : "Upgrade to Pro"}
                    icon="arrow-right"
                    onPress={() => checkoutMutation.mutate()}
                    loading={checkoutMutation.isPending}
                    disabled={priceQuery.isLoading}
                    fullWidth
                  />
                  <Text style={[styles.legalNote, { color: colors.mutedForeground }]}>
                    Subscription renews monthly. Cancel anytime through your account settings.
                  </Text>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  closeBtn: { position: "absolute", right: 18, zIndex: 10 },
  scroll: { paddingHorizontal: 20, gap: 18 },

  hero: { alignItems: "center", gap: 10, paddingBottom: 4 },
  iconRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 24, textAlign: "center" },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },

  usageCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  usageRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  usageLabel: { fontFamily: "Inter_500Medium", fontSize: 13 },
  usageRemaining: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  usageBarWrap: { flexDirection: "row", alignItems: "center", gap: 10 },
  usageBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  usageBarFill: { height: 6, borderRadius: 3 },
  usageCount: { fontFamily: "Inter_600SemiBold", fontSize: 13, minWidth: 40, textAlign: "right" },

  priceBlock: { alignItems: "center", gap: 4, minHeight: 52 },
  price: { fontFamily: "Inter_700Bold", fontSize: 34 },
  priceSub: { fontFamily: "Inter_400Regular", fontSize: 13 },

  benefitsCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  benefitsHeading: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  benefitDetail: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, marginTop: 1 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  errorText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 13 },

  actions: { gap: 10 },
  legalNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
});
