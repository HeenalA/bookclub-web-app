import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/hooks/useAuth.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Banner, ErrorBanner, LoadingRow } from "../components/ui/Feedback.jsx";
import { toAppError } from "../lib/api/errors.js";
import styles from "./Auth.module.css";

/**
 * Sign in.
 *
 * There is deliberately no sign-up form. Accounts are created by invitation
 * from the Supabase dashboard, which means this app has no unauthenticated
 * endpoint that writes to the database — nothing for anyone to probe or spam.
 * See docs/DECISIONS.md for the full reasoning, and docs/RUNBOOK.md for how to
 * invite someone.
 */
export default function Login() {
  const { isSignedIn, loading, signIn, sendPasswordReset } = useAuth();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [resetSent, setResetSent] = useState(false);

  if (loading) return <LoadingRow label="Checking your session…" />;

  if (isSignedIn) {
    // Send them where they were originally headed, if they were bounced here.
    const to = location.state?.from || "/clubs";
    return <Navigate to={to} replace />;
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(toAppError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onReset() {
    setError(null);
    if (!email.trim()) {
      setError(toAppError({ message: "Enter your email address first." }));
      return;
    }
    try {
      await sendPasswordReset(email);
      setResetSent(true);
    } catch (err) {
      setError(toAppError(err));
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={onSubmit}>
        <p className={styles.logo}>To Read or Not to Read</p>
        <p className={styles.sub}>Sign in to your book clubs</p>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />
        {resetSent && (
          <Banner tone="success">
            Check your email for a link to set a new password.
          </Banner>
        )}

        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@email.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" variant="primary" block busy={busy} busyLabel="Signing in…">
          Log in
        </Button>

        <p className={styles.note}>
          <button type="button" className={styles.linkButton} onClick={onReset}>
            Forgot your password?
          </button>
        </p>

        <p className={styles.note}>
          This is a private app. Accounts are created by invitation — ask an
          admin to add you.
        </p>
      </form>
    </div>
  );
}
