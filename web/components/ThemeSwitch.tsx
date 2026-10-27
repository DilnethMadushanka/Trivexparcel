"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icons";

type Pref = "system" | "light" | "dark";
const OPTIONS: { k: Pref; label: string }[] = [
  { k: "system", label: "Use system theme" },
  { k: "light", label: "Light theme" },
  { k: "dark", label: "Dark theme" }
];

export function applyTheme(pref: Pref) {
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", pref);
  try { localStorage.setItem("hariyata.theme", pref); } catch {}
  window.dispatchEvent(new CustomEvent("hariyata-theme", { detail: pref }));
}

export function currentTheme(): Pref {
  try { const v = localStorage.getItem("hariyata.theme"); if (v === "light" || v === "dark") return v; } catch {}
  return "system";
}

export function ThemeSwitch() {
  const [pref, setPref] = useState<Pref>("system");
  useEffect(() => {
    setPref(currentTheme());
    const on = (e: Event) => setPref((e as CustomEvent<Pref>).detail);
    window.addEventListener("hariyata-theme", on);
    return () => window.removeEventListener("hariyata-theme", on);
  }, []);
  return (
    <div className="theme" role="group" aria-label="Theme">
      {OPTIONS.map(o => (
        <button key={o.k} type="button" aria-pressed={pref === o.k} aria-label={o.label} title={o.label} onClick={() => applyTheme(o.k)}>
          {Icon[o.k]}
        </button>
      ))}
    </div>
  );
}

/** Runs before paint so the page never flashes the wrong theme. */
export const themeBootScript = `try{var t=localStorage.getItem("hariyata.theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
