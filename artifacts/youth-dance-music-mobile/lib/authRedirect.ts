// OAuth opens this deep link on Android in addition to resolving the browser
// session. Keep the original in-app destination out of the callback's token URL.
let pendingDestination = "/";

export function safeLoginDestination(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return "/";
  try {
    const url = new URL(href, "https://local.invalid");
    if (url.origin !== "https://local.invalid") return "/";
    const path = url.pathname;
    if (!["/", "/request", "/popular", "/dances", "/about", "/subscription"].includes(path) &&
        !/^\/dance\/[^/]+$/.test(path)) return "/";
    url.searchParams.delete("token");
    return path + url.search;
  } catch {
    return "/";
  }
}

export function rememberLoginDestination(href: string): void {
  pendingDestination = safeLoginDestination(href);
}

export function getLoginDestination(): string {
  return pendingDestination;
}

export function normalizeLoginIntent(path: string): string {
  try {
    const url = new URL(path, "https://local.invalid");
    const nativeScheme = ["youthdancemusic:", "youth-dance-music-mobile:"].includes(url.protocol);
    const callbackPath = url.pathname.replace(/\/+$/, "");
    const isCallback =
      (nativeScheme && url.hostname === "auth-callback" && !callbackPath) ||
      ((nativeScheme || url.origin === "https://local.invalid") && callbackPath === "/auth-callback") ||
      (["exp:", "exps:"].includes(url.protocol) && callbackPath === "/--/auth-callback");
    // Expo Router and WebBrowser receive the same Android intent. Only rewrite
    // the router's copy; WebBrowser still receives the original token URL.
    return isCallback ? getLoginDestination() : path;
  } catch {
    return path;
  }
}
