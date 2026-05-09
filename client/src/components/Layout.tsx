import { useEffect, useRef, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const navLink =
    "px-3 py-2 rounded-lg font-medium text-text-muted no-underline hover:text-text hover:bg-bg-hover";
  const navActive = "text-text bg-bg-hover";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isLesson = location.pathname.startsWith("/lesson/");

  return (
    <div
      className={`flex flex-col ${isLesson ? "lg:h-screen lg:overflow-hidden" : "min-h-screen"}`}
    >
      <header className="flex items-center gap-8 px-6 py-3 bg-bg-card border-b border-border sticky top-0 z-10 shrink-0">
        <Link
          to="/"
          className="flex items-center gap-2 font-bold text-[1.15rem] text-text no-underline hover:text-accent hover:no-underline"
        >
          <span className="text-2xl">🐘</span>
        </Link>
        <nav className="flex gap-2">
          <Link
            to="/"
            className={
              location.pathname === "/" ? `${navLink} ${navActive}` : navLink
            }
          >
            Lessons
          </Link>
          <Link
            to="/settings"
            className={
              location.pathname === "/settings"
                ? `${navLink} ${navActive}`
                : navLink
            }
          >
            Settings
          </Link>
        </nav>

        <div className="ml-auto relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl border border-transparent hover:border-border hover:bg-bg-hover cursor-pointer text-left"
          >
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
            <span className="text-sm text-text max-w-[160px] truncate hidden sm:inline">
              {user?.name ?? user?.email}
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`text-text-muted shrink-0 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] w-[220px] py-1.5 rounded-xl border border-border bg-bg-card shadow-lg z-20"
            >
              <div className="px-3 py-2 border-b border-border sm:hidden">
                <p className="text-xs text-text-muted m-0">Signed in as</p>
                <p className="text-sm text-text font-medium m-0 truncate">
                  {user?.name ?? user?.email}
                </p>
              </div>
              <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted m-0">
                Theme
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setTheme("light");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-text hover:bg-bg-hover border-0 bg-transparent cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    theme === "light"
                      ? "border-accent bg-accent/20"
                      : "border-border"
                  }`}
                >
                  {theme === "light" ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  ) : null}
                </span>
                Light
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setTheme("dark");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-text hover:bg-bg-hover border-0 bg-transparent cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    theme === "dark"
                      ? "border-accent bg-accent/20"
                      : "border-border"
                  }`}
                >
                  {theme === "dark" ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  ) : null}
                </span>
                Dark
              </button>
              <div className="my-1.5 border-t border-border" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full px-3 py-2 text-sm text-left text-error hover:bg-bg-hover border-0 bg-transparent cursor-pointer"
              >
                Sign out
              </button>
            </div>
          )}{" "}
        </div>
      </header>
      <main
        className={`flex-1 px-6 w-full mx-auto ${
          isLesson
            ? "max-w-[1400px] pt-4 pb-4 lg:pb-0 lg:min-h-0 lg:overflow-hidden"
            : "max-w-[900px] py-8"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
