import { $, escapeHtml, isAdmin, safeParse, showToast, state } from "./base.js";
import { api } from "./core.js";
import { avatarTag, hydrateAvatars } from "./avatars.js";
import { setNavBadge } from "./sidebar.js";
import { loadBootstrap, switchView } from "./router.js";
import { renderSolutions } from "./solutions.js";
import { loadHistory } from "./history.js";
import { toggleFavorite } from "./settings.js";
import { copyTemplate } from "./templates.js";

export function populateCategories() {
  const options = state.categories
    .map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`)
    .join("");
  $("#proposal-category").innerHTML = options;
  $("#template-category-filter").innerHTML = `<option value="">Alle Kategorien</option>${options}`;
}

export function selectedProposalCategoryMode() {
  return document.querySelector("input[name='proposal-category-mode']:checked")?.value || "existing";
}

export function syncProposalCategoryMode() {
  const directEdit = $("#proposal-dialog").dataset.mode === "direct-edit";
  const mode = selectedProposalCategoryMode();
  const existingWrap = $("#proposal-category-existing-wrap");
  const newWrap = $("#proposal-category-new-wrap");
  const categorySelect = $("#proposal-category");
  const categoryName = $("#proposal-category-name");
  const modeInputs = [...document.querySelectorAll("input[name='proposal-category-mode']")];

  modeInputs.forEach((input) => {
    input.disabled = directEdit;
  });

  existingWrap.classList.toggle("hidden", !directEdit && mode !== "existing" ? true : false);
  newWrap.classList.toggle("hidden", directEdit || mode !== "new");
  categorySelect.required = directEdit || mode === "existing";
  categoryName.required = !directEdit && mode === "new";
}

export const CONTENT_TYPE_LABELS = { command: "Befehl", solution: "Lösung" };

export const PROPOSAL_STATUS_LABELS = {
  pending: "Offen",
  approved: "Genehmigt",
  rejected: "Abgelehnt",
  changes_requested: "Überarbeitung nötig",
  withdrawn: "Zurückgezogen",
  draft: "Entwurf",
};

/** Karte fuer einen Befehls- oder Loesungs-Vorschlag. */
export function contentProposalCard(proposal, view) {
  const payload = safeParse(proposal.payload_json);
  const label = CONTENT_TYPE_LABELS[proposal.content_type] || proposal.content_type;
  const status = PROPOSAL_STATUS_LABELS[proposal.status] || proposal.status;

  // Je nach Art unterscheiden sich die inhaltlichen Felder.
  const preview = proposal.content_type === "command"
    ? payload.command || ""
    : [payload.symptom, payload.solution].filter(Boolean).join("\n\n");

  return `
    <article class="card">
      <div class="card-header">
        <div>
          <h3>${escapeHtml(proposal.title)}</h3>
          <div class="badges">
            <span class="badge">${escapeHtml(label)}</span>
            <span class="badge">${escapeHtml(payload.category || "")}</span>
            <span class="badge">${escapeHtml(status)}</span>
            ${proposal.proposal_type === "update"
              ? '<span class="badge">Änderung</span>' : ""}
          </div>
        </div>
        ${view === "approvals"
          ? `<button class="primary" data-review-content="${proposal.id}">Prüfen</button>`
          : ""}
      </div>
      <p class="muted">Von ${escapeHtml(proposal.submitted_by_name || state.user.displayName)}</p>
      <div class="template-body">${escapeHtml(preview)}</div>
      ${proposal.reason ? `<p class="muted">Begründung: ${escapeHtml(proposal.reason)}</p>` : ""}
      ${proposal.review_note ? `<div class="notice">${escapeHtml(proposal.review_note)}</div>` : ""}
    </article>`;
}

export async function loadProposals(view) {
  // Unter "Meine Vorschlaege" zaehlt die eigene Sicht -- auch fuer Pruefer,
  // die sonst dort die Einreichungen aller Kollegen sehen wuerden.
  const scope = view === "approvals" ? "" : "?scope=mine";
  const [data, contentData] = await Promise.all([
    api(`/api/proposals${scope}`),
    api(`/api/content-proposals${scope}`),
  ]);
  state.proposals = data.proposals;
  state.contentProposals = contentData.proposals;
  const container = view === "approvals" ? $("#approvals-list") : $("#my-proposals-list");

  const contentCards = state.contentProposals
    .map((proposal) => contentProposalCard(proposal, view)).join("");

  container.innerHTML = (state.proposals.length + state.contentProposals.length)
    ? state.proposals.map((proposal) => `
      <article class="card">
        <div class="card-header">
          <div>
            <h3>${escapeHtml(proposal.title)}</h3>
            <div class="badges">
              <span class="badge">${escapeHtml(proposal.category_name || proposal.proposed_category_name || "Neue Kategorie")}</span>
              <span class="badge">${escapeHtml(proposal.status)}</span>
              ${proposal.duplicate_score >= .65
                ? `<span class="badge">Ähnlichkeit ${Math.round(proposal.duplicate_score * 100)} %</span>`
                : ""}
            </div>
          </div>
          ${view === "approvals" ? `<button class="primary" data-review-id="${proposal.id}">Prüfen</button>` : ""}
        </div>
        <p class="muted">Von ${escapeHtml(proposal.submitted_by_name || state.user.displayName)}</p>
        <div class="template-body">${escapeHtml(proposal.body)}</div>
        ${proposal.review_note ? `<div class="notice">${escapeHtml(proposal.review_note)}</div>` : ""}
      </article>`).join("") + contentCards
    : `<div class="panel muted">Keine Einträge vorhanden.</div>`;

  hydrateAvatars(container);

  if (view === "approvals") {
    const open = state.proposals.length + state.contentProposals.length;
    setNavBadge("#approval-count", open);
  }
}

export function openProposal(template = null) {
  $("#proposal-template-id").value = template?.id || "";
  $("#proposal-dialog").dataset.baseVersion = template?.version || "";
  $("#proposal-title").value = template?.title || "";
  $("#proposal-category").value = template?.category_id || state.categories[0]?.id || "";
  const directEdit = Boolean(isAdmin() && template);
  $("#proposal-dialog").dataset.mode = directEdit ? "direct-edit" : "proposal";
  document.querySelector("input[name='proposal-category-mode'][value='existing']").checked = true;
  $("#proposal-category-name").value = "";
  $("#proposal-category-color").value = "#4a7cff";
  $("#proposal-body").value = template?.body || "";
  $("#proposal-reason").value = "";
  $("#duplicate-result").classList.add("hidden");
  syncProposalCategoryMode();
  $("#proposal-dialog-title").textContent = directEdit
    ? "Vorlage direkt bearbeiten"
    : template
      ? "Änderung vorschlagen"
      : "Neue Vorlage vorschlagen";
  $("#proposal-form .btn-save").textContent = directEdit ? "Direkt speichern" : "Zur Freigabe einreichen";
  $("#check-duplicate-button").classList.toggle("hidden", directEdit);
  $("#proposal-dialog").showModal();
}

export async function checkDuplicate() {
  const result = await api("/api/proposals/check", {
    method: "POST",
    body: JSON.stringify({
      title: $("#proposal-title").value,
      body: $("#proposal-body").value,
      templateId: $("#proposal-template-id").value || null,
      baseVersion: Number($("#proposal-dialog").dataset.baseVersion) || null,
    }),
  });

  const box = $("#duplicate-result");
  box.classList.remove("hidden");
  box.textContent = result.duplicate.templateId
    ? `Ähnlichste Vorlage: „${result.duplicate.title}“ (${Math.round(result.duplicate.score * 100)} %)`
    : "Kein Duplikat gefunden.";
}

export async function submitProposal(event) {
  event.preventDefault();
  try {
    const categoryMode = selectedProposalCategoryMode();
    const payload = {
      templateId: $("#proposal-template-id").value || null,
      baseVersion: Number($("#proposal-dialog").dataset.baseVersion) || null,
      title: $("#proposal-title").value,
      categoryMode,
      categoryId: categoryMode === "existing" ? Number($("#proposal-category").value) : null,
      proposedCategoryName: categoryMode === "new" ? $("#proposal-category-name").value : null,
      proposedCategoryColor: categoryMode === "new" ? $("#proposal-category-color").value : null,
      body: $("#proposal-body").value,
      reason: $("#proposal-reason").value,
      note: $("#proposal-reason").value,
    };

    if ($("#proposal-dialog").dataset.mode === "direct-edit") {
      await api(`/api/templates/${$("#proposal-template-id").value}`, {
        method: "PUT",
        body: JSON.stringify({
          version: payload.baseVersion,
          title: payload.title,
          categoryId: Number($("#proposal-category").value),
          body: payload.body,
          note: payload.reason,
        }),
      });
      $("#proposal-dialog").close();
      showToast("Vorlage wurde direkt aktualisiert.");
      await loadBootstrap();
      return;
    }

    const data = await api("/api/proposals", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    $("#proposal-dialog").close();
    showToast(data.duplicate.score >= .65
      ? "Vorschlag eingereicht; mögliche Ähnlichkeit wurde markiert."
      : "Vorschlag wurde zur Freigabe eingereicht.");
    await switchView("proposals");
  } catch (error) {
    alert(error.message);
  }
}

export function openReview(proposalId) {
  const proposal = state.proposals.find((item) => item.id === proposalId);
  if (!proposal) return;

  $("#review-dialog").dataset.proposalId = String(proposalId);
  // Zuruecksetzen: sonst wuerde nach einem Inhalts-Vorschlag weiterhin dessen
  // Schnittstelle angesprochen.
  $("#review-dialog").dataset.kind = "template";
  $("#review-note").value = "";
  $("#review-content").innerHTML = `
    <h3>${escapeHtml(proposal.title)}</h3>
    <p class="muted proposal-author">
      ${avatarTag(proposal.submitted_by_name, 18)}Eingereicht von ${escapeHtml(proposal.submitted_by_name)}
    </p>
    <p class="muted">Kategorie: ${escapeHtml(proposal.category_name || proposal.proposed_category_name || "Nicht angegeben")}</p>
    ${proposal.duplicate_title
      ? `<div class="notice">Mögliche Ähnlichkeit mit „${escapeHtml(proposal.duplicate_title)}“: ${Math.round(proposal.duplicate_score * 100)} %</div>`
      : ""}
    <div class="template-body">${escapeHtml(proposal.body)}</div>`;
  $("#review-dialog").showModal();
}

/**
 * Pruefdialog fuer Befehls- und Loesungsvorschlaege.
 *
 * Nutzt denselben Dialog wie die Vorlagen. Welche Schnittstelle beim Bestaetigen
 * angesprochen wird, steht in `dataset.kind` -- ohne diese Unterscheidung liefe
 * die Entscheidung auf den falschen Endpunkt.
 */
export function openContentReview(proposalId) {
  const proposal = state.contentProposals.find((item) => item.id === proposalId);
  if (!proposal) return;

  const payload = safeParse(proposal.payload_json);
  const dialog = $("#review-dialog");
  dialog.dataset.proposalId = String(proposalId);
  dialog.dataset.kind = "content";
  $("#review-note").value = "";

  const rows = proposal.content_type === "command"
    ? [
      ["Bereich", payload.category],
      ["Umgebung", payload.shell],
      ["Risiko", payload.riskLevel],
      ["Befehl", payload.command],
      ["Beschreibung", payload.description],
    ]
    : [
      ["Bereich", payload.category],
      ["Dringlichkeit", payload.severity],
      ["Symptom", payload.symptom],
      ["Ursache", payload.cause],
      ["Lösungsweg", payload.solution],
    ];

  $("#review-content").innerHTML = `
    <h3>${escapeHtml(proposal.title)}</h3>
    <p class="muted">
      ${escapeHtml(CONTENT_TYPE_LABELS[proposal.content_type] || "")}
      · Eingereicht von ${escapeHtml(proposal.submitted_by_name)}
      ${proposal.proposal_type === "update" ? "· Änderung an bestehendem Eintrag" : ""}
    </p>
    ${proposal.reason
      ? `<p class="muted">Begründung: ${escapeHtml(proposal.reason)}</p>` : ""}
    ${rows.filter(([, value]) => value).map(([label, value]) => `
      <div class="solution-block">
        <span class="solution-label">${escapeHtml(label)}</span>
        <div class="template-body">${escapeHtml(String(value))}</div>
      </div>`).join("")}`;

  dialog.showModal();
}

export async function reviewProposal(action) {
  const dialog = $("#review-dialog");
  const proposalId = dialog.dataset.proposalId;

  // Befehle und Loesungen laufen ueber eine eigene Schnittstelle.
  if (dialog.dataset.kind === "content") {
    try {
      await api(`/api/content-proposals/${proposalId}/${action}`, {
        method: "POST",
        body: JSON.stringify({ note: $("#review-note").value }),
      });
      dialog.close();
      showToast("Vorschlag wurde bearbeitet.");
      await loadBootstrap();
      renderSolutions();
      await loadProposals("approvals");
    } catch (error) {
      alert(error.message);
    }
    return;
  }

  try {
    await api(`/api/proposals/${proposalId}/${action}`, {
      method: "POST",
      body: JSON.stringify({ note: $("#review-note").value }),
    });
    $("#review-dialog").close();
    showToast("Vorschlag wurde bearbeitet.");
    await loadBootstrap();
    await loadProposals("approvals");
  } catch (error) {
    alert(error.message);
  }
}

export async function deleteTemplate(templateId) {
  if (!confirm("Diese Vorlage wirklich löschen? Sie landet im Papierkorb und kann später wiederhergestellt werden.")) return;
  await api(`/api/templates/${templateId}`, {
    method: "DELETE",
    body: "{}",
  });
  showToast("Vorlage wurde gelöscht.");
  await loadBootstrap();
  if (state.activeView === "history") await loadHistory();
}

export async function deleteCommand(commandId) {
  if (!confirm("Diesen Befehl wirklich löschen?")) return;
  await api(`/api/commands/${commandId}`, {
    method: "DELETE",
    body: "{}",
  });
  showToast("Befehl wurde gelöscht.");
  await loadBootstrap();
}

document.querySelectorAll("input[name='proposal-category-mode']").forEach((input) => {
  input.addEventListener("change", syncProposalCategoryMode);
});

$("#new-proposal-button").addEventListener("click", () => openProposal());

$("#proposal-form").addEventListener("submit", submitProposal);

$("#check-duplicate-button").addEventListener("click", () => checkDuplicate().catch((error) => alert(error.message)));

$("#templates-list").addEventListener("click", (event) => {
  const favoriteButton = event.target.closest("[data-favorite-template]");
  if (favoriteButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite("template", Number(favoriteButton.dataset.favoriteTemplate))
      .catch((error) => alert(error.message));
    return;
  }

  const copyButton = event.target.closest("[data-copy-template]");
  if (copyButton) {
    if (copyButton.closest("summary")) event.preventDefault();
    const template = state.templates.find((item) => item.id === Number(copyButton.dataset.copyTemplate));
    if (template) copyTemplate(template).catch((error) => alert(error.message));
    return;
  }

  const editButton = event.target.closest("[data-edit-template]");
  if (editButton) {
    const template = state.templates.find((item) => item.id === Number(editButton.dataset.editTemplate));
    if (template) openProposal(template);
  }

  const deleteButton = event.target.closest("[data-delete-template]");
  if (deleteButton) {
    deleteTemplate(Number(deleteButton.dataset.deleteTemplate))
      .catch((error) => alert(error.message));
  }
});

$("#approvals-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-review-id]");
  if (button) {
    openReview(Number(button.dataset.reviewId));
    return;
  }

  const contentButton = event.target.closest("[data-review-content]");
  if (contentButton) openContentReview(Number(contentButton.dataset.reviewContent));
});

$("#review-form").addEventListener("click", (event) => {
  const button = event.target.closest("[data-review]");
  if (button) reviewProposal(button.dataset.review);
});
