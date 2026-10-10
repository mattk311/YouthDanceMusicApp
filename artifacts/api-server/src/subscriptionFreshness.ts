import type { User } from "@workspace/db";
import { hasActiveRevenueCatProEntitlement } from "./revenueCatClient";

// Bounded request-time verification works even when the mobile app is closed.
// Never fall back to the persisted entitlement flag on a provider failure.
export function createSubscriptionVerifier(
  lookup: (id: string) => Promise<boolean>,
  now = Date.now,
) {
  const cache = new Map<string, { active: boolean; expires: number }>();
  const pending = new Map<string, Promise<boolean>>();
  const verify = (id: string, force = false): Promise<boolean> => {
    const running = pending.get(id);
    if (running) return running;
    const cached = cache.get(id);
    if (!force && cached && cached.expires > now()) {
      return Promise.resolve(cached.active);
    }
    const request = lookup(id).then((active) => {
      if (cache.size >= 1000) cache.clear();
      cache.set(id, { active, expires: now() + 60_000 });
      return active;
    }).finally(() => pending.delete(id));
    pending.set(id, request);
    return request;
  };
  return {
    verify,
    async hasPro(user: Pick<User, "id" | "appleId" | "subscriptionStatus" | "revenueCatEntitlementActive">) {
      if (user.subscriptionStatus === "active") return true;
      // Google users can also buy on iOS; the initial purchase sync marks them.
      if (!user.appleId && !user.revenueCatEntitlementActive) return false;
      return verify(user.id);
    },
  };
}

export const subscriptionVerifier = createSubscriptionVerifier(
  hasActiveRevenueCatProEntitlement,
);
