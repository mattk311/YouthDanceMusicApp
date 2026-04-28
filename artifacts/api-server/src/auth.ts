import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { storage } from "./storage";
import type { User } from "@workspace/db";

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error(
    "Google OAuth credentials not found in environment variables",
  );
}

// Get the full callback URL from environment.
//
// Order of precedence:
//   1. In Replit dev/preview (NODE_ENV !== "production" AND REPLIT_DEV_DOMAIN
//      is set), always use the dev domain. This is critical: if we use a
//      production callback URL here, Google will redirect the user to the
//      production app after sign-in and the dev preview will never receive
//      a session cookie.
//   2. Otherwise, use PUBLIC_URL (preferred for prod) + the callback path.
//   3. Otherwise, use OAUTH_CALLBACK_URL as-is (legacy support).
//   4. Fall back to localhost for local dev outside Replit.
const getCallbackURL = () => {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev && process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}/auth/google/callback`;
  }
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL + "/auth/google/callback";
  }
  if (process.env.OAUTH_CALLBACK_URL) {
    return process.env.OAUTH_CALLBACK_URL;
  }
  return "http://localhost:5000/auth/google/callback";
};

const callbackURL = getCallbackURL();
console.log(`[Auth] Google OAuth callback URL: ${callbackURL}`);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: callbackURL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || "";
        const name = profile.displayName || "";
        const avatar = profile.photos?.[0]?.value;

        let user = await storage.getUserByGoogleId(googleId);

        if (!user) {
          user = await storage.createUser({
            googleId,
            email,
            name,
            avatar,
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, (user as User).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
