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

  /* The viewer's own member id, read out as a primitive before the memo below.
     The React Compiler infers a useMemo's dependencies from its body: reading
     `member.id` inside it makes the whole `member` object the inferred
     dependency, which is less specific than the declared one, and the
     compiler then skips optimizing the component rather than memoize on a key
     the author did not write. Hoisting it keeps inferred and declared
     dependencies identical. */
  const myMemberId = member?.id ?? null;

  const derived = useMemo(() => {
    if (!state.data) return null;

    const { club, memberships } = state.data;

    /* Active members, in a stable order so table columns do not shuffle
       between page loads: the signed-in member first, then everyone else
       alphabetically.

       LEARNING: "your own column first" is a small thing that makes a shared
       table much quicker to read, because you stop hunting for your own name
       among the others. Note that it has to be derived per viewer rather than
       stored anywhere: there is no single correct order, since the same club
       must render with Maya's column first for Maya and Mina's first for
       Mina. That is the signature of a value that belongs in a useMemo keyed
       on who is looking, not in a column in the database. The same reasoning
       is why meeting numbers and a book's display number are computed too --
       see the data-model notes in CLAUDE.md. */
    const activeMembers = memberships
      .filter((m) => m.status === "active" && m.members)
      .map((m) => ({ ...m.members, role: m.role, joined_at: m.joined_at }))
      .sort((a, b) => {
        if (myMemberId) {
          if (a.id === myMemberId) return -1;
          if (b.id === myMemberId) return 1;
        }
        return a.name.localeCompare(b.name);
      });

    const pending = memberships
      .filter((m) => m.status === "pending" && m.members)
      .map((m) => ({ ...m.members, requested_at: m.requested_at }));

    const past = memberships
      .filter((m) => m.status === "inactive" && m.members)
      .map((m) => ({ ...m.members, left_at: m.left_at }));

    const mine = memberships.find((m) => m.member_id === myMemberId) ?? null;

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
  }, [state.data, myMemberId]);

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
