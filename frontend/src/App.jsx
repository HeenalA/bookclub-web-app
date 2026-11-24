/* ============================================================================
   App.jsx — routing.
   ============================================================================
   Adding a page is two lines here plus one file in src/routes/. That is the
   main practical payoff over the old approach, where a new page meant a new
   .html file that re-declared the nav, re-loaded the scripts and re-checked
   the session for itself.
   ============================================================================ */

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { IS_CONFIGURED } from "./lib/supabase.js";
import { AuthProvider, useAuth } from "./lib/hooks/useAuth.jsx";
import { LoadingRow, ErrorBanner } from "./components/ui/Feedback.jsx";
import { AppShell, Page } from "./components/layout/AppShell.jsx";
import ClubLayout from "./components/layout/ClubLayout.jsx";

import Setup from "./routes/Setup.jsx";
import Login from "./routes/Login.jsx";
import SetPassword from "./routes/SetPassword.jsx";
import NotFound from "./routes/NotFound.jsx";
import UserHome from "./routes/UserHome.jsx";
import ClubHome from "./routes/ClubHome.jsx";
import ClubBooks from "./routes/ClubBooks.jsx";
import ClubRatings from "./routes/ClubRatings.jsx";
import ClubReviews from "./routes/ClubReviews.jsx";
import ClubMeetings from "./routes/ClubMeetings.jsx";
import ClubSettings from "./routes/ClubSettings.jsx";
import StyleGuide from "./routes/StyleGuide.jsx";

/**
 * A pathless layout route. Everything nested inside it gets the auth context,
 * while /style above stays outside it — so the style guide renders with no
 * session and no database connection at all.
 */
function AuthenticatedArea() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

/** Bounces signed-out visitors to the login page, remembering where they were
 *  going so they land there after signing in. */
function RequireAuth({ children }) {
  const { isSignedIn, loading, memberError } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingRow label="Loading your account…" />;

  if (!isSignedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Signed in, but with no linked member row — a setup problem, not a login
  // problem, so say so instead of looping back to the login page.
  if (memberError) {
    return (
      <AppShell>
        <Page>
          <ErrorBanner error={memberError} />
        </Page>
      </AppShell>
    );
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The live component gallery. Outside the auth area AND outside the
            "is this app configured" check, deliberately: it renders only
            hardcoded sample data, so it is the one page that works before the
            project is connected. That is what makes it usable for design work
            on a fresh clone. */}
        <Route path="/style" element={<StyleGuide />} />

        {IS_CONFIGURED ? (
          <Route element={<AuthenticatedArea />}>
            <Route path="/login" element={<Login />} />
            <Route path="/set-password" element={<SetPassword />} />

            <Route
              path="/clubs"
              element={
                <RequireAuth>
                  <UserHome />
                </RequireAuth>
              }
            />

            <Route
              path="/club/:clubId"
              element={
                <RequireAuth>
                  <ClubLayout />
                </RequireAuth>
              }
            >
              <Route index element={<ClubHome />} />
              <Route path="books" element={<ClubBooks />} />
              <Route path="ratings" element={<ClubRatings />} />
              <Route path="reviews" element={<ClubReviews />} />
              <Route path="meetings" element={<ClubMeetings />} />
              <Route path="settings" element={<ClubSettings />} />
            </Route>

            <Route path="/" element={<Navigate to="/clubs" replace />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        ) : (
          /* Not configured: every route except /style explains what is
             missing, rather than failing with a blank page. */
          <Route path="*" element={<Setup />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
