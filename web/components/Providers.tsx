"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut, type User } from "firebase/auth";
import { clientAuth, firebaseConfigured, googleProvider } from "@/lib/client/firebase";
import { api } from "@/lib/client/api";
import { DEMO } from "@/lib/client/demo";
import type { Me } from "@/lib/types";

export interface PayConfig { card: boolean; bank: string; ezcash: string }

interface AuthState {
  ready: boolean;
  user: User | null;
  me: Me | null;
  pay: PayConfig | null;
  error: string;
  setMe: (m: Me) => void;
  refresh: () => Promise<void>;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);
export const useAuth = () => { const c = useContext(AuthCtx); if (!c) throw new Error("useAuth outside provider"); return c; };

interface ToastState { show: (msg: string, undo?: () => Promise<void> | void) => void }
const ToastCtx = createContext<ToastState | null>(null);
export const useToast = () => { const c = useContext(ToastCtx); if (!c) throw new Error("useToast outside provider"); return c; };

export function Providers({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [pay, setPay] = useState<PayConfig | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ me: Me; payments: PayConfig }>("/api/me");
      setMe(r.me); setPay(r.payments); setError("");
    } catch (e) { setError((e as Error).message); }
  }, []);

  useEffect(() => {
    if (DEMO) {
      let signedIn = true;
      try { signedIn = localStorage.getItem("hariyata.demoOut") !== "1"; } catch {}
      if (signedIn) { setUser({ uid: "demo-you" } as User); refresh().then(() => setReady(true)); } else setReady(true);
      return;
    }
    if (!firebaseConfigured) { setError("Firebase isn't configured yet. Add the NEXT_PUBLIC_FIREBASE_* settings."); setReady(true); return; }
    return onAuthStateChanged(clientAuth(), async (u) => {
      setUser(u);
      if (u) await refresh(); else { setMe(null); setPay(null); }
      setReady(true);
    });
  }, [refresh]);

  const signIn = useCallback(async () => {
    setError("");
    if (DEMO) { try { localStorage.removeItem("hariyata.demoOut"); } catch {} setUser({ uid: "demo-you" } as User); await refresh(); return; }
    try { await signInWithPopup(clientAuth(), googleProvider()); }
    catch (e) {
      const code = (e as { code?: string }).code || "";
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        await signInWithRedirect(clientAuth(), googleProvider());
      } else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError("Google sign-in didn't work. Try again.");
      }
    }
  }, [refresh]);

  const signOut = useCallback(async () => {
    if (DEMO) { try { localStorage.setItem("hariyata.demoOut", "1"); } catch {} setUser(null); setMe(null); return; }
    await fbSignOut(clientAuth());
  }, []);

  // ---- toast ----
  const [toast, setToast] = useState<{ msg: string; undo?: () => Promise<void> | void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string, undo?: () => Promise<void> | void) => {
    setToast({ msg, undo });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), undo ? 7000 : 3500);
  }, []);
  const doUndo = async () => {
    const u = toast?.undo; setToast(null);
    if (u) { try { await u(); show("Undone"); } catch { show("Couldn't undo. Try again."); } }
  };

  return (
    <AuthCtx.Provider value={{ ready, user, me, pay, error, setMe, refresh, signIn, signOut }}>
      <ToastCtx.Provider value={{ show }}>
        {children}
        {toast && (
          <div className="toast" role="status" aria-live="polite">
            <span>{toast.msg}</span>
            {toast.undo && <button type="button" onClick={doUndo}>Undo</button>}
          </div>
        )}
      </ToastCtx.Provider>
    </AuthCtx.Provider>
  );
}
