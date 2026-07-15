import type { MessageRow } from "@/lib/types/contract";
import { ME_ID, otherUsersFixture } from "./users";

const JORDAN = otherUsersFixture[0].id;
const PRIYA = otherUsersFixture[3].id;
const MILES = otherUsersFixture[4].id;

export const messagesFixture: MessageRow[] = [
  // me ↔ Jordan
  {
    id: "m1",
    conversation_id: "conv-jordan",
    sender_id: JORDAN,
    recipient_id: ME_ID,
    body: "hey! saw we're both Stripe SWE — moving same week 👀",
    created_at: "2026-06-04T11:02:00Z",
  },
  {
    id: "m2",
    conversation_id: "conv-jordan",
    sender_id: ME_ID,
    recipient_id: JORDAN,
    body: "oh nice — I'm in Cap Hill. you have housing yet?",
    created_at: "2026-06-04T11:03:00Z",
  },
  {
    id: "m3",
    conversation_id: "conv-jordan",
    sender_id: JORDAN,
    recipient_id: ME_ID,
    body: "signed a 2BR on 15th, could use a 2nd if you're down",
    created_at: "2026-06-04T11:05:00Z",
  },
  {
    id: "m4",
    conversation_id: "conv-jordan",
    sender_id: ME_ID,
    recipient_id: JORDAN,
    body: "let's talk — Sunday coffee?",
    created_at: "2026-06-06T20:15:00Z",
  },

  // me ↔ Priya
  {
    id: "m5",
    conversation_id: "conv-priya",
    sender_id: PRIYA,
    recipient_id: ME_ID,
    body: "Peggy Gou tickets go on sale Friday btw 👀",
    created_at: "2026-06-05T21:00:00Z",
  },
  {
    id: "m6",
    conversation_id: "conv-priya",
    sender_id: ME_ID,
    recipient_id: PRIYA,
    body: "I'm in. dm me when you pull the trigger",
    created_at: "2026-06-05T22:00:00Z",
  },

  // me ↔ Miles
  {
    id: "m7",
    conversation_id: "conv-miles",
    sender_id: MILES,
    recipient_id: ME_ID,
    body: "which office are you closer to — SLU?",
    created_at: "2026-06-06T09:00:00Z",
  },
];
