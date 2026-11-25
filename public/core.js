import { createNotifications } from "./notifications.js";
import { $, formatDateTime, showToast, state } from "./base.js";
import { stopChatPolling } from "./chat.js";

export const notificationCenter = createNotifications({ api, formatDateTime, onError: (error) => showToast(error.message) });

export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  // Abgelaufene Sitzung: Nach Ablauf der Sitzungsdauer (Standard 12 Stunden)
  // beantwortet der Worker jede Anfrage mit 401. Ohne Behandlung liefe jede
  // Aktion in eine unverstaendliche Fehlermeldung, deshalb hier zurueck zum
  // Login. Der Login-Aufruf selbst ist ausgenommen -- dort ist 401 die normale
  // Antwort auf falsche Zugangsdaten und gehoert ins Formular.
  if (response.status === 401 && !path.startsWith("/api/auth/")) {
    handleExpiredSession();
    throw new Error("Sitzung abgelaufen.");
  }

  if (!response.ok) {
    const error = new Error(data.error || "Anfrage fehlgeschlagen.");
    error.details = data.details;
    throw error;
  }
  return data;
}

/**
 * Bringt die Oberflaeche nach einer abgelaufenen Sitzung zurueck zum Login.
 *
 * `sessionExpired` verhindert, dass parallele Anfragen den Hinweis mehrfach
 * anzeigen -- beim Laden der Seite laufen mehrere Requests gleichzeitig.
 */
let sessionExpired = false;

export function clearSessionExpired() {
  sessionExpired = false;
}

export function handleExpiredSession() {
  if (sessionExpired) return;
  sessionExpired = true;

  // Ohne Stopp liefe das Chat-Polling im Hintergrund endlos gegen 401 weiter.
  stopChatPolling();
  notificationCenter.stop();

  $("#app-view").classList.add("hidden");
  $("#login-view").classList.remove("hidden");
  $("#chat-panel").classList.add("hidden");
  $("#chat-toggle").classList.add("hidden");
  document.body.classList.remove("chat-open");
  $("#login-message").textContent =
    "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.";
  $("#login-password").value = "";
  if (state.user) $("#login-username").value = state.user.username;
  state.user = null;
}
