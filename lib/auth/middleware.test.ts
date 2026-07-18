import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  configured: true,
  user: null as { id: string } | null,
  refreshCookie: false,
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: { supabase: { url: "https://project.supabase.co", anonKey: "anon-public-key" } },
  hasSupabase: () => mocks.configured,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import { config, isProtectedPath, middleware } from "../../middleware";

describe("SSR auth middleware", () => {
  beforeEach(() => {
    mocks.configured = true;
    mocks.user = null;
    mocks.refreshCookie = false;
    mocks.createServerClient.mockReset();
    mocks.createServerClient.mockImplementation((_url, _key, options) => ({
      auth: {
        getUser: async () => {
          if (mocks.refreshCookie) {
            options.cookies.setAll([
              {
                name: "sb-session",
                value: "refreshed",
                options: { httpOnly: true, path: "/" },
              },
            ]);
          }
          return { data: { user: mocks.user } };
        },
      },
    }));
  });

  it("is a safe no-op in fixture mode when Supabase is unconfigured", async () => {
    mocks.configured = false;

    const response = await middleware(new NextRequest("http://localhost/feed"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });

  it("redirects an anonymous protected request to login and keeps refreshed cookies", async () => {
    mocks.refreshCookie = true;

    const response = await middleware(new NextRequest("http://localhost/dms/abc"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
  });

  it("redirects an authenticated login request to the signed-in app", async () => {
    mocks.user = { id: "user-1" };

    const response = await middleware(new NextRequest("http://localhost/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/feed");
  });

  it("refreshes API cookies without converting anonymous API responses into redirects", async () => {
    mocks.refreshCookie = true;

    const response = await middleware(new NextRequest("http://localhost/api/feed"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
  });

  it("matches exact protected route segments and excludes framework/static assets", () => {
    expect(isProtectedPath("/feed")).toBe(true);
    expect(isProtectedPath("/listings/listing-1")).toBe(true);
    expect(isProtectedPath("/profile/user-1")).toBe(true);
    expect(isProtectedPath("/feedback")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(config.matcher[0]).toContain("_next/static");
    expect(config.matcher[0]).toContain("_next/image");
    expect(config.matcher[0]).toContain("svg|png|jpg|jpeg|gif|webp|ico");
  });
});
