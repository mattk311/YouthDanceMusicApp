---
name: iOS digital subscriptions
description: App Store billing constraint for the mobile app's Pro digital features
---

Do not expose Stripe Checkout, Stripe’s customer portal, or purchase steering in the iOS app for Pro features consumed in the app. Existing Pro entitlements may still be honored.

**Why:** Apple generally requires StoreKit in-app purchase for digital features. External checkout is a likely App Review rejection under guideline 3.1.1.

**How to apply:** Keep web Stripe billing separate. Use RevenueCat/App Store products before enabling new Pro purchases or subscription management on iOS.