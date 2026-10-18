import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../lib/hooks/useAuth.jsx";
import { Avatar } from "../ui/Avatar.jsx";
import styles from "./AppShell.module.css";

/** The dark bar at the top of every signed-in page. */
export function TopNav({ clubName }) {
  const { member, signOut } = useAuth();

  return (
    <header className={styles.topnav}>
      <Link to="/clubs" className={styles.logo}>
        {clubName || "To Read or Not to Read"}
      </Link>

      <div className={styles.topRight}>
        {member && (
          <>
            <Avatar member={member} size="md" ringed />
            <span className={styles.who}>{member.name}</span>
            <Link to="/clubs" className={styles.topLink}>
              My clubs
            </Link>
          </>
        )}
        <button type="button" className={styles.topLink} onClick={() => signOut()}>
          Log out
        </button>
      </div>
    </header>
  );
}

/** The per-club nav row. */
export function ClubNav({ clubId, isAdmin }) {
  const links = [
    { to: `/club/${clubId}`, label: "Home", end: true },
    { to: `/club/${clubId}/books`, label: "Books" },
    { to: `/club/${clubId}/ratings`, label: "Ratings" },
    { to: `/club/${clubId}/reviews`, label: "Reviews" },
    { to: `/club/${clubId}/meetings`, label: "Meetings" },
    { to: `/club/${clubId}/settings`, label: isAdmin ? "Settings" : "Members" },
  ];

  return (
    <nav className={styles.clubnav}>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            [styles.navLink, isActive ? styles.navLinkOn : ""]
              .filter(Boolean)
              .join(" ")
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell({ children, clubName, nav }) {
  return (
    <div className={styles.shell}>
      <TopNav clubName={clubName} />
      {nav}
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        To Read or Not to Read · a private book club
      </footer>
    </div>
  );
}

export function Page({ children, wide = false }) {
  return (
    <div className={[styles.page, wide ? styles.pageWide : ""].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
