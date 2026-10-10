import assert from "node:assert/strict";
import test from "node:test";
import { createSubscriptionVerifier } from "./subscriptionFreshness";

const user = {
  id: "test-user", appleId: null, subscriptionStatus: null,
  revenueCatEntitlementActive: true,
};

test("expiry is verified while mobile is closed, within the bounded cache window", async () => {
  let time = 0;
  let active = true;
  let calls = 0;
  const service = createSubscriptionVerifier(async () => { calls++; return active; }, () => time);
  assert.equal(await service.hasPro(user), true);
  active = false;
  time = 59_000;
  assert.equal(await service.hasPro(user), true);
  time = 60_001;
  assert.equal(await service.hasPro(user), false);
  assert.equal(calls, 2);
});

test("forced verification detects a refund without waiting for cache expiry", async () => {
  let active = true;
  const service = createSubscriptionVerifier(async () => active);
  assert.equal(await service.hasPro(user), true);
  active = false;
  assert.equal(await service.verify(user.id, true), false);
  assert.equal(await service.hasPro(user), false);
});

test("provider failure never grants persisted Pro and is not cached as success", async () => {
  let fail = true;
  const service = createSubscriptionVerifier(async () => {
    if (fail) throw new Error("Provider unavailable");
    return false;
  });
  await assert.rejects(service.hasPro(user), /Provider unavailable/);
  fail = false;
  assert.equal(await service.hasPro(user), false);
});

test("Stripe access is preserved; free users do not need RevenueCat", async () => {
  const service = createSubscriptionVerifier(async () => { throw new Error("Should not call"); });
  assert.equal(await service.hasPro({ ...user, subscriptionStatus: "active" }), true);
  assert.equal(await service.hasPro({ ...user, revenueCatEntitlementActive: false }), false);
});

test("concurrent entitlement checks share one provider request", async () => {
  let calls = 0;
  const service = createSubscriptionVerifier(async () => { calls++; return true; });
  await Promise.all([service.hasPro(user), service.hasPro(user), service.hasPro(user)]);
  assert.equal(calls, 1);
});
