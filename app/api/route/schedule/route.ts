import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import {
  buildCommuteSchedule,
  CommuteScheduleInputError,
  parseCommuteScheduleInput,
} from "@/lib/route/schedule";
import type { CommuteScheduleResponse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const input = parseCommuteScheduleInput(await req.json());
    const body: CommuteScheduleResponse = { day: buildCommuteSchedule(input) };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    if (err instanceof CommuteScheduleInputError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: g.headers });
    }
    console.error("POST /api/route/schedule failed:", err);
    return NextResponse.json({ error: "route_schedule_failed" }, { status: 500, headers: g.headers });
  }
}
