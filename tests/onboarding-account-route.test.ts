import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const createAdminClient = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/onboarding/account", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  });
}

function adminMock(opts: { existingEmails?: string[] } = {}) {
  const existing = new Set(opts.existingEmails ?? []);
  const createUser = vi.fn(async ({ email }: { email: string }) => {
    if (existing.has(email)) {
      return { data: { user: null }, error: { message: "A user with this email address has already been registered" } };
    }
    return { data: { user: { id: `uid-${email}` } }, error: null };
  });
  const upsert = vi.fn(async () => ({ error: null }));
  const from = vi.fn(() => ({ upsert }));
  return { client: { auth: { admin: { createUser } }, from }, createUser, upsert };
}

const offer = {
  name: "Dana Whitfield",
  employer: "Acme",
  role: "Data Intern",
  salary: 90000,
  startDate: "2026-06-15",
  endDate: "2026-08-21",
  city: "Seattle",
  relocationStipend: 2000,
  signingBonus: null,
};

describe("POST /api/onboarding/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mints an auth user + users row for the person on the letter, with no social graph", async () => {
    const admin = adminMock();
    createAdminClient.mockReturnValue(admin.client);
    const { POST } = await import("@/app/api/onboarding/account/route");

    const res = await POST(request({ offer }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.email).toBe("dana-whitfield@perch.demo");
    expect(admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "dana-whitfield@perch.demo",
        password: "perch-demo-dana-whitfield@perch.demo",
      }),
    );
    // users row carries the letter's identity...
    expect(admin.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Dana Whitfield",
        company: "Acme",
        city: "Seattle",
        move_in_date: "2026-06-15",
        user_type: "intern",
        verified: false,
        offer_salary: 90000,
        relocation_stipend: 2000,
        signing_bonus: null,
      }),
      expect.anything(),
    );
    // ...and ONLY the users table is written - zero friendships/conversations seeded.
    const tables = (admin.client.from as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]);
    expect(tables).toEqual(["users"]);
  });

  it("suffixes the email on collision instead of failing", async () => {
    const admin = adminMock({ existingEmails: ["dana-whitfield@perch.demo"] });
    createAdminClient.mockReturnValue(admin.client);
    const { POST } = await import("@/app/api/onboarding/account/route");

    const res = await POST(request({ offer }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.email).toBe("dana-whitfield-2@perch.demo");
  });

  it("400s without a name - the letter (or the correction UI) must name the person", async () => {
    createAdminClient.mockReturnValue(adminMock().client);
    const { POST } = await import("@/app/api/onboarding/account/route");

    const res = await POST(request({ offer: { ...offer, name: null } }));

    expect(res.status).toBe(400);
  });

  it("503s when Supabase is not configured (client falls back to fixture identity)", async () => {
    createAdminClient.mockImplementation(() => {
      throw new Error("no env");
    });
    const { POST } = await import("@/app/api/onboarding/account/route");

    const res = await POST(request({ offer }));

    expect(res.status).toBe(503);
  });
});
