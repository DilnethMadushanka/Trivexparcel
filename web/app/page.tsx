"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/Providers";
import { GoogleG, Icon } from "@/components/Icons";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { ResultCard } from "@/components/Verdict";
import { plans } from "@/lib/plans";
import type { CheckResult } from "@/lib/types";

const EXAMPLE: CheckResult = {
  number: "94771234567", pretty: "077 123 4567", mobile: true, level: "risk", score: 22,
  del: 1, rej: 3, fake: 1, sellers: 4, mine: null
};

export default function Landing() {
  const { ready, user, signIn, error } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (ready && user) router.replace("/check"); }, [ready, user, router]);

  const go = async () => { setBusy(true); await signIn(); setBusy(false); };

  return (
    <div className="landing">
      <header className="landing-top">
        <Link className="logo" href="/">
          <span className="logo-mark" aria-hidden="true">{Icon.logo}</span>
          <span style={{ display: "grid", lineHeight: 1.2 }}><span className="logo-word">Hariyata</span><span className="logo-by">by Trivex IT</span></span>
        </Link>
        <ThemeSwitch />
      </header>

      <main style={{ maxWidth: "none", padding: 0 }}>
        <section className="hero">
          <div className="hero-copy">
            <h1>Stop losing money on rejected COD parcels.</h1>
            <p className="lead">Check a customer&apos;s number before you ship. See how they handled cash-on-delivery orders from other Sri Lankan sellers, in one second.</p>
            <button type="button" className="google-btn" onClick={go} disabled={busy || (ready && !!user)}>
              <GoogleG />{busy ? "Opening Google…" : "Continue with Google"}
            </button>
            {error && <p className="err">{error}</p>}
            <div className="trust-row">
              <span><i />Free plan: {plans.free.checksPerMonth} checks a month</span>
              <span><i />Numbers stored only as secure hashes</span>
              <span><i />Built in Sri Lanka</span>
            </div>
          </div>
          <div className="hero-demo" aria-label="Example result">
            <span className="hint">Example result</span>
            <ResultCard r={EXAMPLE} fresh={true} onReport={() => {}} canReport={false} />
          </div>
        </section>

        <section className="features">
          <div className="feature"><h3>Check in one second</h3><p>Type any number format, or paste a whole WhatsApp order list and check every number at once.</p></div>
          <div className="feature"><h3>Report after delivery</h3><p>Mark each parcel delivered, rejected or fake. Every report makes the network sharper for everyone.</p></div>
          <div className="feature"><h3>Fair by design</h3><p>One seller&apos;s single report can never mark a customer as risky, and admins remove bad reporters.</p></div>
        </section>
      </main>

      <footer className="landing-foot">
        <span>© {new Date().getFullYear()} Trivex IT</span>
        <span>Starter Rs. {plans.starter.price.toLocaleString("en-US")} · Pro Rs. {plans.pro.price.toLocaleString("en-US")} a month</span>
      </footer>
    </div>
  );
}
