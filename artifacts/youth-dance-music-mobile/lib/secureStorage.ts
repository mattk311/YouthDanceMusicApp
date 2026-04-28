import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "ydm_auth_token";

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(KEY, token);
    }
    return;
  }
  await SecureStore.setItemAsync(KEY, token);
}

export async function loadToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(KEY);
    }
    return null;
  }
  return await SecureStore.getItemAsync(KEY);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(KEY);
    }
    return;
  }
  await SecureStore.deleteItemAsync(KEY);
}
