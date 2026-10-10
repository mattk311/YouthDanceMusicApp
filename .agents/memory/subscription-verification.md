---
name: Subscription verification
description: Native entitlement freshness and Apple-linked deletion decisions
---

App Store Pro access must be verified on the server when protected features are used, even if the mobile app is closed. A persisted entitlement flag is only a hint to perform verification, not indefinite proof of access. Provider errors must not grant stale Pro access.

**Why:** Expiration and refunds can happen without a mobile session; mobile-triggered sync alone leaves access enabled indefinitely.

**How to apply:** Preserve independent active web subscriptions. Keep native verification bounded and force fresh verification after purchase or restore.

Apple-linked account deletion uses fresh native Apple confirmation and revokes authorization before local deletion; do not retain Apple refresh tokens simply to support deletion.

**Why:** Fresh confirmation binds deletion to the correct Apple account and avoids storing long-lived Apple credentials.

**How to apply:** Missing revocation configuration or provider failure must be explicit. Account deletion does not cancel App Store subscriptions; warn users to cancel those separately.
