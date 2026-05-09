import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { authGoogle } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Login() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);
  if (user) return null;

  const handleSuccess = async (res: CredentialResponse) => {
    if (!res.credential) return;
    try {
      const { token, user } = await authGoogle(res.credential);
      localStorage.setItem("token", token);
      setUser(user);
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      alert("Authentication failed. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-bg bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgb(var(--color-accent)/0.18)_0%,transparent_50%)]">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={
          theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
        }
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-bg-card text-text-muted hover:text-text hover:bg-bg-hover cursor-pointer shadow-sm"
      >
        {theme === "dark" ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
      <div className="w-full max-w-[400px] bg-bg-card border border-border rounded-card py-10 px-10 text-center shadow-2xl">
        <div className="text-5xl mb-2">🐘</div>
        <h1 className="text-2xl font-bold text-text m-0 mb-2">
          Learn PostgreSQL
        </h1>
        <p className="text-text-muted text-[0.95rem] leading-relaxed m-0 mb-8">
          Learn databases with hands-on lessons. Sign in with Google to get
          started.
        </p>
        <div className="flex justify-center [&>div]:mx-auto">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => alert("Google sign-in failed.")}
            useOneTap
            theme={theme === "dark" ? "filled_black" : "outline"}
            size="large"
            text="continue_with"
            shape="pill"
          />
        </div>
      </div>
    </div>
  );
}
