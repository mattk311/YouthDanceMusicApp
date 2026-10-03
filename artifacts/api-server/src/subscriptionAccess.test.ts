import assert from "node:assert/strict";
import test from "node:test";

import { includesRevenueCatEntitlement } from "./revenueCatClient";
import { userHasProAccess } from "./storage";

test("recognizes active RevenueCat entitlement resource IDs", () => {
  assert.equal(
    includesRevenueCatEntitlement(
      [{ id: "entl_other" }, { entitlement_id: "entl_pro" }],
      "entl_pro",
    ),
    true,
  );
  assert.equal(
    includesRevenueCatEntitlement([{ id: "entl_other" }], "entl_pro"),
    false,
  );
});

test("allows either Stripe or RevenueCat Pro access", () => {
  assert.equal(
    userHasProAccess({
      subscriptionStatus: "active",
      revenueCatEntitlementActive: false,
    }),
    true,
  );
  assert.equal(
    userHasProAccess({
      subscriptionStatus: null,
      revenueCatEntitlementActive: true,
    }),
    true,
  );
  assert.equal(
    userHasProAccess({
      subscriptionStatus: "canceled",
      revenueCatEntitlementActive: false,
    }),
    false,
  );
});