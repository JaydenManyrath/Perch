import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createAdminClient = vi.fn();
const ingestEvents = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@/lib/events/ingest", () => ({ ingestEvents }));

function req(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/cron/ingest-events", { headers });
}

const savedSecret = process.env.CRON_SECRET;

describe("GET /api/cron/ingest-events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "s3cr3t";
    createAdminClient.mockReturnValue({});
    ingestEvents.mockResolvedValue({
      cities: [{ city: "Seattle", source: "ticketmaster", upserted: 3 }],
      totalUpserted: 3,
    });
  });

  afterEach(() => {
    if (savedSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = savedSecret;
  });

  it("401s without the bearer secret and never touches the database", async () => {
    const { GET } = await import("@/app/api/cron/ingest-events/route");
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(ingestEvents).not.toHaveBeenCalled();
  });

  it("401s on a wrong bearer secret", async () => {
    const { GET } = await import("@/app/api/cron/ingest-events/route");
    const res = await GET(req({ authorization: "Bearer nope" }));
    expect(res.status).toBe(401);
    expect(ingestEvents).not.toHaveBeenCalled();
  });

  it("200s and runs the idempotent ingest with the correct bearer", async () => {
    const { GET } = await import("@/app/api/cron/ingest-events/route");
    const res = await GET(req({ authorization: "Bearer s3cr3t" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, totalUpserted: 3 });
    expect(ingestEvents).toHaveBeenCalledTimes(1);
  });

  it("500s (not a crash) when the ingest throws", async () => {
    ingestEvents.mockRejectedValueOnce(new Error("db down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("@/app/api/cron/ingest-events/route");
    const res = await GET(req({ authorization: "Bearer s3cr3t" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "ingest_failed" });
  });
});
