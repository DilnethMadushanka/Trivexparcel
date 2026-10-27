"use client";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/Providers";
import { Shell } from "@/components/Shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { ready, user, me, error, refresh } = useAuth();
  const router = useRouter();

  useEffect(() => { if (ready && !user) router.replace("/"); }, [ready, user, router]);

  if (!ready || !user) return <div className="center-screen">Loading…</div>;
  if (!me) {
    return (
      <div className="center-screen">
        <div className="empty" style={{ maxWidth: 420 }}>
          <strong>{error ? "Couldn't load your account." : "Loading your account…"}</strong>
          {error && <><span>{error}</span><button type="button" className="btn" style={{ marginTop: 10 }} onClick={refresh}>Try again</button></>}
        </div>
      </div>
    );
  }
  return <Shell>{children}</Shell>;
}
