import { $, canReview, escapeHtml, formatDate, isAdmin, showToast } from "./base.js";
import { api } from "./core.js";
import { loadBootstrap } from "./router.js";

export function historyRow(item, type) {
  const canRestore = canReview();
  const subtitle = type === "version"
    ? `Version ${item.version} · ${formatDate(item.created_at)} · ${escapeHtml(item.changed_by_name || "")}`
    : `Archiviert am ${formatDate(item.updated_at)} · Version ${item.version}`;

  return `
    <article class="history-row">
      <div>
        <h4>${escapeHtml(item.title)}</h4>
        <p>${subtitle}</p>
      </div>
      <div class="history-actions">
        ${canRestore
        ? `<button type="button" data-restore-${type}="${item.id}">Wiederherstellen</button>`
        : ""}
        ${isAdmin()
        ? `<button class="danger-button" type="button" data-purge-${type}="${item.id}">${
          type === "template" ? "Endgültig löschen" : "Version löschen"
        }</button>`
        : ""}
      </div>
    </article>
  `;
}

export async function loadHistory() {
  const data = await api("/api/history");
  $("#template-version-list").innerHTML = data.versions.length
    ? data.versions.map((item) => historyRow(item, "version")).join("")
    : '<div class="history-empty">Noch keine älteren Vorlagen-Versionen vorhanden.</div>';

  $("#template-trash-list").innerHTML = data.trash.length
    ? data.trash.map((item) => historyRow(item, "template")).join("")
    : '<div class="history-empty">Der Papierkorb ist leer.</div>';
}

export async function restoreHistoryItem(type, id) {
  if (!confirm("Diesen Stand wirklich wiederherstellen?")) return;
  await api(`/api/history/${type}/${id}/restore`, {
    method: "POST",
    body: "{}",
  });
  showToast("Vorlage wurde wiederhergestellt.");
  await loadBootstrap();
  await loadHistory();
}

/**
 * Entfernt eine archivierte Vorlage endgueltig.
 *
 * Der Titel steht in der Rueckfrage, damit klar ist, welche Vorlage betroffen
 * ist -- der Vorgang laesst sich nicht rueckgaengig machen.
 */
/**
 * Entfernt einen einzelnen Eintrag aus der Versionshistorie.
 *
 * Betroffen ist nur der alte Stand -- die Vorlage selbst bleibt unveraendert.
 * Das steht auch in der Rueckfrage, damit die Tragweite klar ist.
 */
export async function purgeVersion(id) {
  const row = $(`[data-purge-version="${id}"]`)?.closest(".history-row");
  const title = row?.querySelector("h4")?.textContent ?? "Dieser Stand";

  if (!confirm(`Diese Version von „${title}“ endgültig löschen?\n\nDer alte Stand wird unwiderruflich aus der Historie entfernt. Die Vorlage selbst bleibt unverändert.`)) {
    return;
  }

  await api(`/api/history/version/${id}`, { method: "DELETE" });
  showToast("Version wurde gelöscht.");
  await loadHistory();
}

export async function purgeTemplate(id) {
  const title = $(`[data-purge-template="${id}"]`)
    ?.closest(".history-row")
    ?.querySelector("h4")
    ?.textContent ?? "Diese Vorlage";

  if (!confirm(`„${title}“ endgültig löschen?\n\nDie Vorlage und ihre Versionshistorie werden unwiderruflich entfernt.`)) {
    return;
  }

  await api(`/api/history/template/${id}`, { method: "DELETE" });
  showToast("Vorlage wurde endgültig gelöscht.");
  await loadHistory();
}

$("#history-refresh-button").addEventListener("click", () => {
  loadHistory().catch((error) => alert(error.message));
});

$("#template-version-list").addEventListener("click", (event) => {
  const restoreButton = event.target.closest("[data-restore-version]");
  if (restoreButton) {
    restoreHistoryItem("version", Number(restoreButton.dataset.restoreVersion))
      .catch((error) => alert(error.message));
    return;
  }

  const purgeButton = event.target.closest("[data-purge-version]");
  if (purgeButton) {
    purgeVersion(Number(purgeButton.dataset.purgeVersion))
      .catch((error) => alert(error.message));
  }
});

$("#template-trash-list").addEventListener("click", (event) => {
  const restoreButton = event.target.closest("[data-restore-template]");
  if (restoreButton) {
    restoreHistoryItem("template", Number(restoreButton.dataset.restoreTemplate))
      .catch((error) => alert(error.message));
    return;
  }

  const purgeButton = event.target.closest("[data-purge-template]");
  if (purgeButton) {
    purgeTemplate(Number(purgeButton.dataset.purgeTemplate))
      .catch((error) => alert(error.message));
  }
});
