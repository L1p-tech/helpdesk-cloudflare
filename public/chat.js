import { $, escapeHtml, isAdmin, state } from "./base.js";
import { api } from "./core.js";
import { avatarTag, hydrateAvatars } from "./avatars.js";

/* ============================================================
   Team-Chat
   ============================================================
   Ein gemeinsamer Raum fuer alle Rollen. Neue Nachrichten kommen per Polling --
   fuer WebSockets braeuchte es Durable Objects, was fuer ein Team dieser Groesse
   unverhaeltnismaessig waere. Abgefragt wird nur der Zuwachs (`?after=<id>`),
   sodass jede Runde wenige hundert Byte kostet.
*/
export const CHAT_POLL_MS = 10_000;

export const chatState = {
  messages: [],
  lastId: 0,
  open: false,
  unread: 0,
  timer: null,
  /** Verhindert, dass sich langsame Abfragen ueberholen. */
  loading: false,
};

export function chatIsAtBottom() {
  const box = $("#chat-messages");
  return box.scrollHeight - box.scrollTop - box.clientHeight < 60;
}

export function renderChat() {
  const box = $("#chat-messages");

  if (!chatState.messages.length) {
    box.innerHTML = '<p class="chat-empty">Noch keine Nachrichten.</p>';
    return;
  }

  // Vor dem Neuzeichnen merken, ob der Verlauf unten steht: Nur dann wird
  // nachgescrollt, sonst reisst es Mitlesende aus dem Hochgescrollten heraus.
  const stickToBottom = chatIsAtBottom();

  box.innerHTML = chatState.messages.map((message) => {
    const own = message.author_id === state.user?.id;
    const canDelete = own || isAdmin();
    return `
      <div class="chat-message${own ? " own" : ""}">
        <div class="chat-message-head">
          <span class="chat-author">
            ${avatarTag(message.author_name, 18)}${escapeHtml(message.author_name)}
          </span>
          <span>${escapeHtml(formatChatTime(message.created_at))}</span>
        </div>
        <div class="chat-body">${renderChatBody(message.body)}</div>
        ${canDelete ? `<button class="chat-delete" type="button" data-chat-delete="${message.id}">Löschen</button>` : ""}
      </div>`;
  }).join("");

  hydrateAvatars(box);
  if (stickToBottom) box.scrollTop = box.scrollHeight;
}

/** Endungen, bei denen eine Adresse als Bild eingebettet wird. */
export const CHAT_IMAGE_PATTERN = /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i;

/**
 * Wandelt den Nachrichtentext in sicheres Markup: Adressen werden anklickbar,
 * Bildadressen zusaetzlich als Vorschau eingebettet.
 *
 * Sicherheitskritische Reihenfolge: Der Text wird ZUERST vollstaendig escaped,
 * die Ersetzung laeuft anschliessend nur noch ueber bereits entschaerften Text.
 * Andersherum -- erst ersetzen, dann escapen -- wuerde das eingefuegte Markup
 * mitescapen; und ohne Escaping vorweg koennte der Text eigenes HTML
 * einschleusen. Nur `http://` und `https://` werden verlinkt, damit weder
 * `javascript:` noch `data:` als Adresse durchkommen.
 */
export function renderChatBody(body) {
  const safe = escapeHtml(body);

  // Adressen enden am ersten Anfuehrungszeichen: `escapeHtml` laesst `"` und
  // `'` unveraendert (textContent escaped nur &, < und >), sodass ein
  // eingeschmuggeltes Zeichen sonst im href-Attribut landen wuerde.
  return safe.replace(/https?:\/\/[^\s<"']+/g, (match) => {
    // Satzzeichen am Ende gehoeren zum Satz, nicht zur Adresse.
    const trailing = match.match(/[.,;:!?)\]]+$/);
    const url = trailing ? match.slice(0, -trailing[0].length) : match;
    const suffix = trailing ? trailing[0] : "";

    // Zusaetzlich hart kodieren, damit das Attribut auch dann nicht verlassen
    // werden kann, wenn das Muster oben je gelockert wird.
    const href = url.replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    const link = `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;

    if (!CHAT_IMAGE_PATTERN.test(stripQuery(url))) return link + suffix;

    // Bilder werden lazy geladen und bleiben anklickbar, um sie in voller
    // Groesse zu oeffnen -- im schmalen Panel ist die Vorschau begrenzt.
    return `<a class="chat-image-link" href="${href}" target="_blank" rel="noopener noreferrer">
      <img class="chat-image" src="${href}" alt="Bild aus dem Chat" loading="lazy">
    </a>${suffix}`;
  });
}

/** Entfernt Query und Fragment, damit die Endung erkannt wird. */
export function stripQuery(url) {
  return url.split(/[?#]/)[0];
}

/**
 * Uhrzeit fuer heutige Nachrichten, sonst zusaetzlich das Datum -- im laufenden
 * Gespraech ist das Datum nur Rauschen.
 */
export function formatChatTime(value) {
  // SQLite liefert "YYYY-MM-DD HH:MM:SS" in UTC ohne Zeitzonenkennung. Ohne das
  // angehaengte "Z" wuerde der Browser das als Ortszeit lesen und die Uhrzeit
  // um den UTC-Versatz verschieben.
  const normalized = String(value ?? "").replace(" ", "T");
  const date = new Date(/[Z+]|-\d{2}:\d{2}$/.test(normalized) ? normalized : `${normalized}Z`);
  if (Number.isNaN(date.getTime())) return "";

  const time = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  const today = new Date();
  const sameDay = date.getDate() === today.getDate()
    && date.getMonth() === today.getMonth()
    && date.getFullYear() === today.getFullYear();

  if (sameDay) return time;

  const day = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
  return `${day} ${time}`;
}

export function updateChatBadge() {
  const badge = $("#chat-badge");
  if (chatState.unread > 0 && !chatState.open) {
    badge.textContent = chatState.unread > 99 ? "99+" : String(chatState.unread);
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

export async function loadChat() {
  if (chatState.loading) return;
  chatState.loading = true;

  try {
    const query = chatState.lastId ? `?after=${chatState.lastId}` : "";
    const data = await api(`/api/chat${query}`);
    const incoming = data.messages ?? [];

    if (chatState.lastId === 0) {
      chatState.messages = incoming;
    } else if (incoming.length) {
      chatState.messages = chatState.messages.concat(incoming);
      // Fremde Nachrichten zaehlen als ungelesen, eigene nicht.
      if (!chatState.open) {
        chatState.unread += incoming.filter(
          (message) => message.author_id !== state.user?.id,
        ).length;
      }
    }

    if (chatState.messages.length) {
      chatState.lastId = chatState.messages[chatState.messages.length - 1].id;
    }

    if (incoming.length || chatState.lastId === 0) renderChat();
    updateChatBadge();
  } finally {
    chatState.loading = false;
  }
}

export function startChatPolling() {
  if (chatState.timer) return;
  chatState.timer = setInterval(() => {
    // Im Hintergrundtab nicht pollen -- spart Anfragen ohne Nutzen.
    if (document.hidden) return;
    loadChat().catch(() => {});
  }, CHAT_POLL_MS);
}

export function stopChatPolling() {
  if (!chatState.timer) return;
  clearInterval(chatState.timer);
  chatState.timer = null;
}

export function setChatOpen(open) {
  chatState.open = open;
  $("#chat-panel").classList.toggle("hidden", !open);
  $("#chat-toggle").classList.toggle("hidden", open);
  $("#chat-toggle").setAttribute("aria-expanded", String(open));
  // Das Panel liegt fixiert ueber der Seite -- ohne diese Markierung wuerde es
  // auf breiten Bildschirmen die rechte Spalte samt Bedienelementen verdecken.
  document.body.classList.toggle("chat-open", open);

  if (open) {
    chatState.unread = 0;
    updateChatBadge();
    $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
    $("#chat-input").focus();
    // Beim Oeffnen sofort nachladen, statt bis zur naechsten Runde zu warten.
    loadChat().catch(() => {});
  }

  try {
    localStorage.setItem("helpdesk_chat_open", open ? "1" : "0");
  } catch {
    /* Privater Modus: Der Zustand geht verloren, der Chat funktioniert weiter. */
  }
}

export async function sendChatMessage() {
  const input = $("#chat-input");
  const body = input.value.trim();
  if (!body) return;

  input.value = "";
  try {
    await api("/api/chat", { method: "POST", body: JSON.stringify({ body }) });
    await loadChat();
    $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
  } catch (error) {
    // Bei Fehlschlag den Text zuruecklegen, damit nichts verloren geht.
    input.value = body;
    throw error;
  }
}

export async function deleteChatMessage(messageId) {
  await api(`/api/chat/${messageId}`, { method: "DELETE" });
  chatState.messages = chatState.messages.filter((message) => message.id !== messageId);
  renderChat();
}

export function initializeChat() {
  $("#chat-toggle").classList.remove("hidden");

  let wasOpen = false;
  try {
    wasOpen = localStorage.getItem("helpdesk_chat_open") === "1";
  } catch {
    wasOpen = false;
  }

  loadChat()
    .then(() => {
      // Erstabruf zaehlt nicht als ungelesen -- sonst stuende nach jedem
      // Neuladen der gesamte Verlauf als "neu" da.
      chatState.unread = 0;
      setChatOpen(wasOpen);
      updateChatBadge();
    })
    .catch(() => {});

  startChatPolling();
}

$("#chat-toggle").addEventListener("click", () => setChatOpen(true));

$("#chat-close").addEventListener("click", () => setChatOpen(false));

$("#chat-form").addEventListener("submit", (event) => {
  event.preventDefault();
  sendChatMessage().catch((error) => alert(error.message));
});

// Enter sendet, Umschalt+Enter macht einen Zeilenumbruch -- wie in gaengigen
// Chat-Oberflaechen.
$("#chat-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendChatMessage().catch((error) => alert(error.message));
  }
});

$("#chat-messages").addEventListener("click", (event) => {
  const button = event.target.closest("[data-chat-delete]");
  if (!button) return;
  if (!confirm("Diese Nachricht löschen?")) return;
  deleteChatMessage(Number(button.dataset.chatDelete))
    .catch((error) => alert(error.message));
});

// Beim Zurueckkehren in den Tab sofort nachladen, statt bis zu einer vollen
// Runde auf neue Nachrichten zu warten.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && chatState.timer) loadChat().catch(() => {});
});
