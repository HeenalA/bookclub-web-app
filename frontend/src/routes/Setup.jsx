import styles from "./Auth.module.css";

/**
 * Shown when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are missing.
 *
 * A blank screen and a console error is a bad first run. This says exactly
 * what is missing and where to fix it.
 */
export default function Setup() {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.icon} aria-hidden="true">
          🔌
        </div>
        <p className={styles.logo}>Not connected yet</p>
        <p className={styles.sub}>
          This app does not know which Supabase project to talk to.
        </p>

        <p style={{ fontSize: "var(--text-small)", marginBottom: "var(--space-3)" }}>
          Create <code>frontend/.env.local</code> with:
        </p>

        <code className={styles.code}>
          VITE_SUPABASE_URL=https://your-ref.supabase.co
          <br />
          VITE_SUPABASE_ANON_KEY=your-anon-key
        </code>

        <p className={styles.note}>
          Both values are on your project's API settings page in the Supabase
          dashboard. Restart the dev server afterwards — Vite only reads env
          files at startup.
          <br />
          <br />
          Full walkthrough: <code>docs/RUNBOOK.md</code>
        </p>
      </div>
    </div>
  );
}
