import { Redirect, type Href } from "expo-router";
import { getLoginDestination } from "@/lib/authRedirect";

// AuthGate keeps this route behind session completion. Replace the callback
// (including its token query) rather than leaving it in navigation history.
export default function AuthCallbackScreen() {
  return <Redirect href={getLoginDestination() as Href} />;
}
