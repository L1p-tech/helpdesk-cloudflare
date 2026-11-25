import { $, escapeAttribute, escapeHtml, isAdmin, showToast } from "./base.js";
import { api } from "./core.js";

/* ============================================================
   IT-Meldungen
   ============================================================
   Die Feeds holt der Worker und legt sie in D1 ab -- ein Abruf direkt aus dem
   Browser scheitert an CORS, ausserdem blieben so die IP-Adressen der
   Mitarbeiter bei den Anbietern haengen.
*/
export const newsState = { items: [], feeds: [] };

/*
 * Farbe je Nachrichtenquelle. Vergeben wird der Reihe nach in der
 * Anlagereihenfolge (ID) statt per Namens-Hash: Bei einer Handvoll Quellen
 * teilten sich sonst schnell zwei dieselbe Farbe. Neue Quellen bekommen die
 * naechste freie Farbe, bestehende behalten ihre.
 */
export const NEWS_SOURCE_COLORS = [
  "#38bdf8", "#f59e0b", "#34d399", "#c084fc", "#f87171",
  "#fbbf24", "#2dd4bf", "#f472b6", "#a3e635", "#818cf8",
  "#fb923c", "#22d3ee",
];

export function newsSourceColor(name, feeds = newsState.feeds) {
  const sorted = [...feeds].sort((a, b) => Number(a.id) - Number(b.id));
  const index = sorted.findIndex((feed) => feed.name === name);
  if (index >= 0) return NEWS_SOURCE_COLORS[index % NEWS_SOURCE_COLORS.length];
  // Quelle unbekannt (z. B. Liste noch nicht geladen): stabil aus dem Namen.
  let hash = 0;
  for (const char of String(name)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return NEWS_SOURCE_COLORS[hash % NEWS_SOURCE_COLORS.length];
}

export async function loadNews(force = false) {
  $("#news-status").textContent = force
    ? "Quellen werden abgerufen…"
    : "Meldungen werden geladen…";

  const data = await api(`/api/news${force ? "?refresh=1" : ""}`);
  newsState.items = data.items ?? [];
  newsState.feeds = data.feeds ?? [];

  populateNewsFilters();
  renderNews();
}

/** Fuellt die Auswahllisten aus dem tatsaechlichen Bestand. */
export function populateNewsFilters() {
  const categorySelect = $("#news-category");
  const feedSelect = $("#news-feed");
  const previousCategory = categorySelect.value;
  const previousFeed = feedSelect.value;

  const categories = [...new Set(newsState.items.map((item) => item.category))].sort();
  const feeds = [...new Set(newsState.items.map((item) => item.feed_name))].sort();

  categorySelect.innerHTML = '<option value="">Alle Kategorien</option>'
    + categories.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  feedSelect.innerHTML = '<option value="">Alle Quellen</option>'
    + feeds.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");

  // Auswahl beibehalten, solange sie noch existiert.
  if (categories.includes(previousCategory)) categorySelect.value = previousCategory;
  if (feeds.includes(previousFeed)) feedSelect.value = previousFeed;
}

export function renderNews() {
  const category = $("#news-category").value;
  const feed = $("#news-feed").value;
  const search = $("#news-search").value.trim().toLowerCase();

  const visible = newsState.items.filter((item) => {
    if (category && item.category !== category) return false;
    if (feed && item.feed_name !== feed) return false;
    if (!search) return true;
    return `${item.title} ${item.summary}`.toLowerCase().includes(search);
  });

  const failed = newsState.feeds.filter(
    (source) => source.active && String(source.last_status ?? "").startsWith("Fehler"),
  );

  // Ausgefallene Quellen benennen, statt sie stillschweigend fehlen zu lassen.
  $("#news-status").textContent = [
    `${visible.length} von ${newsState.items.length} Meldungen`,
    failed.length ? `${failed.length} Quelle(n) nicht erreichbar: ${failed.map((f) => f.name).join(", ")}` : "",
  ].filter(Boolean).join(" · ");

  if (!visible.length) {
    $("#news-list").innerHTML = '<p class="panel-hint">Keine Meldungen gefunden.</p>';
    return;
  }

  $("#news-list").innerHTML = visible.map((item) => `
    <article class="news-item" style="--source-color:${newsSourceColor(item.feed_name)}">
      <div class="news-meta">
        <span class="news-source">${escapeHtml(item.feed_name)}</span>
        <span class="news-category">${escapeHtml(item.category)}</span>
        <span>${escapeHtml(formatNewsDate(item.published_at))}</span>
      </div>
      <h4 class="news-title">
        <a href="${escapeAttribute(item.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a>
      </h4>
      ${item.summary ? `<p class="news-summary">${escapeHtml(item.summary)}</p>` : ""}
    </article>`).join("");
}

export function formatNewsDate(value) {
  if (!value) return "";
  const normalized = String(value).replace(" ", "T");
  const date = new Date(/[Z+]|-\d{2}:\d{2}$/.test(normalized) ? normalized : `${normalized}Z`);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Quellenverwaltung im Admin-Bereich. */
export async function loadNewsFeeds() {
  const data = await api("/api/news");
  newsState.feeds = data.feeds ?? [];

  $("#news-feeds-list").innerHTML = newsState.feeds.map((feed) => `
    <div class="news-feed-row" style="--source-color:${newsSourceColor(feed.name)}">
      <div class="news-feed-main">
        <strong class="news-feed-name">${escapeHtml(feed.name)}</strong>
        <span class="news-feed-url">${escapeHtml(feed.url)}</span>
      </div>
      <span>${escapeHtml(feed.category)}</span>
      <span class="${String(feed.last_status ?? "").startsWith("Fehler") ? "news-feed-error" : ""}">
        ${escapeHtml(feed.last_status ?? "noch nicht abgerufen")}
      </span>
      <div class="news-feed-actions">
        <button class="btn-ghost" type="button" data-feed-toggle="${feed.id}" data-feed-active="${feed.active}">
          ${feed.active ? "Deaktivieren" : "Aktivieren"}
        </button>
        <button class="btn-ghost danger-button" type="button" data-feed-delete="${feed.id}" data-feed-name="${escapeHtml(feed.name)}">
          Entfernen
        </button>
      </div>
    </div>`).join("") || '<p class="panel-hint">Noch keine Quellen eingetragen.</p>';
}

$("#news-category").addEventListener("change", renderNews);

$("#news-feed").addEventListener("change", renderNews);

$("#news-search").addEventListener("input", renderNews);

$("#news-refresh").addEventListener("click", () => {
  // Nur Admins loesen serverseitig einen echten Neuabruf aus; fuer alle
  // anderen laedt der Klick den Zwischenspeicher neu.
  loadNews(isAdmin()).catch((error) => alert(error.message));
});

$("#news-feed-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await api("/api/news/feeds", {
      method: "POST",
      body: JSON.stringify({
        name: $("#news-feed-name").value,
        url: $("#news-feed-url").value,
        category: $("#news-feed-category").value || "Allgemein",
      }),
    });
    $("#news-feed-name").value = "";
    $("#news-feed-url").value = "";
    showToast("Quelle hinzugefügt.");
    await loadNewsFeeds();
  } catch (error) {
    alert(error.message);
  }
});

$("#news-feeds-list").addEventListener("click", async (event) => {
  const toggle = event.target.closest("[data-feed-toggle]");
  const remove = event.target.closest("[data-feed-delete]");

  try {
    if (toggle) {
      await api(`/api/news/feeds/${toggle.dataset.feedToggle}`, {
        method: "PATCH",
        body: JSON.stringify({ active: toggle.dataset.feedActive !== "1" }),
      });
      await loadNewsFeeds();
      return;
    }

    if (remove) {
      const name = remove.dataset.feedName || "diese Quelle";
      if (!confirm(`Quelle „${name}" entfernen?\n\nDie zwischengespeicherten Meldungen dieser Quelle werden mit gelöscht.`)) return;
      await api(`/api/news/feeds/${remove.dataset.feedDelete}`, { method: "DELETE" });
      showToast("Quelle entfernt.");
      await loadNewsFeeds();
    }
  } catch (error) {
    alert(error.message);
  }
});
