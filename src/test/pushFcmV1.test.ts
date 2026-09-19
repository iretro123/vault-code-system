import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pushFn = readFileSync("supabase/functions/push-notify/index.ts", "utf8");
const androidBuild = readFileSync("android/app/build.gradle", "utf8");
const googleServices = JSON.parse(readFileSync("android/app/google-services.json", "utf8"));

describe("Android push uses FCM HTTP v1", () => {
  it("no longer calls the legacy fcm/send endpoint or server key", () => {
    expect(pushFn).not.toContain("fcm/send");
    expect(pushFn).not.toContain("FCM_SERVER_KEY");
    expect(pushFn).not.toContain("registration_ids");
    expect(pushFn).toContain("messages:send");
  });

  it("mints a scoped service-account access token", () => {
    expect(pushFn).toContain("https://www.googleapis.com/auth/firebase.messaging");
    expect(pushFn).toContain("urn:ietf:params:oauth:grant-type:jwt-bearer");
    expect(pushFn).toMatch(/setProtectedHeader\(\{ alg: "RS256"/);
  });

  it("accepts either documented service account secret name", () => {
    expect(pushFn).toContain("FCM_SERVICE_ACCOUNT_JSON");
    expect(pushFn).toContain("FIREBASE_SERVICE_ACCOUNT_JSON");
  });

  it("sends all data values as strings", () => {
    expect(pushFn).toMatch(/notification_id: String\(notif\.id\)/);
    expect(pushFn).toMatch(/link_path: String\(notif\.linkPath\)/);
  });

  it("bounds concurrency and per-send timeouts", () => {
    expect(pushFn).toContain("FCM_MAX_CONCURRENCY");
    expect(pushFn).toContain("FCM_SEND_TIMEOUT_MS");
    expect(pushFn).toContain("AbortController");
  });

  it("deletes tokens only on an explicit UNREGISTERED result", () => {
    expect(pushFn).toMatch(/isUnregisteredResponse[\s\S]{0,400}status !== 404/);
    expect(pushFn).toContain('errorCode === "UNREGISTERED"');
    expect(pushFn).toMatch(/\.delete\(\)\.in\("token", result\.staleTokens\)/);
  });

  it("never counts a failed send as delivered", () => {
    expect(pushFn).toMatch(/if \(res\.ok\) \{\s*sent \+= 1;/);
  });

  it("treats a missing Android config as a per-platform failure so iOS still sends", () => {
    expect(pushFn).toMatch(/platformErrors\.android =\s*\n?\s*"Firebase service account not configured/);
    expect(pushFn).not.toContain('error: "FCM_SERVER_KEY not set"');
    expect(pushFn).toContain("platformErrors.ios");
  });
});

describe("Android Firebase client config", () => {
  it("restores the verified project and package", () => {
    expect(googleServices.project_info.project_id).toBe("vault-os-android-push");
    expect(googleServices.client[0].client_info.android_client_info.package_name).toBe(
      "com.vaulttradingacademy.vaultos",
    );
  });

  it("is picked up by the Android build", () => {
    expect(androidBuild).toContain("file('google-services.json')");
    expect(androidBuild).toContain("apply plugin: 'com.google.gms.google-services'");
  });
});
