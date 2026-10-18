/* ============================================================================
   useAuth.jsx — who is signed in, app-wide.
   ============================================================================
   Holds two related but distinct things:

     authUser — the Supabase Auth account (id, email). Proof of identity.
     member   — the row in our `members` table (slug id, name, colour).
                Everything else in the app keys off `member.id`, because
                ratings, reviews and memberships all reference it.

   They are linked by `members.auth_user_id`, which the trigger in
   db/migrations/0002_auth_link.sql sets when an account is created.

   LEARNING — why React Context: almost every page needs the current member,
   and threading it down from the router to a nested table cell would mean
   every component in between carrying a prop it does not use. Context lets
   any component ask for it directly.

   LEARNING — why `loading` is derived rather than stored: setting state
   synchronously inside an effect schedules an immediate extra render, which
   React's compiler rules flag. So instead of a `loading` flag that effects
   flip up and down, this tracks *which user id the loaded member belongs to*
   and computes "still loading" by comparing that against the current session.
   One source of truth, and the flag cannot drift out of step with reality.
   ============================================================================ */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { sb, IS_CONFIGURED } from "../supabase.js";
import { getMyMember } from "../api/members.js";
import { toAppError } from "../api/errors.js";

const AuthContext = createContext(null);

const NO_MEMBER = { forUserId: null, member: null, error: null };

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [sessionResolved, setSessionResolved] = useState(!IS_CONFIGURED);
  const [memberState, setMemberState] = useState(NO_MEMBER);

  const userId = session?.user?.id ?? null;

  /* ---- Track the Supabase session ------------------------------------- */
  useEffect(() => {
    if (!IS_CONFIGURED) return undefined;

    let active = true;

    // Read the persisted session (refreshing it if stale) before the first
    // render decides whether to redirect to login. Without this the app
    // flashes the login screen on every reload.
    sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      setSessionResolved(true);
    });

    // Fires on sign in, sign out, token refresh, and when an email link is
    // consumed. One subscription keeps every tab in step.
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession ?? null);
      setSessionResolved(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ---- Load the matching member row ----------------------------------- */
  useEffect(() => {
    if (!IS_CONFIGURED) return undefined;

    // Signed out: nothing to load. There is no need to clear the old member
    // either — everything below is derived by comparing `forUserId` against
    // the current session, so a stale row is simply ignored rather than
    // having to be reset.
    if (!userId) return undefined;

    let active = true;

    getMyMember(userId)
      .then((row) => {
        if (!active) return;
        if (row) {
          setMemberState({ forUserId: userId, member: row, error: null });
        } else {
          // An auth account with no member row. Should be impossible given
          // the trigger, so say so plainly rather than rendering an app with
          // no identity.
          setMemberState({
            forUserId: userId,
            member: null,
            error: toAppError({
              message:
                "Your account is not linked to a member profile yet. An admin needs to finish setting it up.",
            }),
          });
        }
      })
      .catch((err) => {
        if (active) {
          setMemberState({
            forUserId: userId,
            member: null,
            error: toAppError(err),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [userId]);

  /* ---- Actions --------------------------------------------------------- */

  const signIn = useCallback(async (email, password) => {
    const { error } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    // Supabase returns one generic message for "no such email" and "wrong
    // password" alike. Passing it straight through is deliberate: a more
    // specific message would let someone test which addresses have accounts.
    if (error) throw toAppError(error);
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await sb.auth.signOut();
    if (error) throw toAppError(error);
  }, []);

  /** Used by the invite / password-reset page. */
  const updatePassword = useCallback(async (password) => {
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw toAppError(error);
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/set-password`,
    });
    if (error) throw toAppError(error);
  }, []);

  /** Re-read the member row after a profile edit. */
  const refreshMember = useCallback(async () => {
    if (!userId) return;
    try {
      const row = await getMyMember(userId);
      setMemberState({ forUserId: userId, member: row, error: null });
    } catch (err) {
      setMemberState({
        forUserId: userId,
        member: null,
        error: toAppError(err),
      });
    }
  }, [userId]);

  /* Is the member row we are holding the one for the CURRENT session? Any
     row loaded for a previous user is ignored rather than cleared. */
  const memberLoaded = Boolean(userId) && memberState.forUserId === userId;

  /* Still loading while either the session has not been read yet, or we have
     a user whose member row has not come back. */
  const loading =
    IS_CONFIGURED && (!sessionResolved || Boolean(userId && !memberLoaded));

  const value = useMemo(
    () => ({
      session,
      authUser: session?.user ?? null,
      member: memberLoaded ? memberState.member : null,
      memberError: memberLoaded ? memberState.error : null,
      loading,
      isSignedIn: Boolean(userId),
      signIn,
      signOut,
      updatePassword,
      sendPasswordReset,
      refreshMember,
    }),
    [
      session,
      userId,
      memberState,
      memberLoaded,
      loading,
      signIn,
      signOut,
      updatePassword,
      sendPasswordReset,
      refreshMember,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an <AuthProvider>.");
  }
  return ctx;
}
