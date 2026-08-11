"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("cumplimiento-theme", next);
    setTheme(next);
  }

  return <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label={theme === "light" ? "Activar modo oscuro" : "Activar modo claro"} aria-pressed={theme === "dark"}>
    <span aria-hidden="true">{theme === "light" ? "☀" : "☾"}</span>
    <b>{theme === "light" ? "MODO CLARO" : "MODO OSCURO"}</b>
  </button>;
}
