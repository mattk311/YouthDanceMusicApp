import { normalizeLoginIntent } from "../lib/authRedirect";

// Run before Expo Router attempts to match the Android authentication intent.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return normalizeLoginIntent(path);
}
