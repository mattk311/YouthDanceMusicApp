import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import { FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { SongCardSkeleton } from "@/components/Skeleton";
import { SongResultCard } from "@/components/SongResultCard";
import { useColors } from "@/hooks/useColors";
import { apiFetch, ApiError, type PopularResponse, type PopularSong } from "@/lib/api";

export default function PopularScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<PopularResponse>({
    queryKey: ["/api/songs/popular"],
    queryFn: () => apiFetch<PopularResponse>("/api/songs/popular"),
    retry: (failCount, err) => (err as ApiError)?.status === 403 ? false : failCount < 2,
  });

  const topPad = Platform.OS === "web" ? 67 + 16 : insets.top + 12;
  const tabBarSpace = Platform.OS === "web" ? 100 : 90;

  const isProRequired = isError && (error as ApiError)?.status === 403;

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: topPad, paddingBottom: tabBarSpace, gap: 10 }}
        >
          <View style={{ marginBottom: 10 }}>
            <View style={styles.titleRow}>
              <Feather name="trending-up" size={22} color={colors.primary} />
              <Text style={[styles.h1, { color: colors.foreground }]}>Popular songs</Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              The most-checked, youth-dance-friendly songs from across the community.
            </Text>
          </View>
          {[0, 1, 2, 3, 4].map((i) => (
            <SongCardSkeleton key={i} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (isProRequired) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.gateWrap, { paddingTop: topPad }]}>
          <View style={[styles.gateCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.gateIconWrap, { backgroundColor: colors.warningSurface }]}>
              <Feather name="trending-up" size={28} color={colors.warning} />
            </View>
            <Text style={[styles.gateTitle, { color: colors.foreground }]}>Pro feature</Text>
            <Text style={[styles.gateSub, { color: colors.mutedForeground }]}>
              Popular songs shows the community&apos;s most-vetted tracks. Upgrade to Pro to unlock it.
            </Text>
            <Pressable
              onPress={() => router.push("/subscription")}
              style={({ pressed }) => [
                styles.gateBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="award" size={16} color={colors.primaryForeground} />
              <Text style={[styles.gateBtnText, { color: colors.primaryForeground }]}>Upgrade to Pro</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const songs = data?.songs ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList<PopularSong>
        data={songs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: topPad, paddingBottom: tabBarSpace, gap: 10 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 10 }}>
            <View style={styles.titleRow}>
              <Feather name="trending-up" size={22} color={colors.primary} />
              <Text style={[styles.h1, { color: colors.foreground }]}>Popular songs</Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              The most-checked, youth-dance-friendly songs from across the community.
            </Text>
          </View>
        }
        ListEmptyComponent={
          isError ? (
            <EmptyState
              icon="alert-circle"
              title="Couldn't load popular songs"
              subtitle={(error as Error)?.message ?? "Please pull down to retry."}
              actionLabel="Retry"
              onAction={() => refetch()}
            />
          ) : (
            <EmptyState
              icon="music"
              title="No popular songs yet"
              subtitle="Once people start checking songs, the community favorites will show up here."
            />
          )
        }
        renderItem={({ item }) => (
          <SongResultCard
            song={{
              title: item.songName,
              artist: item.artistName,
              album: item.albumName,
              albumArt: item.albumArt,
              spotifyUrl: item.spotifyUrl,
              explicit: item.isExplicit,
            }}
            evaluation={{
              recommendation: item.aiRecommendation,
              danceType: item.aiDanceType,
              danceability: item.aiDanceability,
            }}
            showOpenSpotify
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        scrollEnabled={songs.length > 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  h1: { fontFamily: "Inter_700Bold", fontSize: 24 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  gateWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  gateCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  gateIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  gateTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  gateSub: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center" },
  gateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
    width: "100%",
  },
  gateBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
