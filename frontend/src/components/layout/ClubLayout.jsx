import { Outlet, Link } from "react-router-dom";
import { AppShell, ClubNav, Page } from "./AppShell.jsx";
import { ClubProvider, useClubData, useClubId } from "../../lib/hooks/useClub.jsx";
import { LoadingRow, ErrorBanner, EmptyState } from "../ui/Feedback.jsx";
import { Button } from "../ui/Button.jsx";

/**
 * Wraps every page inside a club: loads the club once, then renders the nav
 * and the active page.
 *
 * The "not a member" case is handled here rather than per page. Note that the
 * database is the real gate — RLS returns nothing for a club you are not in,
 * so this is a clear message rather than a security boundary.
 */
export default function ClubLayout() {
  const clubId = useClubId();
  const { club, loading, error, reload } = useClubData(clubId);

  if (loading) {
    return (
      <AppShell>
        <LoadingRow label="Opening the club…" />
      </AppShell>
    );
  }

  if (error || !club?.club) {
    return (
      <AppShell>
        <Page>
          <ErrorBanner error={error} onRetry={reload} />
          <EmptyState icon="🔒" title="This club is not available to you">
            Either it does not exist, or you are not an active member of it.
          </EmptyState>
          <div style={{ textAlign: "center" }}>
            <Link to="/clubs">
              <Button variant="primary">Back to your clubs</Button>
            </Link>
          </div>
        </Page>
      </AppShell>
    );
  }

  if (!club.isActiveMember) {
    const status = club.myMembership?.status;
    return (
      <AppShell clubName={club.club.name}>
        <Page>
          <EmptyState
            icon={status === "pending" ? "⏳" : "👋"}
            title={
              status === "pending"
                ? "Your request is waiting for approval"
                : "You are not currently a member"
            }
          >
            {status === "pending"
              ? "An admin of this club needs to approve you before you can see inside it. Your ratings and reviews are safe in the meantime."
              : "You left this club. Your ratings and reviews are kept — rejoin from your clubs page to see it again."}
          </EmptyState>
          <div style={{ textAlign: "center" }}>
            <Link to="/clubs">
              <Button variant="primary">Back to your clubs</Button>
            </Link>
          </div>
        </Page>
      </AppShell>
    );
  }

  return (
    <ClubProvider value={{ ...club, reloadClub: reload }}>
      <AppShell
        clubName={club.club.name}
        nav={<ClubNav clubId={clubId} isAdmin={club.isAdmin} />}
      >
        <Outlet />
      </AppShell>
    </ClubProvider>
  );
}
