import assert from "node:assert/strict";
import test from "node:test";
import appleSignin from "apple-signin-auth";
import { AppleRevocationError, revokeAppleAccount } from "./appleAccountRevocation";

test("Apple revocation binds both tokens to the profile and revokes before deletion", async () => {
  // Dummy signing material, never used outside this mock.
  const keys = ["APPLE_SIGNIN_PRIVATE_KEY", "APPLE_SIGNIN_KEY_ID", "APPLE_SIGNIN_TEAM_ID"];
  const previous = keys.map((key) => process.env[key]);
  keys.forEach((key) => { process.env[key] = "unit-test"; });
  try {
    let subjects = ["apple-user", "apple-user"];
    let revoked = 0;
    let exchanged = 0;
    const mock = {
      verifyIdToken: async () => ({ sub: subjects.shift() }),
      getClientSecret: () => "mock-client-secret",
      getAuthorizationToken: async () => {
        exchanged++;
        return { id_token: "mock-exchanged-token", refresh_token: "mock-refresh" };
      },
      revokeAuthorizationToken: async (token: string) => {
        assert.equal(token, "mock-refresh");
        revoked++;
      },
    } as unknown as typeof appleSignin;
    const input = { identityToken: "mock-identity", authorizationCode: "mock-code" };
    await revokeAppleAccount("apple-user", input, mock);
    assert.equal(revoked, 1);
    subjects = ["wrong-user"];
    await assert.rejects(revokeAppleAccount("apple-user", input, mock),
      (error: unknown) => error instanceof AppleRevocationError && error.status === 403);
    assert.equal(exchanged, 1);
    subjects = ["apple-user", "wrong-user"];
    await assert.rejects(revokeAppleAccount("apple-user", input, mock),
      (error: unknown) => error instanceof AppleRevocationError && error.status === 403);
    assert.equal(revoked, 1);
    subjects = ["apple-user", "apple-user"];
    const failingMock = {
      ...mock,
      revokeAuthorizationToken: async () => { throw new Error("Sensitive provider response"); },
    };
    await assert.rejects(revokeAppleAccount("apple-user", input, failingMock),
      (error: unknown) => error instanceof AppleRevocationError &&
        error.status === 502 && !error.message.includes("Sensitive"));
    await assert.rejects(revokeAppleAccount("apple-user", {}, mock),
      (error: unknown) => error instanceof AppleRevocationError && error.status === 400);
    delete process.env.APPLE_SIGNIN_PRIVATE_KEY;
    await assert.rejects(revokeAppleAccount("apple-user", input, mock),
      (error: unknown) => error instanceof AppleRevocationError && error.status === 503);
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});
