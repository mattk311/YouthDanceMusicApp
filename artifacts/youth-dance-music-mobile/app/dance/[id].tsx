import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/EmptyState";
import { useColors } from "@/hooks/useColors";
import {
  API_BASE,
  apiFetch,
  type Dance,
  type DanceRequest,
} from "@/lib/api";

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function requestUrl(code: string): string {
  return API_BASE ? `${API_BASE}/request?code=${code}` : "";
}

interface RequestCardProps {
  request: DanceRequest;
  colors: ReturnType<typeof useColors>;
  onDecide: (status: "accepted" | "rejected") => void;
  isDeciding: boolean;
}

function RequestCard({ request, colors, onDecide, isDeciding }: RequestCardProps) {
  const isPending = request.status === "pending";

  return (
    <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }, !isPending && { opacity: 0.75 }]}>
      <View style={styles.requestTop}>
        {request.albumArt ? (
          <Image source={{ uri: request.albumArt }} style={styles.albumArt} contentFit="cover" />
        ) : (
          <View style={[styles.albumArt, styles.albumArtPlaceholder, { backgroundColor: colors.muted }]}>
            <Feather name="music" size={20} color={colors.mutedForeground} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.songTitle, { color: colors.foreground }]} numberOfLines={1}>
            {request.songTitle}
          </Text>
          <Text style={[styles.songArtist, { color: colors.mutedForeground }]} numberOfLines={1}>
            {request.artistName}
          </Text>
          <Text style={[styles.requester, { color: colors.mutedForeground }]} numberOfLines={1}>
            {isPending ? `Requested by ${request.requesterName}` : `by ${request.requesterName}`}
          </Text>
        </View>
        {!isPending && (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  request.status === "accepted" ? colors.successSurface : colors.muted,
              },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                {
                  color:
                    request.status === "accepted" ? colors.success : colors.mutedForeground,
                },
              ]}
            >
              {request.status === "accepted" ? "Playing" : "Skipped"}
            </Text>
          </View>
        )}
      </View>

      {isPending && (
        <View style={styles.decideRow}>
          <Pressable
            onPress={() => onDecide("accepted")}
            disabled={isDeciding}
            style={({ pressed }) => [
              styles.decideBtn,
              { backgroundColor: colors.primary, opacity: isDeciding ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="check" size={16} color={colors.primaryForeground} />
            <Text style={[styles.decideBtnText, { color: colors.primaryForeground }]}>Play</Text>
          </Pressable>
          <Pressable
            onPress={() => onDecide("rejected")}
            disabled={isDeciding}
            style={({ pressed }) => [
              styles.decideBtn,
              styles.decideBtnOutline,
              { borderColor: colors.border, opacity: isDeciding ? 0.5 : pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="x" size={16} color={colors.foreground} />
            <Text style={[styles.decideBtnText, { color: colors.foreground }]}>Skip</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function DanceDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    code?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    isActive?: string;
  }>();

  const danceId = params.id;

  // Prefer the fully-typed dance from the cached list; fall back to nav params.
  const cachedDances = queryClient.getQueryData<Dance[]>(["/api/dances"]);
  const cachedDance = cachedDances?.find((d) => d.id === danceId);
  const dance: Dance | undefined =
    cachedDance ??
    (params.name
      ? {
          id: danceId,
          name: params.name,
          code: params.code ?? "",
          date: params.date ?? "",
          startTime: params.startTime ?? "",
          endTime: params.endTime ?? "",
          location: params.location ?? "",
          isActive: params.isActive !== "false",
        }
      : undefined);

  const {
    data: requests,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<DanceRequest[]>({
    queryKey: ["/api/dances", danceId, "requests"],
    queryFn: () => apiFetch<DanceRequest[]>(`/api/dances/${danceId}/requests`),
    enabled: !!danceId,
    refetchInterval: 10000,
  });

  const decideMutation = useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: "accepted" | "rejected" }) =>
      apiFetch<DanceRequest>(`/api/requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dances", danceId, "requests"] });
    },
    onError: (err: Error) => {
      Alert.alert("Failed to update request", err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiFetch(`/api/dances/${danceId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dances"] });
      router.back();
    },
    onError: (err: Error) => {
      Alert.alert("Failed to delete dance", err.message);
    },
  });

  const [deleting, setDeleting] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const confirmDelete = () => {
    if (!dance) return;
    Alert.alert(
      "Delete dance",
      `Delete "${dance.name}"? This permanently removes the dance and all of its song requests. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setDeleting(true);
            deleteMutation.mutate();
          },
        },
      ],
    );
  };

  const shareDance = async () => {
    if (!dance) return;
    const url = requestUrl(dance.code);
    const message = url
      ? `Request a song for "${dance.name}"!\n\nDance code: ${dance.code}\n${url}`
      : `Request a song for "${dance.name}"!\n\nDance code: ${dance.code}`;
    try {
      await Share.share({ message, ...(url ? { url } : {}) });
    } catch {
      // user dismissed the share sheet
    }
  };

  const topPad = Platform.OS === "web" ? 24 : insets.top + 12;
  const bottomPad = insets.bottom + 24;

  const pending = (requests ?? []).filter((r) => r.status === "pending");
  const decided = (requests ?? []).filter((r) => r.status !== "pending");

  if (!dance) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Dance" }} />
        <View style={styles.centered}>
          <EmptyState
            icon="calendar"
            title="Dance not found"
            subtitle="This dance may have been deleted."
            actionLabel="Go back"
            onAction={() => router.back()}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: dance.name }} />
      <FlatList<DanceRequest>
        data={[...pending, ...decided]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: topPad, paddingBottom: bottomPad, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 4 }}>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.danceName, { color: colors.foreground }]}>{dance.name}</Text>
              <View style={styles.metaRow}>
                <Feather name="calendar" size={14} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{formatDate(dance.date)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Feather name="clock" size={14} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                  {dance.startTime} – {dance.endTime}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Feather name="map-pin" size={14} color={colors.mutedForeground} />
                <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {dance.location}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <View style={[styles.codePill, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.codeText, { color: colors.primaryForeground }]}>{dance.code}</Text>
                </View>
                <Pressable
                  onPress={() => setShowQR(true)}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Feather name="maximize" size={15} color={colors.foreground} />
                  <Text style={[styles.iconBtnText, { color: colors.foreground }]}>QR Code</Text>
                </Pressable>
                <Pressable
                  onPress={shareDance}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Feather name="share-2" size={15} color={colors.foreground} />
                  <Text style={[styles.iconBtnText, { color: colors.foreground }]}>Share</Text>
                </Pressable>
                <Pressable
                  onPress={confirmDelete}
                  disabled={deleting}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    { borderColor: colors.border, opacity: deleting ? 0.5 : pressed ? 0.7 : 1 },
                  ]}
                >
                  <Feather name="trash-2" size={15} color={colors.destructive} />
                  <Text style={[styles.iconBtnText, { color: colors.destructive }]}>Delete</Text>
                </Pressable>
              </View>
            </View>

            {pending.length > 0 && (
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Pending Requests ({pending.length})
              </Text>
            )}
          </View>
        }
        renderItem={({ item, index }) => {
          const showDecidedHeader = item.status !== "pending" && (index === 0 || pending.length === index);
          return (
            <>
              {showDecidedHeader && (
                <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 6 }]}>
                  Decided ({decided.length})
                </Text>
              )}
              <RequestCard
                request={item}
                colors={colors}
                isDeciding={decideMutation.isPending}
                onDecide={(status) => decideMutation.mutate({ requestId: item.id, status })}
              />
            </>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <EmptyState
              icon="music"
              title="No song requests yet"
              subtitle="Share the dance code with attendees so they can request songs."
              actionLabel="Share dance"
              onAction={shareDance}
            />
          )
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      />

      <Modal
        visible={showQR}
        animationType="fade"
        transparent
        onRequestClose={() => setShowQR(false)}
      >
        <Pressable style={styles.qrBackdrop} onPress={() => setShowQR(false)}>
          <Pressable
            style={[styles.qrCard, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.qrHeader}>
              <Text style={[styles.qrTitle, { color: colors.foreground }]} numberOfLines={1}>
                {dance.name}
              </Text>
              <Pressable onPress={() => setShowQR(false)} hitSlop={10}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={styles.qrImageWrap}>
              <QRCode
                value={requestUrl(dance.code) || dance.code}
                size={240}
                ecl="H"
                color="#000000"
                backgroundColor="#FFFFFF"
              />
            </View>

            <Text style={[styles.qrHint, { color: colors.mutedForeground }]}>Scan to request songs</Text>
            <View style={[styles.codePill, { backgroundColor: colors.primary, alignSelf: "center" }]}>
              <Text style={[styles.codeText, { color: colors.primaryForeground, fontSize: 16 }]}>
                {dance.code}
              </Text>
            </View>

            <Pressable
              onPress={shareDance}
              style={({ pressed }) => [
                styles.qrShareBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="share-2" size={16} color={colors.primaryForeground} />
              <Text style={[styles.qrShareText, { color: colors.primaryForeground }]}>Share dance link</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { paddingTop: 48, alignItems: "center", justifyContent: "center" },
  infoCard: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 8 },
  danceName: { fontFamily: "Inter_700Bold", fontSize: 19, marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" },
  codePill: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  codeText: { fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 1 },
  iconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  iconBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  requestCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 12 },
  requestTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  albumArt: { width: 48, height: 48, borderRadius: 8 },
  albumArtPlaceholder: { alignItems: "center", justifyContent: "center" },
  songTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  songArtist: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 1 },
  requester: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  decideRow: { flexDirection: "row", gap: 8 },
  decideBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10,
  },
  decideBtnOutline: { backgroundColor: "transparent", borderWidth: 1 },
  decideBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  qrBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  qrCard: { width: "100%", maxWidth: 360, borderRadius: 16, padding: 20, gap: 14, alignItems: "center" },
  qrHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" },
  qrTitle: { fontFamily: "Inter_700Bold", fontSize: 17, flex: 1, marginRight: 12 },
  qrImageWrap: { backgroundColor: "#FFFFFF", padding: 16, borderRadius: 12 },
  qrHint: { fontFamily: "Inter_400Regular", fontSize: 13 },
  qrShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
    width: "100%",
    marginTop: 2,
  },
  qrShareText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
});
