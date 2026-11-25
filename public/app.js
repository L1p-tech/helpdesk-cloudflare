import { createTraining } from "./training.js";
import { $, $$, escapeHtml, showToast, state } from "./base.js";
import { api } from "./core.js";
import { copyCommand } from "./templates.js";
import { VIEW_ROUTES, loadBootstrap, switchView, viewFromLocation } from "./router.js";
import { jumpToGlossaryEntry } from "./glossary.js";
import { initializeChat } from "./chat.js";
import "./generator.js";

/*
 * Schulung: eigene Datei, die Anwendung reicht nur die Bausteine durch, die sie
 * braucht. Die verwendeten Funktionen sind Deklarationen weiter unten und
 * deshalb schon hier verfuegbar.
 */
export const training = createTraining({
  api,
  escapeHtml,
  showToast,
  getCommands: () => state.commands,
  copyCommand: (command) => copyCommand(command),
  openGlossary: async (begriff) => {
    await switchView("glossary");
    jumpToGlossaryEntry(begriff);
  },
  openView: (view) => switchView(view),
});

training.init();

async function initialize() {
  const me = await api("/api/auth/me");
  if (!me.user) return;

  $("#login-view").classList.add("hidden");
  $("#app-view").classList.remove("hidden");
  await loadBootstrap();
  initializeChat();
  await enterView();
}

/** Oeffnet den Bereich aus der Adresse und schreibt sie in Normalform zurueck. */
export async function enterView() {
  const view = viewFromLocation();
  // Die Adresse eines einzelnen Schulungsmoduls bleibt beim Neuladen erhalten.
  const keep = view === "training" && /^#\/schulung(\/|$)/.test(location.hash);
  if (!keep) history.replaceState(null, "", `#/${VIEW_ROUTES[view]}`);
  await switchView(view, { updateUrl: false });
}

$("#logout-button").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST", body: "{}" });
  location.reload();
});

$$("dialog").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

document.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-dialog]");
  if (!closeButton) return;
  const dialog = closeButton.closest("dialog");
  if (dialog?.open) dialog.close();
});

$("#assistant-body").addEventListener("keydown", (event) => {
  if (event.target.id !== "assistant-text" || event.key !== "Enter") return;
  event.preventDefault();
  document.querySelector("#assistant-matches .assistant-match")?.click();
});

$("#glossary-letters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-glossary-letter]");
  if (!button) return;
  document.getElementById(`glossar-buchstabe-${button.dataset.glossaryLetter}`)
    ?.scrollIntoView({ block: "start", behavior: "smooth" });
});

$("#shortcut-button").addEventListener("click", () => $("#shortcut-dialog").showModal());

initialize().catch((error) => {
  console.error(error);
  $("#login-message").textContent = "Anwendung konnte nicht geladen werden.";
});
