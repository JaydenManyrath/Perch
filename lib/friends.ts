import type { Friend, FriendNote, FriendNotesResponse, FriendStatus, FriendsResponse } from "@/lib/types/contract";

type SupabaseLike = {
  from(table: string): any;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendStatus;
  created_at?: string;
};

type FriendUserRow = {
  id: string;
  name: string;
  avatar_url: string | null;
  company: string;
  user_type?: string;
};

type AttendanceRow = {
  event_id: string;
  user_id: string;
  created_at?: string;
};

type FriendEventRow = {
  id: string;
  title: string;
  datetime: string;
};

export class FriendInputError extends Error {}
export class FriendForbiddenError extends Error {}
export class FriendNotFoundError extends Error {}

const FRIENDSHIP_SELECT = "id, requester_id, addressee_id, status, created_at";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function parseFriendTargetId(value: unknown): string {
  if (!isUuid(value)) throw new FriendInputError("invalid_user_id");
  return value;
}

function pairFilter(a: string, b: string) {
  return `and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`;
}

function directionFor(callerId: string, row: FriendshipRow): Friend["direction"] {
  return row.addressee_id === callerId ? "incoming" : "outgoing";
}

async function requireIntern(db: SupabaseLike, userId: string, error: Error) {
  const { data, error: queryError } = await db
    .from("users")
    .select("id, name, avatar_url, company, user_type")
    .eq("id", userId)
    .maybeSingle();
  if (queryError) throw queryError;
  if (!data || data.user_type !== "intern") throw error;
  return data as FriendUserRow;
}

async function usersById(db: SupabaseLike, ids: string[]) {
  if (ids.length === 0) return new Map<string, FriendUserRow>();
  const uniqueIds = [...new Set(ids)];
  const { data, error } = await db
    .from("users")
    .select("id, name, avatar_url, company")
    .in("id", uniqueIds);
  if (error) throw error;
  return new Map<string, FriendUserRow>((data ?? []).map((user: FriendUserRow) => [user.id, user]));
}

async function eventsById(db: SupabaseLike, ids: string[]) {
  if (ids.length === 0) return new Map<string, FriendEventRow>();
  const uniqueIds = [...new Set(ids)];
  // Upcoming only, in-query (round 7): the DMs notes strip must never resurface an event
  // a friend once marked "going" after it has passed. Same guard the feed and map use;
  // listFriendNotes drops attendance rows whose event misses this lookup.
  const { data, error } = await db
    .from("events")
    .select("id, title, datetime")
    .in("id", uniqueIds)
    .gte("datetime", new Date().toISOString());
  if (error) throw error;
  return new Map<string, FriendEventRow>((data ?? []).map((event: FriendEventRow) => [event.id, event]));
}

function toFriend(callerId: string, row: FriendshipRow, users: Map<string, FriendUserRow>): Friend {
  const otherId = row.requester_id === callerId ? row.addressee_id : row.requester_id;
  const user = users.get(otherId);
  if (!user) throw new FriendNotFoundError("friend_user_not_found");

  return {
    friendshipId: row.id,
    user: {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatar_url,
      company: user.company,
    },
    status: row.status,
    direction: directionFor(callerId, row),
  };
}

async function rowsToResponse(db: SupabaseLike, callerId: string, rows: FriendshipRow[]): Promise<FriendsResponse> {
  const otherIds = rows.map((row) => (row.requester_id === callerId ? row.addressee_id : row.requester_id));
  const users = await usersById(db, otherIds);
  return { friends: rows.map((row) => toFriend(callerId, row, users)) };
}

export async function listAcceptedFriends(db: SupabaseLike, callerId: string): Promise<FriendsResponse> {
  const { data, error } = await db
    .from("friendships")
    .select(FRIENDSHIP_SELECT)
    .eq("status", "accepted")
    .or(`requester_id.eq.${callerId},addressee_id.eq.${callerId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return rowsToResponse(db, callerId, data ?? []);
}

export async function listIncomingFriendRequests(db: SupabaseLike, callerId: string): Promise<FriendsResponse> {
  const { data, error } = await db
    .from("friendships")
    .select(FRIENDSHIP_SELECT)
    .eq("status", "pending")
    .eq("addressee_id", callerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return rowsToResponse(db, callerId, data ?? []);
}

export async function listFriendNotes(db: SupabaseLike, callerId: string): Promise<FriendNotesResponse> {
  await requireIntern(db, callerId, new FriendForbiddenError("intern_required"));

  const { data: friendships, error: friendshipError } = await db
    .from("friendships")
    .select(FRIENDSHIP_SELECT)
    .eq("status", "accepted")
    .or(`requester_id.eq.${callerId},addressee_id.eq.${callerId}`)
    .order("created_at", { ascending: false });
  if (friendshipError) throw friendshipError;

  const friendIds = [...new Set(((friendships ?? []) as FriendshipRow[])
    .filter((row) => row.status === "accepted" && (row.requester_id === callerId || row.addressee_id === callerId))
    .map((row) => (row.requester_id === callerId ? row.addressee_id : row.requester_id)))];
  if (friendIds.length === 0) return { notes: [] };

  const { data: attendance, error: attendanceError } = await db
    .from("event_attendance")
    .select("event_id, user_id, created_at")
    .in("user_id", friendIds);
  if (attendanceError) throw attendanceError;

  const attendanceRows = (attendance ?? []) as AttendanceRow[];
  const eventIds = [...new Set(attendanceRows.map((row) => row.event_id))];
  if (eventIds.length === 0) return { notes: [] };

  const [friendUsers, events] = await Promise.all([
    usersById(db, friendIds),
    eventsById(db, eventIds),
  ]);

  const notes = attendanceRows
    .map((row): FriendNote | null => {
      const friend = friendUsers.get(row.user_id);
      const event = events.get(row.event_id);
      if (!friend || !event) return null;
      return {
        friend: { id: friend.id, name: friend.name, avatarUrl: friend.avatar_url },
        event: { id: event.id, title: event.title, datetime: event.datetime },
      };
    })
    .filter((note): note is FriendNote => note !== null)
    .sort((a, b) => {
      const byDatetime = a.event.datetime.localeCompare(b.event.datetime);
      if (byDatetime !== 0) return byDatetime;
      const byFriend = a.friend.name.localeCompare(b.friend.name);
      if (byFriend !== 0) return byFriend;
      return a.event.id.localeCompare(b.event.id);
    });

  return { notes };
}

export async function requestFriend(db: SupabaseLike, callerId: string, targetId: string): Promise<Friend> {
  parseFriendTargetId(targetId);
  if (targetId === callerId) throw new FriendInputError("cannot_friend_self");

  await requireIntern(db, callerId, new FriendForbiddenError("intern_required"));
  await requireIntern(db, targetId, new FriendInputError("target_not_found_or_not_intern"));

  const existing = await findFriendshipForPair(db, callerId, targetId);
  if (existing) return friendForSingleRow(db, callerId, existing);

  const inserted = await db
    .from("friendships")
    .insert({ requester_id: callerId, addressee_id: targetId, status: "pending" })
    .select(FRIENDSHIP_SELECT)
    .single();

  if (inserted.error) {
    const afterRace = await findFriendshipForPair(db, callerId, targetId);
    if (afterRace) return friendForSingleRow(db, callerId, afterRace);
    throw inserted.error;
  }
  return friendForSingleRow(db, callerId, inserted.data);
}

async function findFriendshipForPair(db: SupabaseLike, callerId: string, targetId: string): Promise<FriendshipRow | null> {
  const { data, error } = await db
    .from("friendships")
    .select(FRIENDSHIP_SELECT)
    .or(pairFilter(callerId, targetId))
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

async function friendForSingleRow(db: SupabaseLike, callerId: string, row: FriendshipRow): Promise<Friend> {
  const response = await rowsToResponse(db, callerId, [row]);
  return response.friends[0];
}

export async function acceptFriendRequest(db: SupabaseLike, callerId: string, friendshipId: string): Promise<Friend> {
  const { data, error } = await db
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId)
    .eq("addressee_id", callerId)
    .eq("status", "pending")
    .select(FRIENDSHIP_SELECT)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new FriendForbiddenError("cannot_accept_friend_request");
  return friendForSingleRow(db, callerId, data);
}

export async function declineFriendRequest(db: SupabaseLike, callerId: string, friendshipId: string): Promise<void> {
  const { data, error } = await db
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .eq("addressee_id", callerId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new FriendForbiddenError("cannot_decline_friend_request");
}
