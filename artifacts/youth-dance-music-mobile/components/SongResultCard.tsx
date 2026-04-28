import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { recommendationToKind, StatusBadge } from "./StatusBadge";

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
}

export function SongResultCard({
  song,
  evaluation,
  showOpenSpotify = true,
  onPress,
  rightAction,
}: Props) {
  const colors = useColors();
  const kind = recommendationToKind(evaluation?.recommendation);

  const tone =
    kind === "approved"
      ? { border: colors.success, surface: colors.successSurface }
      : kind === "caution"
        ? { border: colors.warning, surface: colors.warningSurface }
        : kind === "unfit"
          ? { border: colors.destructive, surface: colors.destructiveSurface }
          : { border: colors.cardBorder, surface: colors.card };

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
        },
      ]}
    >
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
            {evaluation?.recommendation ? (
              <StatusBadge kind={kind} compact />
            ) : null}
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
                  {evaluation.danceability}/100
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
    </Pressable>
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
