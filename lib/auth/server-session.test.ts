import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: false,
  getUser: vi.fn(),
  maybeSingle: vi.fn(),
  createServerSupabase: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  hasSupabase: () => mocks.configured,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabase: mocks.createServerSupabase,
}));

import { ME_ID } from "@/lib/fixtures/users";
import { getInitialSession } from "@/lib/auth/server-session";

describe("initial current-user session", () => {
  beforeEach(() => {
    mocks.configured = false;
    mocks.getUser.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.createServerSupabase.mockReset();
    mocks.createServerSupabase.mockImplementation(async () => ({
      auth: { getUser: mocks.getUser },
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: mocks.maybeSingle }),
        }),
      }),
    }));
  });

  it("keeps the established fixture identity without creating a live client", async () => {
    const session = await getInitialSession();

    expect(session).toEqual({
      currentUser: { id: ME_ID, userType: "intern" },
      mode: "fixture",
    });
    expect(mocks.createServerSupabase).not.toHaveBeenCalled();
  });

  it("exposes the authenticated live user id and profile user type", async () => {
    mocks.configured = true;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "auth-user-1" } } });
    mocks.maybeSingle.mockResolvedValue({ data: { user_type: "subletter" } });

    const session = await getInitialSession();

    expect(session).toEqual({
      currentUser: { id: "auth-user-1", userType: "subletter" },
      mode: "live",
    });
  });

  it("does not invent an identity for an anonymous live request", async () => {
    mocks.configured = true;
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getInitialSession()).resolves.toEqual({
      currentUser: null,
      mode: "live",
    });
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });
});
