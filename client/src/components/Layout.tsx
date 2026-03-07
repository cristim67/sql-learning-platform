import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navLink =
    "px-3 py-2 rounded-lg font-medium text-text-muted no-underline hover:text-text hover:bg-bg-hover";
  const navActive = "text-text bg-bg-hover";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center gap-8 px-6 py-3 bg-bg-card border-b border-border sticky top-0 z-10">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-[1.15rem] text-text no-underline hover:text-accent hover:no-underline"
        >
          <span className="text-2xl">🐘</span>
          Learn PostgreSQL
        </Link>
        <nav className="flex gap-2">
          <Link
            to="/"
            className={location.pathname === "/" ? `${navLink} ${navActive}` : navLink}
          >
            Lessons
          </Link>
          <Link
            to="/settings"
            className={
              location.pathname === "/settings" ? `${navLink} ${navActive}` : navLink
            }
          >
            Settings
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-border bg-bg-hover overflow-hidden shrink-0 flex items-center justify-center">
            {user?.picture ? (
              <img
                src={user.picture}
                alt=""
                className="w-full h-full object-cover"
                width={36}
                height={36}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-sm font-semibold text-text-muted">
                {(user?.name ?? user?.email ?? "?")[0].toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-sm text-text-muted max-w-[180px] truncate">
            {user?.name ?? user?.email}
          </span>
          <button
            type="button"
            onClick={logout}
            className="text-sm px-3 py-1.5 rounded-lg border border-border bg-transparent text-text-muted cursor-pointer hover:bg-bg-hover hover:text-text"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 px-6 py-8 max-w-[900px] w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
