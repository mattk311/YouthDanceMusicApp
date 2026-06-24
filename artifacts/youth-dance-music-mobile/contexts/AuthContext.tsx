import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";

import { API_BASE } from "@/lib/api";
import { setCurrentToken } from "@/lib/authToken";
import { clearToken, loadToken, saveToken } from "@/lib/secureStorage";

const MOBILE_REDIRECT_URI = "youthdancemusic://auth-callback";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isSigningIn: boolean;
  isSigningInWithApple: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseTokenFromUrl(url: string): string | null {
  try {
    const queryIndex = url.indexOf("?");
    if (queryIndex === -1) return null;
    const params = new URLSearchParams(url.slice(queryIndex + 1));
    return params.get("token");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningInWithApple, setIsSigningInWithApple] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const fetchUser = useCallback(async (t: string): Promise<AuthUser | null> => {
    if (!API_BASE) return null;
    const res = await fetch(`${API_BASE}/api/auth/user`, {
      headers: { Authorization: `Bearer ${t}`, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthUser;
  }, []);

  // Bootstrap from secure storage
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await loadToken();
        if (!stored) {
          if (!cancelled) setIsLoading(false);
          return;
        }
        const fetched = await fetchUser(stored);
        if (cancelled) return;
        if (fetched) {
          tokenRef.current = stored;
          setToken(stored);
          setUser(fetched);
        } else {
          await clearToken();
        }
      } catch (err) {
        console.warn("[Auth] bootstrap failed:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchUser]);

  const signIn = useCallback(async () => {
    if (!API_BASE) {
      setError("Server not configured");
      return;
    }
    setError(null);
    setIsSigningIn(true);
    try {
      const url = `${API_BASE}/auth/google?mode=mobile&redirect=${encodeURIComponent(MOBILE_REDIRECT_URI)}`;

      let returnedToken: string | null = null;

      if (Platform.OS === "web") {
        setError("Sign in is supported in the mobile app");
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(url, MOBILE_REDIRECT_URI);
      if (result.type !== "success" || !result.url) {
        if (result.type === "cancel" || result.type === "dismiss") {
          return;
        }
        throw new Error("Sign in did not complete");
      }
      returnedToken = parseTokenFromUrl(result.url);
      if (!returnedToken) {
        throw new Error("No token returned from sign in");
      }

      const fetched = await fetchUser(returnedToken);
      if (!fetched) {
        throw new Error("Could not load user profile");
      }

      await saveToken(returnedToken);
      tokenRef.current = returnedToken;
      setToken(returnedToken);
      setUser(fetched);
    } catch (err: any) {
      console.error("[Auth] signIn failed:", err);
      setError(err?.message || "Sign in failed");
    } finally {
      setIsSigningIn(false);
    }
  }, [fetchUser]);

  const signInWithApple = useCallback(async () => {
    if (!API_BASE) {
      setError("Server not configured");
      return;
    }
    setError(null);
    setIsSigningInWithApple(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("No identity token from Apple");
      }

      const res = await fetch(`${API_BASE}/api/auth/apple/mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          identityToken: credential.identityToken,
          appleUserId: credential.user,
          email: credential.email,
          firstName: credential.fullName?.givenName,
          lastName: credential.fullName?.familyName,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any)?.error || "Apple sign in failed");
      }

      const { token: returnedToken } = await res.json() as { token: string };
      const fetched = await fetchUser(returnedToken);
      if (!fetched) {
        throw new Error("Could not load user profile");
      }

      await saveToken(returnedToken);
      tokenRef.current = returnedToken;
      setToken(returnedToken);
      setUser(fetched);
    } catch (err: any) {
      if (err?.code === "ERR_REQUEST_CANCELED") return;
      console.error("[Auth] Apple signIn failed:", err);
      setError(err?.message || "Apple sign in failed");
    } finally {
      setIsSigningInWithApple(false);
    }
  }, [fetchUser]);

  const signOut = useCallback(async () => {
    const t = tokenRef.current;
    try {
      if (t && API_BASE) {
        await fetch(`${API_BASE}/api/auth/mobile-logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${t}` },
        }).catch(() => {});
      }
    } finally {
      await clearToken().catch(() => {});
      tokenRef.current = null;
      setToken(null);
      setUser(null);
    }
  }, []);

  // Keep module-level token in sync so apiFetch can read it.
  useEffect(() => {
    setCurrentToken(token);
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isLoading, isSigningIn, isSigningInWithApple, error, signIn, signInWithApple, signOut }),
    [user, token, isLoading, isSigningIn, isSigningInWithApple, error, signIn, signInWithApple, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { getCurrentToken } from "@/lib/authToken";
