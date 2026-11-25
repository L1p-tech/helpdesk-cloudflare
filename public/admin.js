import { $, escapeHtml, formatDateTime, roleLabel, showToast, state } from "./base.js";
import { api } from "./core.js";

export async function loadUsers() {
  const data = await api("/api/users");
  $("#users-list").innerHTML = data.users.map((user) => `
    <div class="user-row">
      <div class="user-row-main">
        <strong>${escapeHtml(user.display_name)}</strong>
        <span>${escapeHtml(user.username)}</span>
      </div>
      <span>${roleLabel(user.role)}</span>
      <span>${user.password_reset_required ? "Passwort erneuern" : user.active ? "Aktiv" : "Gesperrt"}</span>
      <div class="user-row-actions">
        <button class="btn-ghost" type="button" data-user-action="edit" data-user-id="${user.id}" data-user-name="${escapeHtml(user.display_name)}" data-user-login="${escapeHtml(user.username)}" data-user-role="${user.role}">
          Bearbeiten
        </button>
        <button class="btn-ghost" type="button" data-user-action="reset-password" data-user-id="${user.id}" data-user-name="${escapeHtml(user.display_name)}">
          Passwort
        </button>
        ${user.id === state.user?.id ? "" : `
        <button class="btn-ghost danger-button" type="button" data-user-action="delete" data-user-id="${user.id}" data-user-name="${escapeHtml(user.display_name)}">
          Löschen
        </button>`}
      </div>
    </div>`).join("");
}

// Rohwerte aus dem Protokoll in lesbare Bezeichnungen uebersetzen.
export const AUDIT_ACTIONS = {
  create: "angelegt",
  update: "geändert",
  delete: "archiviert",
  purge: "endgültig gelöscht",
  restore: "wiederhergestellt",
  approve: "genehmigt",
  reject: "abgelehnt",
  changes: "Überarbeitung angefordert",
  submit: "eingereicht",
  login: "angemeldet",
  logout: "abgemeldet",
  setup_admin: "Ersteinrichtung",
};

export const AUDIT_ENTITIES = {
  template: "Vorlage",
  template_proposal: "Vorschlag",
  template_version: "Vorlagen-Version",
  command: "Befehl",
  user: "Benutzer",
  category: "Kategorie",
  feedback_item: "Feedback",
  session: "Sitzung",
};

/** Formuliert einen Protokolleintrag als lesbaren Satz. */
export function auditSummary(entry) {
  const action = AUDIT_ACTIONS[entry.action] || entry.action;
  const entity = AUDIT_ENTITIES[entry.entity_type] || entry.entity_type;

  if (entry.entity_type === "session") {
    return action === "angemeldet" ? "hat sich angemeldet" : "hat sich abgemeldet";
  }

  let detail = "";
  try {
    const details = JSON.parse(entry.details_json || "{}");
    if (details.title) detail = ` „${details.title}“`;
    else if (details.role) detail = ` (${roleLabel(details.role)})`;
  } catch {
    detail = "";
  }

  const reference = entry.entity_id ? ` #${entry.entity_id}` : "";
  return `hat ${entity}${detail || reference} ${action}`;
}

export async function loadAudit() {
  const data = await api("/api/audit");
  state.auditEntries = data.entries;
  renderAudit();
}

export function renderAudit() {
  const filter = $("#audit-filter")?.value || "";
  const entries = (state.auditEntries || []).filter(
    (entry) => !filter || entry.entity_type === filter,
  );

  $("#audit-list").innerHTML = entries.length
    ? entries.map((entry) => `
      <div class="audit-row">
        <span class="audit-action audit-${escapeHtml(entry.action)}">${escapeHtml(AUDIT_ACTIONS[entry.action] || entry.action)}</span>
        <div class="audit-main">
          <strong>${escapeHtml(entry.user_name)}</strong> ${escapeHtml(auditSummary(entry))}
        </div>
        <span class="audit-time">${formatDateTime(entry.created_at)}</span>
      </div>`).join("")
    : '<div class="history-empty">Keine Einträge für diesen Filter.</div>';
}

export async function updateUserAdmin(userId, payload) {
  await api(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  await loadUsers();
}

/**
 * Oeffnet den Dialog zum Bearbeiten von Anzeigename und Rolle.
 *
 * Beim eigenen Konto ist die Rollenauswahl gesperrt: Wer sich selbst die
 * Adminrechte entzieht, verliert den Zugang zur Benutzerverwaltung. Der Worker
 * lehnt das ohnehin ab -- hier wird es nur sichtbar gemacht, statt den Fehler
 * erst nach dem Speichern zu zeigen.
 */
export function openUserDialog(button) {
  const dialog = $("#user-dialog");
  const isSelf = Number(button.dataset.userId) === state.user?.id;

  dialog.dataset.userId = button.dataset.userId;
  $("#user-edit-username").textContent = button.dataset.userLogin || "";
  $("#user-edit-name").value = button.dataset.userName || "";
  $("#user-edit-role").value = button.dataset.userRole || "employee";
  $("#user-edit-role").disabled = isSelf;
  $("#user-edit-self-hint").hidden = !isSelf;

  dialog.showModal();
}

export async function submitUserEdit(event) {
  event.preventDefault();

  const dialog = $("#user-dialog");
  const userId = Number(dialog.dataset.userId);
  const displayName = $("#user-edit-name").value.trim();

  if (!displayName) {
    showToast("Bitte einen Anzeigenamen eintragen.");
    return;
  }

  // Beim eigenen Konto bleibt das Rollenfeld gesperrt und wird nicht gesendet.
  const payload = { displayName };
  if (!$("#user-edit-role").disabled) {
    payload.role = $("#user-edit-role").value;
  }

  try {
    await updateUserAdmin(userId, payload);
    dialog.close();
    showToast("Benutzer aktualisiert.");
  } catch (error) {
    showToast(error.message);
  }
}

export async function handleUsersListClick(event) {
  const button = event.target.closest("[data-user-action]");
  if (!button) return;

  const userId = Number(button.dataset.userId);
  const userName = button.dataset.userName || "dieser Benutzer";
  const action = button.dataset.userAction;

  if (!userId || !action) return;

  if (action === "edit") {
    openUserDialog(button);
    return;
  }

  if (action === "reset-password") {
    const password = window.prompt(`Neues Passwort für ${userName}:`);
    if (password === null) return;
    if (password.trim().length < 12) {
      showToast("Das Passwort muss mindestens 12 Zeichen lang sein.");
      return;
    }

    await updateUserAdmin(userId, { password: password.trim() });
    showToast("Passwort aktualisiert.");
    return;
  }

  if (action === "delete") {
    // Das Loeschen laesst sich nicht rueckgaengig machen, deshalb wird der
    // Name ausgeschrieben und der Verbleib der Inhalte benannt -- die Vorlagen
    // und Befehle des Kontos bleiben erhalten und werden nur entkoppelt.
    const confirmed = confirm(
      `Benutzer „${userName}" wirklich endgültig löschen?\n\n` +
      "Das Konto und alle zugehörigen Sitzungen werden entfernt. " +
      "Erstellte Vorlagen und Befehle bleiben erhalten.",
    );
    if (!confirmed) return;

    await api(`/api/users/${userId}`, { method: "DELETE" });
    await loadUsers();
    showToast(`Benutzer „${userName}" wurde gelöscht.`);
  }
}

$("#users-list").addEventListener("click", (event) => {
  handleUsersListClick(event).catch((error) => alert(error.message));
});

// Achtung: "#user-form" ist das Formular zum Anlegen neuer Benutzer im
// Admin-Bereich. Der Bearbeiten-Dialog heisst bewusst anders, sonst wuerde
// $() nur das erste Element mit der ID finden.
$("#user-edit-form").addEventListener("submit", submitUserEdit);

$("#audit-filter").addEventListener("change", renderAudit);

$("#audit-refresh").addEventListener("click", () => {
  loadAudit().catch((error) => alert(error.message));
});

$("#user-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username: $("#user-username").value,
        displayName: $("#user-display-name").value,
        password: $("#user-password").value,
        role: $("#user-role").value,
      }),
    });
    event.target.reset();
    showToast("Benutzer angelegt.");
    await loadUsers();
  } catch (error) {
    alert(error.message);
  }
});
