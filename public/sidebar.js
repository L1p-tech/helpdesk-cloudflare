import { $, canReview } from "./base.js";
import { api } from "./core.js";

/* ============================================================
   Zaehler in der Seitenleiste
   ============================================================ */
export function setNavBadge(selector, count) {
  const badge = $(selector);
  if (!badge) return;
  badge.textContent = count > 99 ? "99+" : String(count || "");
  badge.classList.toggle("hidden", !count);
}

/** Unbestaetigte Uebergaben -- die naechste Schicht soll sie nicht uebersehen. */
export function updateHandoverBadge(handovers) {
  setNavBadge("#nav-badge-handover", handovers.filter((item) => !item.acknowledged_at).length);
}

export async function refreshApprovalCount() {
  if (!canReview()) return 0;
  const [templates, content] = await Promise.all([
    api("/api/proposals"),
    api("/api/content-proposals"),
  ]);
  const open = templates.proposals.length + content.proposals.length;
  setNavBadge("#approval-count", open);
  return open;
}

/* ============================================================
   Seitenleiste: einklappen (Desktop) und Schublade (Mobil)
   ============================================================ */
export const SIDEBAR_KEY = "helpdesk_sidebar_collapsed";

export function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  $("#sidebar-collapse").setAttribute("aria-pressed", String(collapsed));
  $("#sidebar-collapse").title = collapsed ? "Seitenleiste ausklappen" : "Seitenleiste einklappen";
  try {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  } catch {
    // Ohne Speicher gilt die Einstellung eben nur bis zum Neuladen.
  }
}

export function setSidebarOpen(open) {
  document.body.classList.toggle("sidebar-open", open);
  $("#nav-toggle").setAttribute("aria-expanded", String(open));
}

try {
  if (localStorage.getItem(SIDEBAR_KEY) === "1") document.body.classList.add("sidebar-collapsed");
} catch {
  // Kein Speicher -- Leiste bleibt ausgeklappt.
}

$("#sidebar-collapse").addEventListener("click", () => {
  setSidebarCollapsed(!document.body.classList.contains("sidebar-collapsed"));
});

$("#nav-toggle").addEventListener("click", () => {
  setSidebarOpen(!document.body.classList.contains("sidebar-open"));
});

$("#sidebar-backdrop").addEventListener("click", () => setSidebarOpen(false));
