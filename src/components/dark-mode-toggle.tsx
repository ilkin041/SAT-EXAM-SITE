"use client";

import { useEffect, useState } from "react";

/**
 * Persists a `dark` class on <html>. The test interface uses fixed Bluebook
 * colors and ignores the theme, but everything else (dashboard, admin, marketing)
 * respects it.
 */
export function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  // Initial hydration: read from localStorage and from the current class.
  useEffect(() => {
    const ls = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const initial =
      ls === "dark" ||
      (ls == null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="rounded-md border border-input px-2.5 py-1.5 text-sm hover:bg-accent"
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
