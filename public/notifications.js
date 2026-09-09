/** Notification UI owns its polling and clears it when the session ends. */
export function createNotifications({ api, formatDateTime, onError }) {
  const button = document.querySelector("#notification-button");
  const badge = document.querySelector("#notification-count");
  const dialog = document.querySelector("#notification-dialog");
  const list = document.querySelector("#notification-list");
  const markVisible = document.querySelector("#notification-read-visible");
  let items = [];
  let timer = null;
  let generation = 0;
  let loading = false;

  function render(data) {
    items = data.notifications;
    const count = data.unreadCount;
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.classList.toggle("hidden", count === 0);
    button.setAttribute("aria-label", `Benachrichtigungen, ${count} ungelesen`);
    markVisible.disabled = items.length === 0;
    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Keine ungelesenen Benachrichtigungen.";
      list.append(empty);
    }
    for (const item of items) {
      const row = document.createElement("article");
      row.className = "notification-row";
      const title = document.createElement("strong");
      title.textContent = item.title;
      const message = document.createElement("p");
      message.textContent = item.message;
      const date = document.createElement("small");
      date.className = "muted";
      date.textContent = formatDateTime(item.created_at);
      const read = document.createElement("button");
      read.type = "button";
      read.className = "btn-link";
      read.textContent = "Als gelesen markieren";
      read.addEventListener("click", () => markRead([item.id]).catch(onError));
      row.append(title, message, date, read);
      list.append(row);
    }
  }

  async function load() {
    if (loading) return;
    const current = generation;
    loading = true;
    try {
      const data = await api("/api/notifications");
      if (current === generation) render(data);
    } finally {
      if (current === generation) loading = false;
    }
  }

  async function markRead(ids) {
    if (!ids.length) return;
    markVisible.disabled = true;
    try {
      await api("/api/notifications/read", { method: "POST", body: JSON.stringify({ ids }) });
      await load();
    } finally {
      markVisible.disabled = items.length === 0;
    }
  }

  button.addEventListener("click", () => {
    dialog.showModal();
    load().catch(onError);
  });
  markVisible.addEventListener("click", () => markRead(items.map((item) => item.id)).catch(onError));
  document.addEventListener("visibilitychange", () => {
    if (timer && !document.hidden) load().catch(() => {});
  });
  return {
    start() {
      if (timer) return;
      load().catch(() => {});
      timer = setInterval(() => {
        if (!document.hidden) load().catch(() => {});
      }, 30_000);
    },
    stop() {
      clearInterval(timer);
      timer = null;
      generation += 1;
      loading = false;
      render({ notifications: [], unreadCount: 0 });
      dialog.close();
    },
  };
}
