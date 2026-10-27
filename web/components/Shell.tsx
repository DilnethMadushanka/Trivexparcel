"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth, useToast } from "./Providers";
import { DEMO } from "@/lib/client/demo";
import { Icon } from "./Icons";
import { ThemeSwitch, applyTheme, currentTheme } from "./ThemeSwitch";

type NavKey = "check" | "bulk" | "report" | "records" | "billing" | "admin" | "info";
const NAV: { href: string; key: NavKey; label: string; k: string; admin?: boolean; phone?: boolean }[] = [
  { href: "/check", key: "check", label: "Check", k: "c", phone: true },
  { href: "/bulk", key: "bulk", label: "Bulk", k: "b", phone: true },
  { href: "/report", key: "report", label: "Report", k: "r", phone: true },
  { href: "/records", key: "records", label: "Records", k: "m", phone: true },
  { href: "/billing", key: "billing", label: "Plan", k: "p", phone: true },
  { href: "/admin", key: "admin", label: "Admin", k: "a", admin: true, phone: true },
  { href: "/info", key: "info", label: "How it works", k: "i" }
];

function Usage() {
  const { me } = useAuth();
  if (!me) return null;
  if (me.checksLimit == null) return <div className="usage"><span>{me.planName} plan · unlimited checks</span></div>;
  const pct = Math.min(100, Math.round((me.checksUsed / me.checksLimit) * 100));
  return (
    <div className="usage">
      <span>{me.planName} plan · {me.checksUsed} of {me.checksLimit} checks used</span>
      <div className="usage-bar" role="img" aria-label={`${pct}% of monthly checks used`}><i className={pct >= 90 ? "warn" : ""} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function UserMenu() {
  const { me, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);
  if (!me) return null;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className="avatar-btn" aria-label="Account" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        {me.photo ? <img src={me.photo} alt="" referrerPolicy="no-referrer" /> : <span className="pill">{me.name.slice(0, 1)}</span>}
      </button>
      {open && (
        <div className="menu">
          <div className="me-chip"><div className="who-t"><b>{me.name}</b><span>{me.email}</span></div></div>
          <Usage />
          <ThemeSwitch />
          <Link href="/info" onClick={() => setOpen(false)} className="hint">How it works</Link>
          <button type="button" className="btn ghost" onClick={signOut}>Sign out</button>
        </div>
      )}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { me, signOut } = useAuth();
  const toast = useToast();
  const isAdmin = me?.role === "admin";
  const items = NAV.filter(n => !n.admin || isAdmin);
  const active = (href: string) => path === href || path.startsWith(href + "/");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) {
        if (e.key === "Escape") t.blur();
        return;
      }
      if (e.key === "/") { e.preventDefault(); if (path !== "/check") router.push("/check"); setTimeout(() => document.getElementById("checkInput")?.focus(), 60); return; }
      if (e.key === "t" || e.key === "T") {
        const order = ["system", "light", "dark"] as const;
        const next = order[(order.indexOf(currentTheme()) + 1) % 3];
        applyTheme(next); toast.show(next === "system" ? "Using system theme" : `${next[0].toUpperCase()}${next.slice(1)} theme`);
        return;
      }
      const n = items.find(i => i.k === e.key.toLowerCase());
      if (n) router.push(n.href);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [items, path, router, toast]);

  return (
    <>
      <div className="shell">
        <aside className="rail" aria-label="Sidebar">
          <Link className="logo" href="/check">
            <span className="logo-mark" aria-hidden="true">{Icon.logo}</span>
            <span style={{ display: "grid", lineHeight: 1.2 }}><span className="logo-word">Hariyata</span><span className="logo-by">by Trivex IT</span></span>
          </Link>
          <nav>
            {items.map(n => (
              <Link key={n.href} href={n.href} className="navlink" aria-current={active(n.href) ? "page" : undefined}>
                {Icon[n.key]}<span>{n.label}</span><kbd className="desk">{n.k.toUpperCase()}</kbd>
              </Link>
            ))}
          </nav>
          <div className="rail-foot">
            <Usage />
            {me && (
              <div className="me-chip">
                {me.photo && <img src={me.photo} alt="" referrerPolicy="no-referrer" />}
                <div className="who-t"><b>{me.name}</b><button type="button" className="linkbtn" onClick={signOut} style={{ justifySelf: "start" }}>Sign out</button></div>
              </div>
            )}
            <ThemeSwitch />
            <span><kbd className="desk">/</kbd> check · <kbd className="desk">T</kbd> theme</span>
          </div>
        </aside>

        <div style={{ minWidth: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr)", alignContent: "start" }}>
          <header className="topbar">
            <Link className="logo" href="/check"><span className="logo-mark" aria-hidden="true">{Icon.logo}</span><span className="logo-word">Hariyata</span></Link>
            <span style={{ marginLeft: "auto" }} />
            <UserMenu />
          </header>
          <main className={path.startsWith("/admin") ? "wide" : ""}>
            {DEMO && <div id="connNote">Demo mode: sample data, nothing is saved. You are signed in as an admin so you can try every page.</div>}
            {me?.status === "pending" && me.role !== "admin" && (
              <div id="connNote" className="warn">Your account is waiting for admin approval. You can check numbers now; your reports start counting once you&apos;re approved.</div>
            )}
            {me?.status === "blocked" && (
              <div id="connNote" className="warn">Your account is blocked by an admin. You can still check numbers, but you can&apos;t report.</div>
            )}
            {children}
          </main>
        </div>
      </div>

      <nav className="tabbar" aria-label="Sections">
        <div className="tabbar-in">
          {items.filter(n => n.phone).map(n => (
            <Link key={n.href} href={n.href} className="navlink" aria-current={active(n.href) ? "page" : undefined}>
              {Icon[n.key]}<span>{n.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
