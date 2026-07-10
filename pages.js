(() => {
  "use strict";
  const root = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  const year = document.getElementById("year");
  const key = "rh_theme_v2";

  function readTheme() {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function applyTheme(value) {
    const theme = value === "dark" ? "dark" : "light";
    root.dataset.theme = theme;
    if (toggle) {
      toggle.textContent = theme === "dark" ? "☀" : "☾";
      toggle.setAttribute("aria-pressed", String(theme === "dark"));
      toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
    try {
      localStorage.setItem(key, theme);
    } catch {}
  }

  const preferred = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(readTheme() || preferred);
  if (year) year.textContent = new Date().getFullYear();
  toggle?.addEventListener("click", () => applyTheme(root.dataset.theme === "dark" ? "light" : "dark"));
})();