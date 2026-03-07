import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { authGoogle } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

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
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(56,139,253,0.25)_0%,transparent_50%)]">
      <div className="w-full max-w-[400px] bg-bg-card border border-border rounded-card py-10 px-10 text-center shadow-2xl">
        <div className="text-5xl mb-2">🐘</div>
        <h1 className="text-2xl font-bold text-text m-0 mb-2">Learn PostgreSQL</h1>
        <p className="text-text-muted text-[0.95rem] leading-relaxed m-0 mb-8">
          Learn databases with hands-on lessons. Sign in with Google to get started.
        </p>
        <div className="flex justify-center [&>div]:mx-auto">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => alert("Google sign-in failed.")}
            useOneTap
            theme="filled_black"
            size="large"
            text="continue_with"
            shape="pill"
          />
        </div>
      </div>
    </div>
  );
}
