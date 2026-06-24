import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { useColors } from "@/hooks/useColors";
import { apiFetch, ApiError, type CreateDanceBody, type Dance } from "@/lib/api";

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface CreateDanceModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function CreateDanceModal({ visible, onClose, onCreated }: CreateDanceModalProps) {
  const colors = useColors();
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayString());
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("21:00");
  const [location, setLocation] = useState("");

  const mutation = useMutation({
    mutationFn: (body: CreateDanceBody) =>
      apiFetch<Dance>("/api/dances", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      onCreated();
      setName("");
      setLocation("");
    },
  });

  const canSubmit = name.trim() && date.trim() && startTime.trim() && endTime.trim() && location.trim();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Dance</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <FieldGroup label="Event name" colors={colors}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Spring Youth Dance"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              returnKeyType="next"
            />
          </FieldGroup>

          <FieldGroup label="Date (YYYY-MM-DD)" colors={colors}>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="2026-07-04"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              keyboardType="numbers-and-punctuation"
              returnKeyType="next"
            />
          </FieldGroup>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FieldGroup label="Start time (HH:MM)" colors={colors}>
                <TextInput
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="18:00"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
                  keyboardType="numbers-and-punctuation"
                  returnKeyType="next"
                />
              </FieldGroup>
            </View>
            <View style={{ flex: 1 }}>
              <FieldGroup label="End time (HH:MM)" colors={colors}>
                <TextInput
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="21:00"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
                  keyboardType="numbers-and-punctuation"
                  returnKeyType="next"
                />
              </FieldGroup>
            </View>
          </View>

          <FieldGroup label="Location" colors={colors}>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Marriott Center, Provo UT"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              returnKeyType="done"
            />
          </FieldGroup>

          {mutation.isError ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {(mutation.error as Error)?.message ?? "Failed to create dance."}
            </Text>
          ) : null}

          <Pressable
            onPress={() => mutation.mutate({ name: name.trim(), date: date.trim(), startTime: startTime.trim(), endTime: endTime.trim(), location: location.trim() })}
            disabled={!canSubmit || mutation.isPending}
            style={({ pressed }) => [
              styles.createBtn,
              {
                backgroundColor: colors.primary,
                opacity: !canSubmit || mutation.isPending ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.createBtnText, { color: colors.primaryForeground }]}>Create Dance</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function FieldGroup({ label, children, colors }: { label: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      {children}
    </View>
  );
}

function DanceRow({ dance, colors }: { dance: Dance; colors: any }) {
  return (
    <View style={[styles.danceRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.danceName, { color: colors.foreground }]} numberOfLines={1}>
          {dance.name}
        </Text>
        <Text style={[styles.danceMeta, { color: colors.mutedForeground }]}>
          {formatDate(dance.date)} · {dance.startTime}–{dance.endTime}
        </Text>
        <Text style={[styles.danceMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {dance.location}
        </Text>
      </View>
      <View style={{ gap: 6, alignItems: "flex-end" }}>
        <View style={[styles.codePill, { backgroundColor: colors.primary }]}>
          <Text style={[styles.codeText, { color: colors.primaryForeground }]}>{dance.code}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: dance.isActive ? "#22c55e" : colors.muted }]} />
      </View>
    </View>
  );
}

export default function DancesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery<Dance[]>({
    queryKey: ["/api/dances"],
    queryFn: () => apiFetch<Dance[]>("/api/dances"),
    retry: (failCount, err) => (err as ApiError)?.status === 403 ? false : failCount < 2,
  });

  const topPad = Platform.OS === "web" ? 67 + 16 : insets.top + 12;
  const tabBarSpace = Platform.OS === "web" ? 100 : 90;
  const isProRequired = isError && (error as ApiError)?.status === 403;

  if (isLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </View>
    );
  }

  if (isProRequired) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.gateWrap, { paddingTop: topPad }]}>
          <View style={[styles.gateCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.gateIconWrap, { backgroundColor: colors.warningSurface }]}>
              <Feather name="calendar" size={28} color={colors.warning} />
            </View>
            <Text style={[styles.gateTitle, { color: colors.foreground }]}>Pro feature</Text>
            <Text style={[styles.gateSub, { color: colors.mutedForeground }]}>
              Create and manage dances, share the event code with attendees, and handle song requests live.
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

  const dances = data ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <FlatList<Dance>
        data={dances}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: topPad, paddingBottom: tabBarSpace, gap: 10 }}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View>
              <View style={styles.titleRow}>
                <Feather name="calendar" size={22} color={colors.primary} />
                <Text style={[styles.h1, { color: colors.foreground }]}>My Dances</Text>
              </View>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                Create events and manage song requests in real time.
              </Text>
            </View>
            <Pressable
              onPress={() => setShowCreate(true)}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Feather name="plus" size={18} color={colors.primaryForeground} />
              <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>New Dance</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar"
            title="No dances yet"
            subtitle={'Tap \u201cNew Dance\u201d to create your first event and start collecting song requests.'}
            actionLabel="Create Dance"
            onAction={() => setShowCreate(true)}
          />
        }
        renderItem={({ item }) => <DanceRow dance={item} colors={colors} />}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      />

      <CreateDanceModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          queryClient.invalidateQueries({ queryKey: ["/api/dances"] });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gateWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  gateCard: { width: "100%", borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 12 },
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
  listHeader: { marginBottom: 10, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  h1: { fontFamily: "Inter_700Bold", fontSize: 24 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  addBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  danceRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  danceName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  danceMeta: { fontFamily: "Inter_400Regular", fontSize: 13 },
  codePill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  codeText: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  createBtn: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: 4,
  },
  createBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" },
});
