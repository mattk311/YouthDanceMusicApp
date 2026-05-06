import { Feather } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { apiFetch } from "@/lib/api";

export interface AutocompleteSuggestion {
  id: string;
  name: string;
  artist?: string;
  type: "track" | "artist";
}

interface Props {
  type: "track" | "artist";
  value: string;
  onChangeText: (text: string) => void;
  onSelect?: (suggestion: AutocompleteSuggestion) => void;
  placeholder?: string;
  icon: keyof typeof Feather.glyphMap;
  testID?: string;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
  autoCapitalize?: TextInputProps["autoCapitalize"];
  disabled?: boolean;
}

export function SongAutocompleteInput({
  type,
  value,
  onChangeText,
  onSelect,
  placeholder,
  icon,
  testID,
  returnKeyType,
  onSubmitEditing,
  autoCapitalize = "words",
  disabled,
}: Props) {
  const colors = useColors();
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ query, type });
        const data = await apiFetch<{ suggestions: AutocompleteSuggestion[] }>(
          `/api/songs/autocomplete-public?${params}`,
        );
        if (data.suggestions?.length > 0) {
          setSuggestions(data.suggestions);
          setIsOpen(true);
        } else {
          setSuggestions([]);
          setIsOpen(false);
        }
      } catch {
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    },
    [type],
  );

  const handleChange = (text: string) => {
    onChangeText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 400);
  };

  const handleSelect = (suggestion: AutocompleteSuggestion) => {
    onChangeText(suggestion.name);
    onSelect?.(suggestion);
    setSuggestions([]);
    setIsOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const handleClear = () => {
    onChangeText("");
    setSuggestions([]);
    setIsOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  return (
    <View>
      <View
        style={[
          styles.inputWrap,
          { backgroundColor: colors.background, borderColor: colors.border },
        ]}
      >
        <Feather name={icon} size={16} color={colors.mutedForeground} />
        <TextInput
          testID={testID}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={!disabled}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        ) : value.length > 0 ? (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Feather name="x-circle" size={16} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {isOpen && suggestions.length > 0 && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {suggestions.map((s, i) => (
            <Pressable
              key={s.id}
              onPress={() => handleSelect(s)}
              style={({ pressed }) => [
                styles.suggestionItem,
                i < suggestions.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
                pressed && { backgroundColor: colors.muted },
              ]}
              testID={`${testID}-suggestion-${i}`}
            >
              <Text
                style={[styles.suggestionName, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {s.name}
              </Text>
              {s.artist ? (
                <Text
                  style={[styles.suggestionArtist, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {s.artist}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    paddingVertical: 0,
  },
  dropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionName: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  suggestionArtist: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 1,
  },
});
