import { $, escapeHtml, formatDate, isAdmin, showToast, state } from "./base.js";
import { api } from "./core.js";

export function feedbackTypeLabel(type) {
  return type === "bug" ? "Bug" : "Verbesserung";
}

export function feedbackStatusLabel(status) {
  return {
    open: "Offen",
    planned: "Geplant",
    closed: "Erledigt",
  }[status] || status;
}

export function feedbackCard(item) {
  const isAdminView = isAdmin();

  return `
    <article class="card">
      <div class="card-header">
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          <div class="badges">
            <span class="badge">${feedbackTypeLabel(item.type)}</span>
            <span class="badge">${feedbackStatusLabel(item.status)}</span>
          </div>
        </div>
      </div>
      <div class="card-content">
        <p class="muted">Von ${escapeHtml(item.submitted_by_name)} · ${formatDate(item.created_at)}</p>
        <div class="template-body">${escapeHtml(item.message)}</div>
        ${item.admin_note ? `<div class="notice">Admin-Notiz: ${escapeHtml(item.admin_note)}</div>` : ""}
        ${isAdminView ? `
          <div class="feedback-admin-actions">
            <select data-feedback-status="${item.id}">
              <option value="open" ${item.status === "open" ? "selected" : ""}>Offen</option>
              <option value="planned" ${item.status === "planned" ? "selected" : ""}>Geplant</option>
              <option value="closed" ${item.status === "closed" ? "selected" : ""}>Erledigt</option>
            </select>
            <input data-feedback-note="${item.id}" value="${escapeHtml(item.admin_note || "")}" placeholder="Admin-Notiz">
            <button class="btn-primary" type="button" data-feedback-save="${item.id}">Speichern</button>
          </div>
        ` : ""}
      </div>
    </article>`;
}

export async function loadFeedback() {
  const data = await api("/api/feedback");
  state.feedbackItems = data.items;
  $("#feedback-list").innerHTML = state.feedbackItems.length
    ? state.feedbackItems.map(feedbackCard).join("")
    : '<div class="panel muted">Noch keine Vorschläge oder Bugs eingereicht.</div>';
}

export async function saveFeedbackAdmin(itemId) {
  const status = document.querySelector(`[data-feedback-status="${itemId}"]`)?.value;
  const adminNote = document.querySelector(`[data-feedback-note="${itemId}"]`)?.value ?? "";
  await api(`/api/feedback/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, adminNote }),
  });
  showToast("Vorschlag aktualisiert.");
  await loadFeedback();
}

$("#feedback-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        type: $("#feedback-type").value,
        title: $("#feedback-title").value,
        message: $("#feedback-message").value,
      }),
    });
    event.target.reset();
    $("#feedback-type").value = "bug";
    showToast("Vorschlag wurde eingereicht.");
    await loadFeedback();
  } catch (error) {
    alert(error.message);
  }
});

$("#feedback-refresh-button").addEventListener("click", () => {
  loadFeedback().catch((error) => alert(error.message));
});

$("#feedback-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-feedback-save]");
  if (!button) return;
  saveFeedbackAdmin(Number(button.dataset.feedbackSave))
    .catch((error) => alert(error.message));
});
