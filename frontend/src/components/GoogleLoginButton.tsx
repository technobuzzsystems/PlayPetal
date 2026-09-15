"use client";

import React, { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

declare global {
  interface Window {
    google?: any;
  }
}

export default function GoogleLoginButton() {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { refreshSession } = useAuth();
  const router = useRouter();

  const clientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "187700950056-nnjsjv31g3icca81cin2rgj22kcgdqb0.apps.googleusercontent.com";

  const handleCredentialResponse = async (response: { credential?: string }) => {
    if (!response.credential) {
      setError("Google authentication cancelled or credential not received.");
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/customers/google-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ credential: response.credential }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Google sign-in could not complete. Please try again.");
        setIsAuthenticating(false);
        return;
      }

      // 6. GOOGLE SESSION VERIFICATION: Must verify session via /api/customers/me = 200
      const verifiedCustomer = await refreshSession();
      if (!verifiedCustomer) {
        setError("Google sign-in could not complete. Please try again.");
        setIsAuthenticating(false);
        return;
      }

      if (!verifiedCustomer.hasAddress) {
        router.push("/profile?tab=addresses&required=true");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      console.error("Google authentication network error:", err);
      setError("Google sign-in could not complete. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const initGoogleAuth = () => {
    if (typeof window === "undefined" || !window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
      });

      const container = document.getElementById("googleGisButtonDiv");
      if (container) {
        container.innerHTML = "";
        window.google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          width: 300,
          shape: "pill",
          text: "continue_with",
        });
      }
    } catch (err: any) {
      console.error("Failed to initialize Google Identity Services:", err);
    }
  };

  useEffect(() => {
    if (scriptLoaded || (typeof window !== "undefined" && window.google?.accounts?.id)) {
      initGoogleAuth();
    }
  }, [scriptLoaded]);

  const handleGoogleDevLogin = async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/customers/google-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ credential: "dev_google_token" }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Google sign-in could not complete. Please try again.");
        setIsAuthenticating(false);
        return;
      }

      // Verify authoritative backend session
      const verifiedCustomer = await refreshSession();
      if (!verifiedCustomer) {
        setError("Google sign-in could not complete. Please try again.");
        setIsAuthenticating(false);
        return;
      }

      if (!verifiedCustomer.hasAddress) {
        router.push("/profile?tab=addresses&required=true");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      console.error("Dev Google authentication network error:", err);
      setError("Google sign-in could not complete. Please try again.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleManualPrompt = () => {
    if (typeof window !== "undefined" && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      handleGoogleDevLogin();
    }
  };

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="lazyOnload"
        onLoad={() => {
          setScriptLoaded(true);
          initGoogleAuth();
        }}
      />

      <div className="w-full flex flex-col items-center justify-center my-3">
        {error && (
          <div className="mb-3 text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 text-center w-full">
            {error}
          </div>
        )}

        {/* GIS Official Button Container */}
        <div id="googleGisButtonDiv" className="flex justify-center min-h-[44px] w-full" />

        {/* Fallback / Dev Mode Quick Action */}
        <button
          type="button"
          onClick={handleGoogleDevLogin}
          className="mt-2.5 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full text-xs font-bold text-[#202124] flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[44px]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue as Google User (Test/Dev)</span>
        </button>

        <p className="mt-2 text-[10px] text-slate-400 font-medium text-center">
          Note: For official Google Sign-In, add <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">http://localhost:3000</code> to Authorized JavaScript Origins in your Google Cloud Console.
        </p>
      </div>
    </>
  );
}
