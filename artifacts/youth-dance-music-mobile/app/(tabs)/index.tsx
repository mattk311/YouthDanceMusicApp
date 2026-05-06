import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Brand } from "@/components/Brand";
import { EmptyState } from "@/components/EmptyState";
import { SongResultSkeleton } from "@/components/Skeleton";
import { SongResultCard } from "@/components/SongResultCard";
import {
  SongAutocompleteInput,
  type AutocompleteSuggestion,
} from "@/components/SongAutocompleteInput";
import { useColors } from "@/hooks/useColors";
import { apiFetch, type SearchPublicResponse } from "@/lib/api";

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");

  const search = useMutation({
    mutationFn: async (vars: { title: string; artist: string }) => {
      const params = new URLSearchParams({ title: vars.title });
      if (vars.artist) params.set("artist", vars.artist);
      return apiFetch<SearchPublicResponse>(`/api/songs/search-public?${params.toString()}`);
    },
  });

  const onSearch = () => {
    const t = title.trim();
    if (!t) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    search.mutate({ title: t, artist: artist.trim() });
  };

  const onClear = () => {
    setTitle("");
    setArtist("");
    search.reset();
  };

  const topPad = Platform.OS === "web" ? 67 + 12 : insets.top + 12;
  const tabBarSpace = Platform.OS === "web" ? 100 : 90;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollView
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad, paddingBottom: tabBarSpace },
        ]}
      >
        <View style={styles.header}>
          <Brand size={44} />
        </View>

        <Text style={[styles.h1, { color: colors.foreground }]}>Verify a song</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Check whether a song is appropriate for a youth dance before you add it to the playlist.
        </Text>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.label, { color: colors.foreground }]}>Song title</Text>
          <SongAutocompleteInput
            type="track"
            icon="music"
            value={title}
            onChangeText={setTitle}
            onSelect={(s: AutocompleteSuggestion) => {
              setTitle(s.name);
              if (s.artist) setArtist(s.artist);
            }}
            placeholder="e.g. Levitating"
            returnKeyType="next"
            testID="input-song-title"
          />

          <Text style={[styles.label, { color: colors.foreground, marginTop: 14 }]}>
            Artist <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>(optional)</Text>
          </Text>
          <SongAutocompleteInput
            type="artist"
            icon="user"
            value={artist}
            onChangeText={setArtist}
            placeholder="e.g. Dua Lipa"
            returnKeyType="search"
            onSubmitEditing={onSearch}
            testID="input-artist-name"
          />

          <Pressable
            onPress={onSearch}
            disabled={!title.trim() || search.isPending}
            testID="button-search-song"
            style={({ pressed }) => [
              styles.searchBtn,
              {
                backgroundColor: colors.primary,
                opacity: !title.trim() || search.isPending ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Feather name="search" size={16} color={colors.primaryForeground} />
            <Text style={[styles.searchBtnText, { color: colors.primaryForeground }]}>
              {search.isPending ? "Checking…" : "Check song"}
            </Text>
          </Pressable>
        </View>

        {search.isError ? (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: colors.destructiveSurface, borderColor: colors.destructive },
            ]}
          >
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]} numberOfLines={3}>
              {(search.error as Error)?.message ?? "Something went wrong. Please try again."}
            </Text>
          </View>
        ) : null}

        {search.isPending ? (
          <View style={styles.resultBlock}>
            <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>Result</Text>
            <SongResultSkeleton />
          </View>
        ) : null}

        {!search.isPending && search.data && search.data.found && search.data.song ? (
          <View style={styles.resultBlock}>
            <View style={styles.resultHeader}>
              <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>Result</Text>
              <Pressable onPress={onClear} hitSlop={8}>
                <Text style={[styles.clearLink, { color: colors.primary }]}>New search</Text>
              </Pressable>
            </View>
            <SongResultCard
              song={search.data.song}
              evaluation={search.data.evaluation ?? null}
            />
            {!search.data.evaluation ? (
              <View
                style={[
                  styles.note,
                  { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
              >
                <Feather name="info" size={14} color={colors.mutedForeground} />
                <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
                  We couldn't get an evaluation for this song. Try again later.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {search.data && !search.data.found ? (
          <EmptyState
            icon="music"
            title="Song not found"
            subtitle="We couldn't find that song on Spotify. Double-check the title and artist."
          />
        ) : null}

        {!search.data && !search.isPending && !search.isError ? (
          <View
            style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <View style={[styles.tipIcon, { backgroundColor: colors.muted }]}>
              <Feather name="zap" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.tipTitle, { color: colors.foreground }]}>
                AI-powered evaluation
              </Text>
              <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                Each song is checked against the For the Strength of Youth standards by our AI
                reviewer. Results show a quick verdict, danceability, and dance type.
              </Text>
            </View>
          </View>
        ) : null}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  header: { alignItems: "flex-start", marginBottom: 4 },
  h1: { fontFamily: "Inter_700Bold", fontSize: 24, marginTop: 4 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  formCard: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 6, marginTop: 4 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 6 },
  searchBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
    borderRadius: 8,
  },
  searchBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  errorText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },
  resultBlock: { gap: 10, marginTop: 4 },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  clearLink: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  note: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  noteText: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 16 },
  tipCard: {
    flexDirection: "row",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  tipIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  tipTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  tipText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18, marginTop: 2 },
});
