import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SongResultCard } from "@/components/SongResultCard";
import {
  SongAutocompleteInput,
  type AutocompleteSuggestion,
} from "@/components/SongAutocompleteInput";
import { useColors } from "@/hooks/useColors";
import {
  apiFetch,
  ApiError,
  type DanceLookup,
  type SearchPublicResponse,
  type SubmitGuestRequestResponse,
} from "@/lib/api";

type Step = "code" | "song" | "done";

export default function RequestScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>("code");
  const [codeInput, setCodeInput] = useState("");
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [requesterName, setRequesterName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [artistName, setArtistName] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanRef = useRef(0);

  const danceQuery = useQuery<DanceLookup>({
    queryKey: ["/api/dances/code", activeCode],
    queryFn: () => apiFetch<DanceLookup>(`/api/dances/code/${activeCode}`),
    enabled: !!activeCode,
    retry: false,
  });

  const searchMutation = useMutation({
    mutationFn: async (vars: { title: string; artist: string }) => {
      const params = new URLSearchParams({ title: vars.title });
      if (vars.artist) params.set("artist", vars.artist);
      return apiFetch<SearchPublicResponse>(`/api/songs/search-public?${params.toString()}`);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!activeCode || !searchMutation.data?.song) throw new Error("Missing data");
      const song = searchMutation.data.song;
      return apiFetch<SubmitGuestRequestResponse>(
        `/api/dances/${activeCode}/requests-public`,
        {
          method: "POST",
          body: JSON.stringify({
            requesterName: requesterName.trim(),
            songTitle: song.title,
            artistName: song.artist,
            albumArt: song.albumArt ?? undefined,
            spotifyUrl: song.spotifyUrl ?? undefined,
          }),
        },
      );
    },
    onSuccess: () => {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStep("done");
    },
    onError: () => {
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    },
  });

  useEffect(() => {
    if (danceQuery.data && step === "code") {
      setStep("song");
    }
  }, [danceQuery.data, step]);

  const onSubmitCode = (raw?: string) => {
    const code = (raw ?? codeInput).trim().toUpperCase().slice(0, 8);
    if (!code) return;
    setCodeInput(code);
    setActiveCode(code);
  };

  const onScan = useCallback(
    ({ data }: { data: string }) => {
      const now = Date.now();
      if (now - lastScanRef.current < 1500) return;
      lastScanRef.current = now;
      // Extract a code from URLs like https://.../request?code=ABC123 (web QR format),
      // https://.../dance/ABC123 (deep-link path style), or a raw code.
      let code = data.trim();
      try {
        const url = new URL(data);
        // 1) Prefer ?code= query parameter (the web app's QR format).
        const qp = url.searchParams.get("code");
        if (qp && /^[A-Z0-9]{4,8}$/i.test(qp)) {
          code = qp;
        } else {
          // 2) Fall back to last path segment.
          const parts = url.pathname.split("/").filter(Boolean);
          const last = parts[parts.length - 1];
          if (last && /^[A-Z0-9]{4,8}$/i.test(last)) code = last;
        }
      } catch {
        // not a URL — use raw text
      }
      code = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
      if (!code) return;
      setScannerOpen(false);
      setCodeInput(code);
      onSubmitCode(code);
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const openScanner = async () => {
    if (Platform.OS === "web") {
      // expo-camera barcode scanning isn't reliable on web; ask user to type.
      return;
    }
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) return;
    }
    setScannerOpen(true);
  };

  const reset = () => {
    setStep("code");
    setActiveCode(null);
    setCodeInput("");
    setSongTitle("");
    setArtistName("");
    setRequesterName("");
    searchMutation.reset();
    submitMutation.reset();
    qc.removeQueries({ queryKey: ["/api/dances/code"] });
  };

  const backToSong = () => {
    setStep("song");
    submitMutation.reset();
    searchMutation.reset();
    setSongTitle("");
    setArtistName("");
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
        <View style={styles.headerRow}>
          <Feather name="send" size={22} color={colors.primary} />
          <Text style={[styles.h1, { color: colors.foreground }]}>Request a song</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Send a song to your dance DJ. Up to 3 requests per dance.
        </Text>

        <Stepper step={step} />

        {step === "code" ? (
          <CodeStep
            code={codeInput}
            onChangeCode={setCodeInput}
            onSubmit={() => onSubmitCode()}
            onScan={openScanner}
            error={danceQuery.error as Error | null}
            isLoading={danceQuery.isFetching}
          />
        ) : null}

        {step === "song" && danceQuery.data ? (
          <SongStep
            dance={danceQuery.data}
            requesterName={requesterName}
            setRequesterName={setRequesterName}
            songTitle={songTitle}
            setSongTitle={setSongTitle}
            artistName={artistName}
            setArtistName={setArtistName}
            search={searchMutation}
            submit={submitMutation}
            onChangeCode={reset}
          />
        ) : null}

        {step === "done" && danceQuery.data ? (
          <DoneStep dance={danceQuery.data} onReset={reset} onBack={backToSong} />
        ) : null}
      </KeyboardAwareScrollView>

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={[styles.scannerRoot, { backgroundColor: "#000" }]}>
          {permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={onScan}
            />
          ) : (
            <View style={styles.scannerCenter}>
              <Text style={styles.scannerInfo}>Camera permission is required to scan QR codes.</Text>
            </View>
          )}
          <View style={[styles.scannerOverlay, { paddingTop: insets.top + 12 }]}>
            <View style={styles.scannerHeader}>
              <Pressable
                onPress={() => setScannerOpen(false)}
                style={styles.scannerClose}
                hitSlop={12}
                testID="button-close-scanner"
              >
                <Feather name="x" size={20} color="#fff" />
              </Pressable>
              <Text style={styles.scannerTitle}>Scan dance QR</Text>
              <View style={{ width: 36 }} />
            </View>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerHint}>Align the QR code inside the frame</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Stepper({ step }: { step: Step }) {
  const colors = useColors();
  const items: { key: Step; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: "code", label: "Find dance", icon: "key" },
    { key: "song", label: "Pick song", icon: "music" },
    { key: "done", label: "Sent", icon: "check" },
  ];
  const activeIdx = items.findIndex((i) => i.key === step);
  return (
    <View style={[styles.stepper, { borderColor: colors.border }]}>
      {items.map((item, idx) => {
        const isActive = idx === activeIdx;
        const isDone = idx < activeIdx;
        const tint = isActive ? colors.primary : isDone ? colors.success : colors.mutedForeground;
        return (
          <React.Fragment key={item.key}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: isActive ? colors.primary : isDone ? colors.success : colors.muted,
                  },
                ]}
              >
                <Feather
                  name={isDone ? "check" : item.icon}
                  size={14}
                  color={isActive || isDone ? "#fff" : colors.mutedForeground}
                />
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  { color: tint, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium" },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
            {idx < items.length - 1 ? (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: idx < activeIdx ? colors.success : colors.border },
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function CodeStep({
  code,
  onChangeCode,
  onSubmit,
  onScan,
  error,
  isLoading,
}: {
  code: string;
  onChangeCode: (s: string) => void;
  onSubmit: () => void;
  onScan: () => void;
  error: Error | null;
  isLoading: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>Enter dance code</Text>
      <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>
        Get the 6-character code from your DJ, or scan the QR code displayed at the dance.
      </Text>
      <View style={[styles.codeRow]}>
        <TextInput
          testID="input-dance-code"
          value={code}
          onChangeText={(t) => onChangeCode(t.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
          placeholder="ABC123"
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.codeInput,
            {
              color: colors.foreground,
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
          maxLength={8}
        />
        {Platform.OS !== "web" ? (
          <Pressable
            onPress={onScan}
            style={({ pressed }) => [
              styles.scanBtn,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            testID="button-open-scanner"
          >
            <Feather name="camera" size={20} color={colors.foreground} />
          </Pressable>
        ) : null}
      </View>
      <PrimaryButton
        label="Continue"
        icon="arrow-right"
        onPress={onSubmit}
        loading={isLoading}
        disabled={code.length < 4}
        fullWidth
        testID="button-submit-code"
      />
      {error ? (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: colors.destructiveSurface, borderColor: colors.destructive },
          ]}
        >
          <Feather name="alert-circle" size={16} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]} numberOfLines={3}>
            {(error as ApiError)?.status === 404
              ? "We couldn't find a dance with that code. Double-check with your DJ."
              : error.message}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function SongStep({
  dance,
  requesterName,
  setRequesterName,
  songTitle,
  setSongTitle,
  artistName,
  setArtistName,
  search,
  submit,
  onChangeCode,
}: {
  dance: DanceLookup;
  requesterName: string;
  setRequesterName: (v: string) => void;
  songTitle: string;
  setSongTitle: (v: string) => void;
  artistName: string;
  setArtistName: (v: string) => void;
  search: ReturnType<typeof useMutation<SearchPublicResponse, Error, { title: string; artist: string }>>;
  submit: ReturnType<typeof useMutation<SubmitGuestRequestResponse, Error, void>>;
  onChangeCode: () => void;
}) {
  const colors = useColors();

  const dateLabel = useMemo(() => {
    try {
      const d = new Date(dance.date + "T00:00:00");
      return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dance.date;
    }
  }, [dance.date]);

  const onSearch = () => {
    if (!songTitle.trim()) return;
    search.mutate({ title: songTitle.trim(), artist: artistName.trim() });
  };

  const songFound = search.data?.found && search.data?.song;
  const evaluation = search.data?.evaluation ?? null;
  const isUnfit = (evaluation?.recommendation ?? "").toLowerCase() === "unfit";

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.danceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.danceHeader}>
          <View style={[styles.dancePill, { backgroundColor: colors.primary }]}>
            <Text style={[styles.dancePillText, { color: colors.primaryForeground }]}>
              {dance.code}
            </Text>
          </View>
          <Pressable onPress={onChangeCode} hitSlop={6}>
            <Text style={[styles.changeLink, { color: colors.primary }]}>Change</Text>
          </Pressable>
        </View>
        <Text style={[styles.danceName, { color: colors.foreground }]} numberOfLines={2}>
          {dance.name}
        </Text>
        <View style={styles.danceMetaRow}>
          <DanceMeta icon="calendar" text={dateLabel} />
          <DanceMeta icon="clock" text={`${dance.startTime} – ${dance.endTime}`} />
        </View>
        {dance.location ? <DanceMeta icon="map-pin" text={dance.location} /> : null}
        {!dance.isActive ? (
          <View style={[styles.warningBox, { backgroundColor: colors.warningSurface }]}>
            <Feather name="alert-triangle" size={14} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              This dance is no longer accepting requests.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>Your name</Text>
        <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>
          Lets your DJ know who requested the song.
        </Text>
        <LabeledInput
          icon="user"
          value={requesterName}
          onChangeText={setRequesterName}
          placeholder="Your name"
          autoCapitalize="words"
          maxLength={60}
          testID="input-requester-name"
        />

        <Text style={[styles.cardTitle, { color: colors.foreground, marginTop: 16 }]}>Find a song</Text>
        <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>
          We'll check if it's appropriate before sending.
        </Text>
        <SongAutocompleteInput
          type="track"
          icon="music"
          value={songTitle}
          onChangeText={setSongTitle}
          onSelect={(s: AutocompleteSuggestion) => {
            setSongTitle(s.name);
            if (s.artist) setArtistName(s.artist);
          }}
          placeholder="Song title"
          autoCapitalize="words"
          testID="input-request-song-title"
        />
        <View style={{ height: 10 }} />
        <SongAutocompleteInput
          type="artist"
          icon="user"
          value={artistName}
          onChangeText={setArtistName}
          placeholder="Artist (optional)"
          autoCapitalize="words"
          testID="input-request-artist-name"
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        <View style={{ height: 14 }} />
        <PrimaryButton
          label={search.isPending ? "Checking…" : "Check song"}
          icon="search"
          onPress={onSearch}
          loading={search.isPending}
          disabled={!songTitle.trim()}
          variant="outline"
          fullWidth
          testID="button-check-request-song"
        />
      </View>

      {search.isError ? (
        <View style={[styles.errorBox, { backgroundColor: colors.destructiveSurface, borderColor: colors.destructive }]}>
          <Feather name="alert-circle" size={16} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]} numberOfLines={3}>
            {(search.error as Error)?.message ?? "Couldn't search for that song."}
          </Text>
        </View>
      ) : null}

      {songFound ? (
        <View style={{ gap: 12 }}>
          <SongResultCard
            song={search.data!.song!}
            evaluation={evaluation}
            showOpenSpotify={false}
          />
          {isUnfit ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructiveSurface, borderColor: colors.destructive }]}>
              <Feather name="x-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                This song isn't a good fit for a youth dance, so we can't send it.
              </Text>
            </View>
          ) : null}
          <PrimaryButton
            label="Send request"
            icon="send"
            onPress={() => submit.mutate()}
            loading={submit.isPending}
            disabled={!requesterName.trim() || isUnfit || !dance.isActive}
            fullWidth
            size="lg"
            testID="button-send-request"
          />
          {submit.isError ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructiveSurface, borderColor: colors.destructive }]}>
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]} numberOfLines={3}>
                {(submit.error as Error)?.message ?? "Couldn't send your request."}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {search.data && !search.data.found ? (
        <EmptyState
          icon="music"
          title="Song not found"
          subtitle="Try a different title or include the artist name."
        />
      ) : null}
    </View>
  );
}

function DoneStep({ dance, onReset, onBack }: { dance: DanceLookup; onReset: () => void; onBack: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, alignItems: "center", padding: 24 }]}>
      <View style={[styles.successCircle, { backgroundColor: colors.successSurface }]}>
        <Feather name="check" size={36} color={colors.success} />
      </View>
      <Text style={[styles.successTitle, { color: colors.foreground }]}>Request sent!</Text>
      <Text style={[styles.successText, { color: colors.mutedForeground }]}>
        Your DJ has been notified. They'll review your song for {dance.name}.
      </Text>
      <View style={{ height: 16 }} />
      <PrimaryButton
        label="Request another song"
        icon="plus"
        onPress={onBack}
        variant="primary"
        fullWidth
        testID="button-request-another"
      />
      <View style={{ height: 8 }} />
      <PrimaryButton
        label="Use a different dance code"
        onPress={onReset}
        variant="ghost"
        fullWidth
      />
    </View>
  );
}

function DanceMeta({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  const colors = useColors();
  return (
    <View style={styles.danceMetaItem}>
      <Feather name={icon} size={13} color={colors.mutedForeground} />
      <Text style={[styles.danceMetaText, { color: colors.mutedForeground }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function LabeledInput({
  icon,
  testID,
  ...rest
}: React.ComponentProps<typeof TextInput> & { icon: keyof typeof Feather.glyphMap; testID?: string }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.inputWrap,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <Feather name={icon} size={16} color={colors.mutedForeground} />
      <TextInput
        {...rest}
        testID={testID}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  h1: { fontFamily: "Inter_700Bold", fontSize: 24 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 6,
  },
  stepItem: { alignItems: "center", gap: 4, flex: 0 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLabel: { fontSize: 11 },
  stepLine: { flex: 1, height: 2, borderRadius: 1 },

  card: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 8 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  cardHint: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 18 },

  codeRow: { flexDirection: "row", gap: 10, marginTop: 6, marginBottom: 10 },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    minHeight: 52,
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: 4,
    textAlign: "center",
  },
  scanBtn: {
    width: 52,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    marginTop: 8,
  },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15, paddingVertical: 0 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  errorText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 18 },

  danceCard: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 8 },
  danceHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  dancePill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  dancePillText: { fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 2 },
  changeLink: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  danceName: { fontFamily: "Inter_700Bold", fontSize: 18 },
  danceMetaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 2 },
  danceMetaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  danceMetaText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  warningText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 12 },

  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  successTitle: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 4 },
  successText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20, textAlign: "center" },

  scannerRoot: { flex: 1 },
  scannerCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  scannerInfo: { color: "#fff", textAlign: "center", fontFamily: "Inter_500Medium" },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  scannerHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  scannerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerTitle: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  scannerFrame: {
    width: 240,
    height: 240,
    borderColor: "#fff",
    borderWidth: 2,
    borderRadius: 16,
    marginTop: 60,
  },
  scannerHint: {
    color: "#fff",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
});
