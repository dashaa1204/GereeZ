"use client";

import { useSyncExternalStore } from "react";

// Dark mode is stored as the `.dark` class on <html> (the `dark` variant in
// globals.css matches any `.dark` ancestor). A pre-paint inline script in the
// root layout applies the persisted value before hydration. We read that class
// as external state via useSyncExternalStore — no provider, no setState-in-effect,
// and no hydration mismatch (the server snapshot is always light).

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export function useTheme() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // ignore storage failures (private mode etc.)
    }
  };

  return { dark, toggle };
}
