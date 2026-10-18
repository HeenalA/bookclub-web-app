import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sb } from "../lib/supabase.js";
import { useAuth } from "../lib/hooks/useAuth.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Button } from "../components/ui/Button.jsx";
import { ErrorBanner, LoadingRow, Banner } from "../components/ui/Feedback.jsx";
import { toAppError } from "../lib/api/errors.js";
import styles from "./Auth.module.css";

const MIN_PASSWORD_LENGTH = 10;

/**
 * Where invitation and password-reset emails land.
 *
 * Supabase sends these links in one of two shapes depending on the project's
 * email template version, so this page handles both:
 *
 *   1. `#access_token=...&type=invite` in the URL fragment. The client picks
 *      this up automatically because `detectSessionInUrl` is on, so by the
 *      time this component mounts there is already a session.
 *   2. `?token_hash=...&type=invite` in the query string, which has to be
 *      exchanged explicitly via verifyOtp().
 *
 * Supporting both means the page works regardless of which template the
 * project is using, rather than failing mysteriously on one of them.
 */
export default function SetPassword() {
  const { isSignedIn, loading, updatePassword } = useAuth();
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;

    async function verify() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (tokenHash && type) {
        const { error: verifyError } = await sb.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        if (active && verifyError) setError(toAppError(verifyError));
        // Clear the token out of the address bar so it is not left in
        // history or copied into a chat by accident.
        if (active) window.history.replaceState({}, "", "/set-password");
      }

      if (active) setVerifying(false);
    }

    verify();
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(event) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        toAppError({
          message: `Use at least ${MIN_PASSWORD_LENGTH} characters. A short phrase you will remember beats a short scramble you will not.`,
        })
      );
      return;
    }
    if (password !== confirm) {
      setError(toAppError({ message: "Those two passwords do not match." }));
      return;
    }

    setBusy(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate("/clubs", { replace: true }), 1200);
    } catch (err) {
      setError(toAppError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading || verifying) {
    return <LoadingRow label="Checking your invitation…" />;
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={onSubmit}>
        <p className={styles.logo}>Set your password</p>
        <p className={styles.sub}>
          Choose a password and you are in. You will not need the email link
          again.
        </p>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        {done ? (
          <Banner tone="success">Password saved. Taking you to your clubs…</Banner>
        ) : !isSignedIn ? (
          <>
            <Banner tone="warning">
              This link is no longer valid. Invitation and reset links expire
              after a while and can only be used once.
            </Banner>
            <p className={styles.center}>
              <Link to="/login" className={styles.linkButton}>
                Back to sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <Field
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              help={`At least ${MIN_PASSWORD_LENGTH} characters.`}
            />
            <Field
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <Button
              type="submit"
              variant="primary"
              block
              busy={busy}
              busyLabel="Saving…"
            >
              Save password
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
