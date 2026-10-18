/* ============================================================================
   useClub.jsx — the club you are currently looking at.
   ============================================================================
   Every page inside a club needs the same three things: the club row, its
   member list, and your own role in it. Loading those once in the layout and
   sharing them through context means the six club pages do not each fire the
   same two queries on every navigation.
   ============================================================================ */

import { createContext, useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAsync } from "./useAsync.js";
import { useAuth } from "./useAuth.jsx";
import { getClub, listClubMembers } from "../api/clubs.js";

const ClubContext = createContext(null);

export function useClubData(clubId) {
  const { member } = useAuth();

  const state = useAsync(
    async () => {
      const [club, memberships] = await Promise.all([
        getClub(clubId),
        listClubMembers(clubId),
      ]);
      return { club, memberships };
    },
    [clubId],
    { enabled: Boolean(clubId && member) }
  );

  const derived = useMemo(() => {
    if (!state.data) return null;

    const { club, memberships } = state.data;

    // Active members, in a stable order so table columns do not shuffle
    // between page loads.
    const activeMembers = memberships
      .filter((m) => m.status === "active" && m.members)
      .map((m) => ({ ...m.members, role: m.role, joined_at: m.joined_at }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const pending = memberships
      .filter((m) => m.status === "pending" && m.members)
      .map((m) => ({ ...m.members, requested_at: m.requested_at }));

    const past = memberships
      .filter((m) => m.status === "inactive" && m.members)
      .map((m) => ({ ...m.members, left_at: m.left_at }));

    const mine = memberships.find((m) => m.member_id === member?.id) ?? null;

    return {
      club,
      memberships,
      activeMembers,
      pendingMembers: pending,
      pastMembers: past,
      myMembership: mine,
      isAdmin: mine?.role === "admin" && mine?.status === "active",
      isActiveMember: mine?.status === "active",
      /* Member lookup by id — used constantly by the ratings and reviews
         tables, so it is built once here rather than with .find() per cell. */
      memberById: Object.fromEntries(
        memberships.filter((m) => m.members).map((m) => [m.member_id, m.members])
      ),
    };
  }, [state.data, member?.id]);

  return { ...state, club: derived };
}

export function ClubProvider({ value, children }) {
  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error("useClub must be used inside a club route.");
  return ctx;
}

/** The :clubId from the URL. */
export function useClubId() {
  return useParams().clubId;
}
