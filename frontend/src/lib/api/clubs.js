/* ============================================================================
   clubs.js — clubs, membership, and every admin action.
   ============================================================================
   Notice the split: reads are plain table queries (RLS decides what comes
   back), while every write is an `rpc(...)` call. That mirrors the database
   design in db/migrations/0004_rpc.sql — `clubs` and `club_members` have no
   write policies at all, so there is no way to change membership except
   through a function that checks permission first. If you ever find yourself
   wanting `sb.from("club_members").update(...)` here, it will fail, and that
   is working as intended.
   ============================================================================ */
import { sb } from "../supabase.js";
import { unwrap } from "./errors.js";

/** Every club the current member is attached to — active, pending or left. */
export async function listMyMemberships() {
  return unwrap(
    await sb
      .from("club_members")
      .select(
        "club_id, status, role, requested_at, joined_at, left_at, " +
          "clubs ( id, name, visibility, status, founded_date )"
      )
      .order("joined_at", { ascending: false, nullsFirst: false })
  );
}

/** One club's row. */
export async function getClub(clubId) {
  return unwrap(
    await sb
      .from("clubs")
      .select("id, name, visibility, status, founded_date, created_by")
      .eq("id", clubId)
      .single()
  );
}

/** Everyone attached to a club, with their member details. */
export async function listClubMembers(clubId) {
  return unwrap(
    await sb
      .from("club_members")
      .select(
        "member_id, status, role, requested_at, joined_at, left_at, " +
          "members ( id, name, color, initials, email )"
      )
      .eq("club_id", clubId)
  );
}

/* ---------------------------------------------------------------- reads via
   RPC, because they need to see past what RLS allows a non-member to read. */

/** Browse/search clubs you are not already in. */
export async function discoverClubs({ search = "", limit = 5, offset = 0 } = {}) {
  return unwrap(
    await sb.rpc("discover_clubs", {
      p_search: search || null,
      p_limit: limit,
      p_offset: offset,
    })
  );
}

/** The join code for a private club. Admin only — enforced in the function. */
export async function getJoinCode(clubId) {
  return unwrap(await sb.rpc("club_join_code", { p_club: clubId }));
}

/* ------------------------------------------------------------------- writes */

export async function createClub({ name, visibility }) {
  return unwrap(
    await sb.rpc("create_club", { p_name: name, p_visibility: visibility })
  );
}

export async function requestToJoin(clubId) {
  return unwrap(await sb.rpc("request_to_join", { p_club: clubId }));
}

export async function joinWithCode(clubId, code) {
  return unwrap(
    await sb.rpc("join_club_with_code", { p_club: clubId, p_code: code })
  );
}

export async function leaveClub(clubId) {
  return unwrap(await sb.rpc("leave_club", { p_club: clubId }));
}

export async function rejoinClub(clubId) {
  return unwrap(await sb.rpc("rejoin_club", { p_club: clubId }));
}

export async function approveMember(clubId, memberId) {
  return unwrap(
    await sb.rpc("approve_member", { p_club: clubId, p_member: memberId })
  );
}

export async function denyMember(clubId, memberId) {
  return unwrap(
    await sb.rpc("deny_member", { p_club: clubId, p_member: memberId })
  );
}

export async function removeMember(clubId, memberId) {
  return unwrap(
    await sb.rpc("remove_member", { p_club: clubId, p_member: memberId })
  );
}

export async function setMemberRole(clubId, memberId, role) {
  return unwrap(
    await sb.rpc("set_member_role", {
      p_club: clubId,
      p_member: memberId,
      p_role: role,
    })
  );
}

export async function updateClubSettings(clubId, { name, visibility } = {}) {
  return unwrap(
    await sb.rpc("update_club_settings", {
      p_club: clubId,
      p_name: name ?? null,
      p_visibility: visibility ?? null,
    })
  );
}

export async function regenerateJoinCode(clubId) {
  return unwrap(await sb.rpc("regenerate_join_code", { p_club: clubId }));
}

/**
 * Every pending join request across all the clubs you can see, in one query.
 *
 * The `club_members_select_own_or_clubmates` policy already limits this to
 * clubs you are an active member of, so there is no need to pass a club list —
 * and no way to see requests for a club you are not in. The caller filters
 * down to clubs where you are actually an admin, since only an admin can act
 * on them.
 *
 * Doing this as one query rather than one per club matters: the alternative is
 * the classic N+1 pattern, where a user in six clubs triggers seven round
 * trips to render one list.
 */
export async function listPendingApprovals() {
  return unwrap(
    await sb
      .from("club_members")
      .select(
        "club_id, member_id, requested_at, " +
          "members ( id, name, color, initials, email ), " +
          "clubs ( id, name )"
      )
      .eq("status", "pending")
      .order("requested_at", { ascending: true })
  );
}
