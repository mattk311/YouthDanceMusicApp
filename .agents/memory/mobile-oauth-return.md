---
name: Mobile OAuth return handling
description: Android browser authentication callbacks also reach app navigation
---

Treat the mobile OAuth return URI as both a browser-session result and an app-navigation destination. Preserve the original internal page and query parameters separately from the callback token.

**Why:** On Android, closing the authentication browser does not guarantee that the router ignores the same deep-link intent. Authentication can succeed while navigation displays a missing-screen page.

**How to apply:** Normalize the router's copy of the native intent before matching routes, without changing the browser session's original token URL. Test actual custom-scheme URLs on both warm and cold navigation, not just browser-relative callback paths. Preserve QR-link destinations as well as ordinary home-page login.
