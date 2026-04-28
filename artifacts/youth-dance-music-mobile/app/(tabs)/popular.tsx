import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { FlatList, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { SongCardSkeleton } from "@/components/Skeleton";
import { SongResultCard } from "@/components/SongResultCard";
import { useColors } from "@/hooks/useColors";
import { apiFetch, type PopularResponse, type PopularSong } from "@/lib/api";

export default function PopularScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<PopularResponse>({
    queryKey: ["/api/songs/popular-public"],
    queryFn: () => apiFetch<PopularResponse>("/api/songs/popular-public"),
  });

  const topPad = Platform.OS === "web" ? 67 + 16 : insets.top + 12;
  const tabBarSpace = Platform.OS === "web" ? 100 : 90;

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
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  h1: { fontFamily: "Inter_700Bold", fontSize: 24 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
});
