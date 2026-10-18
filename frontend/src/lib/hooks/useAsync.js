/* ============================================================================
   useAsync.js — load data, with loading and error states handled once.
   ============================================================================
   Every data-backed page needs the same four things: run a query, show a
   spinner, show an error if it fails, and offer a way to reload. Writing that
   per page is where inconsistent error handling comes from — one page shows a
   message, another silently renders empty.

   TWO THINGS IN HERE ARE SUBTLER THAN THEY LOOK:

   1. `loading` is DERIVED, not stored. The obvious way to write this hook is
      `setLoading(true)` at the top of the effect — but calling setState
      synchronously inside an effect schedules an immediate second render, and
      React's compiler rules now flag it. Instead each request gets a `key`
      from its dependencies, and the hook is "loading" whenever the result it
      is holding was produced for a different key than the current one. No
      state to set, and it is impossible for `loading` to get out of step with
      what is actually in flight.

   2. The `active` flag prevents a race condition. Navigating quickly from club
      A to club B leaves both requests in flight; if A's response lands second
      it would overwrite B's data and you would be looking at the wrong club.
      The cleanup function flips `active` so a response from an abandoned
      request is discarded.
   ============================================================================ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toAppError } from "../api/errors.js";

/**
 * @param {Function} loader   async function returning the data
 * @param {Array}    deps     re-run when these change (like useEffect)
 * @param {Object}   options  { enabled } — skip the load when false
 */
export function useAsync(loader, deps = [], { enabled = true } = {}) {
  const [reloadToken, setReloadToken] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: null });

  /* A stable identity for "which request should be in flight right now".
     JSON is fine here because deps are ids, strings and numbers. */
  const key = useMemo(
    () => JSON.stringify({ deps, reloadToken, enabled }),
    [deps, reloadToken, enabled]
  );

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return undefined;

    let active = true;

    Promise.resolve()
      .then(() => loader())
      .then((data) => {
        if (active) setResult({ key, data, error: null });
      })
      .catch((err) => {
        if (active) setResult({ key, data: null, error: toAppError(err) });
      });

    return () => {
      active = false;
    };
    /* `loader` is intentionally not a dependency. It is an inline arrow
       function at every call site, so it is a new value on every render —
       listing it would re-run the query in an endless loop. `key` already
       captures everything the query actually depends on, which is what the
       caller passes as `deps`. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const loading = enabled && result.key !== key;

  const setData = useCallback(
    (data) => setResult((prev) => ({ ...prev, data })),
    []
  );

  return {
    data: result.data,
    error: loading ? null : result.error,
    loading,
    reload,
    setData,
  };
}
