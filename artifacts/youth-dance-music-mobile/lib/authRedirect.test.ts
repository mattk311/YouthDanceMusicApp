import assert from "node:assert/strict";
import test from "node:test";
import { getLoginDestination, rememberLoginDestination, safeLoginDestination } from "./authRedirect";
import { redirectSystemPath } from "../app/+native-intent";

test("Google login callback returns directly to the home screen by default", () => {
  assert.equal(getLoginDestination(), "/");
  rememberLoginDestination("/");
  assert.equal(getLoginDestination(), "/");
});

test("a dance QR destination and its query survive the login browser callback", () => {
  rememberLoginDestination("/request?code=DANCE123");
  assert.equal(getLoginDestination(), "/request?code=DANCE123");
  assert.equal(safeLoginDestination("/dance/dance-123"), "/dance/dance-123");
});

test("callback tokens never become return destinations or navigation history", () => {
  for (const href of ["/auth-callback?token=example", "/sign-in", "//external.invalid", "https://external.invalid", "/\\external.invalid"]) {
    assert.equal(safeLoginDestination(href), "/");
  }
  assert.equal(safeLoginDestination("/request?code=DANCE123&token=example"), "/request?code=DANCE123");
});

test("actual Android OAuth intents never enter the missing-screen route", () => {
  rememberLoginDestination("/");
  for (const path of [
    "youthdancemusic://auth-callback?token=example",
    "youthdancemusic:///auth-callback?token=example",
    "youth-dance-music-mobile://auth-callback?token=example",
    "youth-dance-music-mobile:///auth-callback/?token=example",
    "exp://127.0.0.1:8081/--/auth-callback?token=example",
    "/auth-callback?token=example",
  ]) {
    for (const initial of [true, false]) {
      assert.equal(redirectSystemPath({ path, initial }), "/");
    }
  }
});

test("Android callback intents preserve the original dance QR destination", () => {
  rememberLoginDestination("/request?code=DANCE123");
  assert.equal(redirectSystemPath({
    path: "youthdancemusic://auth-callback?token=example", initial: false,
  }), "/request?code=DANCE123");
});

test("unrelated deep links are left untouched", () => {
  for (const path of [
    "youthdancemusic://request?code=DANCE123",
    "/request?code=DANCE123",
    "/dance/dance-123",
    "https://youthdancemusic.com/request?code=DANCE123",
    "youthdancemusic://auth-callback/unrelated",
  ]) {
    assert.equal(redirectSystemPath({ path, initial: false }), path);
  }
});
