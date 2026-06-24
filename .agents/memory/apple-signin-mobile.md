---
name: Apple Sign In mobile flow
description: How Apple Sign In works in this app vs Google OAuth
---

Apple Sign In uses a direct native iOS flow, not the Google web-redirect pattern:
- `expo-apple-authentication.signInAsync()` → returns `identityToken` + user info directly
- Mobile POSTs `{ identityToken, appleUserId, email?, firstName?, lastName? }` to `POST /api/auth/apple/mobile`
- Backend verifies JWT with `apple-signin-auth` package (audience: `com.youthdancemusic.app`)
- Backend creates/finds user by `appleId` column, returns mobile session token like Google flow
- No web browser redirect needed — token returned synchronously in JSON response

**Why:** Apple's native SDK handles the authentication sheet in-process; there's no need for WebBrowser.openAuthSessionAsync like Google requires.

**How to apply:** Apple button only shown when `AppleAuthentication.isAvailableAsync()` returns true (iOS 13+ only). Android/web users only see Google button.

**Requires for production:** EAS build with `expo-apple-authentication` plugin (already in app.json); Apple Developer account must have Sign in with Apple capability enabled for bundle ID `com.youthdancemusic.app`.
