import type { ConversationRow } from "@/lib/types/contract";
import { ME_ID, otherUsersFixture } from "./users";

// Seeded conversations (me ↔ Jordan, me ↔ Priya, me ↔ Miles).
export const conversationsFixture: ConversationRow[] = [
  {
    id: "conv-jordan",
    participant_ids: [ME_ID, otherUsersFixture[0].id],
    last_message_at: "2026-06-06T20:15:00Z",
    created_at: "2026-06-04T11:00:00Z",
  },
  {
    id: "conv-priya",
    participant_ids: [ME_ID, otherUsersFixture[3].id],
    last_message_at: "2026-06-05T22:00:00Z",
    created_at: "2026-06-05T21:00:00Z",
  },
  {
    id: "conv-miles",
    participant_ids: [ME_ID, otherUsersFixture[4].id],
    last_message_at: "2026-06-06T09:00:00Z",
    created_at: "2026-06-06T08:00:00Z",
  },
];
