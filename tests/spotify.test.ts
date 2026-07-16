import { afterEach, describe, expect, it, vi } from "vitest";
import {
  beginSpotifyConnect,
  ComposioSpotifyProvider,
  readSpotifyTaste,
} from "@/lib/composio/spotify";

afterEach(() => {
  delete process.env.COMPOSIO_DISABLED;
  delete process.env.COMPOSIO_API_KEY;
});

describe("Composio Spotify provider", () => {
  it("uses the v3.1 auth link and read-only Spotify top-items proxy flow", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fakeFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = input.toString();
      calls.push({ url, init });

      if (url.endsWith("/connected_accounts/link")) {
        return Response.json({ redirect_url: "https://connect.composio.dev/spotify-demo" }, { status: 201 });
      }
      if (url.includes("/connected_accounts?")) {
        return Response.json({
          items: [{ id: "ca_spotify_demo", status: "ACTIVE", toolkit: { slug: "spotify" } }],
        });
      }

      const body = JSON.parse(String(init?.body)) as { endpoint: string; method: string };
      if (body.endpoint === "/v1/me/top/artists") {
        return Response.json({ data: { items: [{ name: "Fred again..", genres: ["electronic", "house"] }] } });
      }
      if (body.endpoint === "/v1/me/top/tracks") {
        return Response.json({ data: { items: [{ name: "Delilah" }] } });
      }
      return Response.json({}, { status: 500 });
    });
    const provider = new ComposioSpotifyProvider("test-key", "ac_spotify_readonly", fakeFetch as typeof fetch);

    await expect(beginSpotifyConnect("user-1", provider)).resolves.toEqual({
      redirectUrl: "https://connect.composio.dev/spotify-demo",
    });
    await expect(readSpotifyTaste("user-1", provider)).resolves.toEqual({
      connected: true,
      taste: {
        topArtists: ["Fred again.."],
        topGenres: ["electronic", "house"],
        topTracks: ["Delilah"],
      },
    });

    expect(calls[0].url).toBe("https://backend.composio.dev/api/v3.1/connected_accounts/link");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      auth_config_id: "ac_spotify_readonly",
      user_id: "user-1",
    });
    const proxyBodies = calls
      .filter((call) => call.url.endsWith("/tools/execute/proxy"))
      .map((call) => JSON.parse(String(call.init?.body)));
    expect(proxyBodies).toEqual([
      expect.objectContaining({ endpoint: "/v1/me/top/artists", method: "GET", connected_account_id: "ca_spotify_demo" }),
      expect.objectContaining({ endpoint: "/v1/me/top/tracks", method: "GET", connected_account_id: "ca_spotify_demo" }),
    ]);
  });

  it("keeps the deterministic fixture fallback when Composio is disabled", async () => {
    process.env.COMPOSIO_DISABLED = "1";

    const result = await readSpotifyTaste("user-1");

    expect(result.connected).toBe(true);
    expect(result.taste?.topArtists.length).toBeGreaterThan(0);
    expect(result.taste?.topTracks.length).toBeGreaterThan(0);
  });

  it("returns disconnected without attempting top-item reads when no active account exists", async () => {
    const fakeFetch = vi.fn(async () => Response.json({ items: [] }));
    const provider = new ComposioSpotifyProvider("test-key", "ac_spotify_readonly", fakeFetch as typeof fetch);

    await expect(readSpotifyTaste("user-1", provider)).resolves.toEqual({ connected: false, taste: null });
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });
});
