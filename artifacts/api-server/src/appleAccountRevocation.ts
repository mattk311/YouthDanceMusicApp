import appleSignin from "apple-signin-auth";

const CLIENT_ID = "com.youthdancemusic.app";

export class AppleRevocationError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function revokeAppleAccount(
  appleId: string,
  credentials: { identityToken?: unknown; authorizationCode?: unknown },
  apple = appleSignin,
) {
  const { identityToken, authorizationCode } = credentials;
  if (typeof identityToken !== "string" || typeof authorizationCode !== "string" ||
      !identityToken || !authorizationCode) {
    throw new AppleRevocationError(
      "Please delete this Apple-linked account from the iPhone app and confirm your Apple sign-in.",
      400,
    );
  }
  const privateKey = process.env.APPLE_SIGNIN_PRIVATE_KEY;
  const keyIdentifier = process.env.APPLE_SIGNIN_KEY_ID;
  const teamID = process.env.APPLE_SIGNIN_TEAM_ID;
  if (!privateKey || !keyIdentifier || !teamID) {
    throw new AppleRevocationError(
      "Apple account deletion is not configured yet. Please contact support@youthdancemusic.com.",
      503,
    );
  }
  try {
    const identity = await apple.verifyIdToken(identityToken, {
      audience: CLIENT_ID, ignoreExpiration: false,
    });
    if (identity.sub !== appleId) {
      throw new AppleRevocationError("Confirm sign-in with the Apple account linked to this profile.", 403);
    }
    const clientSecret = apple.getClientSecret({
      clientID: CLIENT_ID, teamID, keyIdentifier,
      privateKey: privateKey.replace(/\\n/g, "\n"), expAfter: 300,
    });
    const tokens = await apple.getAuthorizationToken(authorizationCode, {
      clientID: CLIENT_ID, clientSecret, redirectUri: "",
    });
    // Bind the authorization code to the same identity, not just the client token.
    const exchangedIdentity = await apple.verifyIdToken(tokens.id_token, {
      audience: CLIENT_ID, ignoreExpiration: false,
    });
    if (exchangedIdentity.sub !== appleId) {
      throw new AppleRevocationError("Apple account confirmation did not match.", 403);
    }
    if (!tokens.refresh_token) throw new Error("Missing revocation token");
    await apple.revokeAuthorizationToken(tokens.refresh_token, {
      clientID: CLIENT_ID, clientSecret, tokenTypeHint: "refresh_token",
    });
  } catch (error) {
    if (error instanceof AppleRevocationError) throw error;
    // Do not log provider errors: they may include credentials or token responses.
    throw new AppleRevocationError("Could not revoke Apple authorization. Confirm Apple sign-in and try again.", 502);
  }
}
