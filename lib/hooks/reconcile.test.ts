import { describe, it, expect } from "vitest";
import { reconcile, addPending, markFailed, type UIMessage } from "./reconcile";
import type { MessageRow } from "@/lib/types/contract";

const ME = "user-me";
const PEER = "user-peer";
const CONV = "conv-abc";

function makeRow(over: Partial<MessageRow> = {}): MessageRow {
  return {
    id: "srv-1",
    conversation_id: CONV,
    sender_id: ME,
    recipient_id: PEER,
    body: "hello",
    created_at: "2026-06-08T12:00:00.000Z",
    ...over,
  };
}

describe("reconcile — the optimistic-send + Realtime echo flow", () => {
  it("(rule 1) dedupes if the same canonical id is already present", () => {
    const echo = makeRow({ id: "srv-99", body: "hi" });
    const start: UIMessage[] = [echo];
    const out = reconcile(start, echo);
    expect(out).toBe(start);
    expect(out).toHaveLength(1);
  });

  it("(rule 2) swaps a pending row from the same sender+body — the sender's own echo", () => {
    const start: UIMessage[] = addPending([], {
      conversation_id: CONV,
      sender_id: ME,
      recipient_id: PEER,
      body: "sunday coffee?",
      tempId: "tmp-1",
      now: "2026-06-08T11:59:59.000Z",
    });
    expect(start[0].pending).toBe(true);
    expect(start[0].tempId).toBe("tmp-1");

    const echo = makeRow({
      id: "srv-42",
      sender_id: ME,
      body: "sunday coffee?",
      created_at: "2026-06-08T12:00:00.500Z",
    });

    const out = reconcile(start, echo);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("srv-42");
    expect(out[0].created_at).toBe("2026-06-08T12:00:00.500Z");
    expect(out[0].pending).toBe(false);
    expect(out[0].tempId).toBeUndefined();
  });

  it("(rule 3) appends a message from the peer as new", () => {
    const start: UIMessage[] = addPending([], {
      conversation_id: CONV,
      sender_id: ME,
      recipient_id: PEER,
      body: "sunday coffee?",
      tempId: "tmp-1",
    });
    const peerReply = makeRow({
      id: "srv-99",
      sender_id: PEER,
      recipient_id: ME,
      body: "yes 11am",
    });
    const out = reconcile(start, peerReply);
    expect(out).toHaveLength(2);
    expect(out[0].pending).toBe(true); // our pending still pending
    expect(out[1].id).toBe("srv-99");
    expect(out[1].body).toBe("yes 11am");
  });

  it("does NOT swap a pending row from a DIFFERENT sender with the same body", () => {
    const start: UIMessage[] = addPending([], {
      conversation_id: CONV,
      sender_id: ME,
      recipient_id: PEER,
      body: "same words",
      tempId: "tmp-1",
    });
    const peerSaysSame = makeRow({
      id: "srv-77",
      sender_id: PEER,
      recipient_id: ME,
      body: "same words",
    });
    const out = reconcile(start, peerSaysSame);
    expect(out).toHaveLength(2);
    expect(out[0].pending).toBe(true);
    expect(out[1].id).toBe("srv-77");
  });

  it("does NOT swap a FAILED pending row (already marked as won't-be-sent)", () => {
    let start: UIMessage[] = addPending([], {
      conversation_id: CONV,
      sender_id: ME,
      recipient_id: PEER,
      body: "oops",
      tempId: "tmp-1",
    });
    start = markFailed(start, "tmp-1");
    expect(start[0].failed).toBe(true);
    expect(start[0].pending).toBe(false);

    const echo = makeRow({ id: "srv-88", sender_id: ME, body: "oops" });
    const out = reconcile(start, echo);
    // The failed row stays failed; echo appended as new.
    expect(out).toHaveLength(2);
    expect(out[0].failed).toBe(true);
    expect(out[1].id).toBe("srv-88");
  });

  it("handles a burst: two identical-body pending sends match FIFO to their own echoes", () => {
    let start: UIMessage[] = [];
    start = addPending(start, {
      conversation_id: CONV,
      sender_id: ME,
      recipient_id: PEER,
      body: "gm",
      tempId: "tmp-A",
    });
    start = addPending(start, {
      conversation_id: CONV,
      sender_id: ME,
      recipient_id: PEER,
      body: "gm",
      tempId: "tmp-B",
    });
    expect(start).toHaveLength(2);

    const echoA = makeRow({ id: "srv-1", sender_id: ME, body: "gm", created_at: "T1" });
    const echoB = makeRow({ id: "srv-2", sender_id: ME, body: "gm", created_at: "T2" });

    const after1 = reconcile(start, echoA);
    expect(after1[0].id).toBe("srv-1");
    expect(after1[0].pending).toBe(false);
    expect(after1[1].pending).toBe(true); // second still pending

    const after2 = reconcile(after1, echoB);
    expect(after2[1].id).toBe("srv-2");
    expect(after2[1].pending).toBe(false);
  });

  it("keeps received messages in a stable canonical order when events arrive out of order", () => {
    const later = makeRow({ id: "srv-later", sender_id: PEER, created_at: "2026-06-08T12:01:00.000Z" });
    const earlier = makeRow({ id: "srv-earlier", sender_id: PEER, created_at: "2026-06-08T12:00:00.000Z" });

    const out = reconcile(reconcile([], later), earlier);

    expect(out.map((message) => message.id)).toEqual(["srv-earlier", "srv-later"]);
  });

  it("dedupes the Realtime echo after the insert response already reconciled it", () => {
    const pending = addPending([], {
      conversation_id: CONV,
      sender_id: ME,
      recipient_id: PEER,
      body: "arrived",
      tempId: "tmp-arrived",
    });
    const inserted = makeRow({ id: "srv-arrived", body: "arrived" });

    const afterInsert = reconcile(pending, inserted);
    const afterEcho = reconcile(afterInsert, inserted);

    expect(afterEcho).toHaveLength(1);
    expect(afterEcho[0].id).toBe("srv-arrived");
  });

  it("preserves a Realtime insert that arrives before initial history resolves", () => {
    const eventDuringRead = makeRow({
      id: "srv-event",
      sender_id: PEER,
      body: "during read",
      created_at: "2026-06-08T12:01:00.000Z",
    });
    const initialHistory = [makeRow({
      id: "srv-history",
      body: "older",
      created_at: "2026-06-08T12:00:00.000Z",
    })];

    const afterEvent = reconcile([], eventDuringRead);
    const afterHistory = initialHistory.reduce(reconcile, afterEvent);

    expect(afterHistory.map((message) => message.id)).toEqual(["srv-history", "srv-event"]);
  });

  it("markFailed only affects the targeted tempId", () => {
    let s: UIMessage[] = addPending([], {
      conversation_id: CONV,
      sender_id: ME,
      recipient_id: PEER,
      body: "one",
      tempId: "tmp-1",
    });
    s = addPending(s, {
      conversation_id: CONV,
      sender_id: ME,
      recipient_id: PEER,
      body: "two",
      tempId: "tmp-2",
    });
    s = markFailed(s, "tmp-2");
    expect(s[0].pending).toBe(true);
    expect(s[0].failed).toBeUndefined();
    expect(s[1].failed).toBe(true);
  });
});

describe("addPending", () => {
  it("appends a pending row with the sentinel id, tempId, and now-ish timestamp", () => {
    const before: UIMessage[] = [];
    const out = addPending(before, {
      conversation_id: CONV,
      sender_id: ME,
      recipient_id: PEER,
      body: "hi",
      tempId: "tmp-x",
      now: "2026-06-08T09:00:00.000Z",
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("tmp-x");
    expect(out[0].tempId).toBe("tmp-x");
    expect(out[0].pending).toBe(true);
    expect(out[0].created_at).toBe("2026-06-08T09:00:00.000Z");
    expect(before).toHaveLength(0); // immutable
  });
});
