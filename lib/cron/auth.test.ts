import { afterEach, describe, expect, it } from "vitest";
import { isCronAuthorized } from "./auth";

function req(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/cron/ingest-events", { headers });
}

const savedSecret = process.env.CRON_SECRET;
const savedNodeEnv = process.env.NODE_ENV;

function setEnv(secret: string | undefined, nodeEnv: string) {
  if (secret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = secret;
  // NODE_ENV is a plain string at runtime; assign through a cast to satisfy the types.
  (process.env as Record<string, string>).NODE_ENV = nodeEnv;
}

afterEach(() => {
  if (savedSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = savedSecret;
  (process.env as Record<string, string>).NODE_ENV = savedNodeEnv ?? "test";
});

describe("isCronAuthorized", () => {
  it("accepts the Vercel bearer header when the secret matches", () => {
    setEnv("s3cr3t", "production");
    expect(isCronAuthorized(req({ authorization: "Bearer s3cr3t" }))).toBe(true);
  });

  it("accepts the legacy x-cron-secret header for on-demand calls", () => {
    setEnv("s3cr3t", "production");
    expect(isCronAuthorized(req({ "x-cron-secret": "s3cr3t" }))).toBe(true);
  });

  it("rejects a wrong or missing credential when a secret is set", () => {
    setEnv("s3cr3t", "production");
    expect(isCronAuthorized(req({ authorization: "Bearer nope" }))).toBe(false);
    expect(isCronAuthorized(req())).toBe(false);
  });

  it("fails closed in production when no secret is configured", () => {
    setEnv(undefined, "production");
    expect(isCronAuthorized(req({ authorization: "Bearer anything" }))).toBe(false);
  });

  it("stays open in development when no secret is configured", () => {
    setEnv(undefined, "development");
    expect(isCronAuthorized(req())).toBe(true);
  });
});
