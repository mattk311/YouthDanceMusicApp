import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { recommendationToKind, type StatusKind } from "./StatusBadge";

interface Song {
  title: string;
  artist: string;
  album?: string | null;
  albumArt?: string | null;
  spotifyUrl?: string | null;
  explicit?: boolean | null;
}

interface Evaluation {
  recommendation?: string | null;
  danceType?: string | null;
  danceability?: number | null;
}

interface Props {
  song: Song;
  evaluation?: Evaluation | null;
  showOpenSpotify?: boolean;
  onPress?: () => void;
  rightAction?: React.ReactNode;
  showBanner?: boolean;
}

interface BannerCopy {
  title: string;
  subtitle: string;
  icon: keyof typeof Feather.glyphMap;
}

const BANNER_COPY: Record<Exclude<StatusKind, "info" | "neutral">, BannerCopy> = {
  approved: {
    title: "Approved for Youth Dance",
    subtitle: "This song is safe to play.",
    icon: "check-circle",
  },
  caution: {
    title: "Review Recommended",
    subtitle: "Please review the details before playing.",
    icon: "alert-triangle",
  },
  unfit: {
    title: "Not Recommended",
    subtitle: "This song isn't a good fit for a youth dance.",
    icon: "x-circle",
  },
};

export function SongResultCard({
  song,
  evaluation,
  showOpenSpotify = true,
  onPress,
  rightAction,
  showBanner = true,
}: Props) {
  const colors = useColors();
  const kind = recommendationToKind(evaluation?.recommendation);

  const tone =
    kind === "approved"
      ? { fg: colors.success, surface: colors.successSurface, border: colors.success }
      : kind === "caution"
        ? { fg: colors.warning, surface: colors.warningSurface, border: colors.warning }
        : kind === "unfit"
          ? { fg: colors.destructive, surface: colors.destructiveSurface, border: colors.destructive }
          : { fg: colors.mutedForeground, surface: colors.muted, border: colors.cardBorder };

  const bannerCopy =
    kind === "approved" || kind === "caution" || kind === "unfit"
      ? BANNER_COPY[kind]
      : null;

  const showStatusBanner = showBanner && bannerCopy != null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: tone.border,
          opacity: pressed && onPress ? 0.85 : 1,
          overflow: "hidden",
        },
      ]}
      testID="card-result"
    >
      {showStatusBanner ? (
        <View
          testID="banner-status"
          style={[styles.banner, { backgroundColor: tone.surface, borderBottomColor: tone.border }]}
        >
          <View style={[styles.bannerIconWrap, { backgroundColor: tone.surface }]}>
            <Feather name={bannerCopy.icon} size={20} color={tone.fg} />
          </View>
          <View style={styles.bannerText}>
            <Text
              testID="text-result-title"
              style={[styles.bannerTitle, { color: tone.fg }]}
              numberOfLines={1}
            >
              {bannerCopy.title}
            </Text>
            <Text
              style={[styles.bannerSubtitle, { color: colors.mutedForeground }]}
              numberOfLines={2}
            >
              {bannerCopy.subtitle}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.body}>
        <View style={styles.row}>
          {song.albumArt ? (
            <Image
              source={{ uri: song.albumArt }}
              style={[styles.art, { backgroundColor: colors.muted }]}
              contentFit="cover"
              transition={120}
            />
          ) : (
            <View style={[styles.art, styles.artFallback, { backgroundColor: colors.muted }]}>
              <Feather name="music" size={22} color={colors.mutedForeground} />
            </View>
          )}
          <View style={styles.info}>
            <Text
              numberOfLines={2}
              style={[styles.title, { color: colors.foreground }]}
              testID={`text-song-title-${song.title}`}
            >
              {song.title}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.artist, { color: colors.mutedForeground }]}
            >
              {song.artist}
            </Text>
            <View style={styles.metaRow}>
              {evaluation?.danceType ? (
                <View style={[styles.metaPill, { backgroundColor: colors.accent }]}>
                  <Feather name="activity" size={11} color={colors.accentForeground} />
                  <Text style={[styles.metaText, { color: colors.accentForeground }]} numberOfLines={1}>
                    {evaluation.danceType}
                  </Text>
                </View>
              ) : null}
              {evaluation?.danceability != null ? (
                <View style={[styles.metaPill, { backgroundColor: colors.accent }]}>
                  <Feather name="bar-chart-2" size={11} color={colors.accentForeground} />
                  <Text style={[styles.metaText, { color: colors.accentForeground }]}>
                    {evaluation.danceability}/10
                  </Text>
                </View>
              ) : null}
              {song.explicit ? (
                <View style={[styles.metaPill, { backgroundColor: colors.destructiveSurface }]}>
                  <Text style={[styles.metaText, { color: colors.destructive }]}>EXPLICIT</Text>
                </View>
              ) : null}
            </View>
          </View>
          {rightAction}
        </View>
        {showOpenSpotify && song.spotifyUrl ? (
          <Pressable
            onPress={() => song.spotifyUrl && Linking.openURL(song.spotifyUrl)}
            style={({ pressed }) => [
              styles.spotify,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            testID="button-open-spotify"
          >
            <Feather name="external-link" size={14} color={colors.foreground} />
            <Text style={[styles.spotifyText, { color: colors.foreground }]}>Open in Spotify</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  bannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: { flex: 1, gap: 2 },
  bannerTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  bannerSubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 16 },
  body: { padding: 14, gap: 12 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  art: { width: 64, height: 64, borderRadius: 8 },
  artFallback: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 4 },
  title: { fontFamily: "Inter_600SemiBold", fontSize: 15, lineHeight: 19 },
  artist: { fontFamily: "Inter_400Regular", fontSize: 13 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
    alignItems: "center",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  metaText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  spotify: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  spotifyText: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
