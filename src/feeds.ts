/**
 * RSS- und Atom-Auswertung fuer den Meldungen-Reiter.
 *
 * Bewusst ein eigener, kleiner Parser statt einer Bibliothek: Workers bringen
 * keinen DOMParser mit, und die eingesetzten Feeds nutzen nur einen schmalen
 * Ausschnitt der Formate. Der Parser ist absichtlich nachsichtig -- ein
 * unerwartetes Feld soll eine Quelle nicht komplett ausfallen lassen.
 */

export interface ParsedItem {
  guid: string;
  title: string;
  link: string;
  summary: string;
  publishedAt: string | null;
}

/**
 * Groessenobergrenze pro Feed. Der Microsoft-Feed liefert ueber 2 MB und
 * mehrere tausend Eintraege -- ohne Deckel waere jeder Abruf unnoetig teuer.
 */
const MAX_FEED_BYTES = 3_000_000;

/** Wie viele Eintraege pro Quelle uebernommen werden. */
export const MAX_ITEMS_PER_FEED = 40;

/** Abbruch, damit eine haengende Quelle den Abruf nicht blockiert. */
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Holt einen Feed und liefert die Eintraege.
 *
 * Fehler werden als Ausnahme geworfen und vom Aufrufer pro Quelle behandelt:
 * Eine nicht erreichbare Quelle darf die uebrigen nicht mitreissen.
 */
export async function fetchFeed(url: string): Promise<ParsedItem[]> {
  const response = await fetch(url, {
    headers: {
      // Manche Anbieter liefern ohne erkennbaren User-Agent gar nichts oder
      // antworten mit 403.
      "user-agent": "Mozilla/5.0 (compatible; HelpdeskHelper/1.0; +intern)",
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const buffer = await readLimited(response);
  const xml = decodeBody(buffer, response.headers.get("content-type"));

  return parseFeed(xml);
}

/**
 * Liest den Antwortkoerper bis zur Groessengrenze.
 *
 * `response.arrayBuffer()` wuerde erst alles laden und danach pruefen -- bei
 * einem unerwartet grossen Feed also genau den Speicher belegen, den die
 * Grenze verhindern soll.
 */
async function readLimited(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (total < MAX_FEED_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    total += value.length;
  }

  // Rest verwerfen, damit die Verbindung sauber endet.
  await reader.cancel().catch(() => {});

  const merged = new Uint8Array(Math.min(total, MAX_FEED_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= merged.length) break;
    const slice = chunk.subarray(0, merged.length - offset);
    merged.set(slice, offset);
    offset += slice.length;
  }
  return merged;
}

/**
 * Dekodiert den Feed. Nicht alle Anbieter liefern UTF-8 -- Golem etwa sendet
 * ISO-8859-1, was ohne Behandlung zu zerstoerten Umlauten fuehrt.
 */
function decodeBody(buffer: Uint8Array, contentType: string | null): string {
  const declared = /charset=["']?([\w-]+)/i.exec(contentType ?? "")?.[1];

  // Die XML-Deklaration im Dokument zaehlt ebenfalls -- sie steht in den ersten
  // Bytes und ist in ASCII lesbar, unabhaengig von der tatsaechlichen Kodierung.
  const head = new TextDecoder("ascii").decode(buffer.subarray(0, 200));
  const inline = /encoding=["']([\w-]+)["']/i.exec(head)?.[1];

  const encoding = (declared ?? inline ?? "utf-8").toLowerCase();

  try {
    return new TextDecoder(encoding).decode(buffer);
  } catch {
    // Unbekannte Kodierung: lieber UTF-8 versuchen als gar nichts liefern.
    return new TextDecoder("utf-8").decode(buffer);
  }
}

/** Erkennt RSS und Atom und liefert die Eintraege in einheitlicher Form. */
export function parseFeed(xml: string): ParsedItem[] {
  const blocks = matchAll(xml, /<(item|entry)[\s>][\s\S]*?<\/\1>/gi);
  const items: ParsedItem[] = [];

  for (const block of blocks) {
    if (items.length >= MAX_ITEMS_PER_FEED) break;

    const title = cleanText(tagContent(block, "title"));
    const link = extractLink(block);
    if (!title || !link) continue;

    const summary = cleanText(
      tagContent(block, "description")
      ?? tagContent(block, "summary")
      ?? tagContent(block, "content")
      ?? "",
    );

    const published = tagContent(block, "pubDate")
      ?? tagContent(block, "published")
      ?? tagContent(block, "updated")
      ?? tagContent(block, "dc:date");

    items.push({
      // Ohne eigene Kennung dient der Link als stabiler Ersatz -- er ist pro
      // Meldung eindeutig und aendert sich nicht.
      guid: cleanText(tagContent(block, "guid") ?? tagContent(block, "id") ?? link).slice(0, 400),
      title: title.slice(0, 300),
      link: link.slice(0, 600),
      summary: summary.slice(0, 600),
      publishedAt: normalizeDate(published),
    });
  }

  return items;
}

function matchAll(input: string, pattern: RegExp): string[] {
  return [...input.matchAll(pattern)].map((match) => match[0]);
}

/** Inhalt des ersten passenden Elements, CDATA aufgeloest. */
function tagContent(block: string, tag: string): string | null {
  const escaped = tag.replace(":", "\\:");
  const match = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`, "i").exec(block);
  if (!match) return null;

  const raw = (match[1] ?? "").trim();
  const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(raw);
  return cdata?.[1] ?? raw;
}

/**
 * Liefert die Zieladresse. RSS stellt sie als Elementinhalt bereit, Atom als
 * Attribut eines leeren `<link>`-Elements.
 */
function extractLink(block: string): string {
  const atom = /<link[^>]*\srel=["']alternate["'][^>]*\shref=["']([^"']+)["']/i.exec(block)
    ?? /<link[^>]*\shref=["']([^"']+)["']/i.exec(block);
  if (atom?.[1]) return decodeEntities(atom[1].trim());

  const rss = tagContent(block, "link");
  if (rss) return decodeEntities(rss.trim());

  return "";
}

/**
 * Entfernt Markup und normalisiert Leerraum -- Feeds liefern oft HTML.
 *
 * Reihenfolge beachten: Manche Quellen liefern das HTML escaped (Golem sendet
 * `&lt;img src=...&gt;`). Wuerde erst entfernt und dann dekodiert, kaeme das
 * Markup nach dem Dekodieren als sichtbarer Text wieder zum Vorschein. Also
 * zuerst dekodieren, dann entfernen -- und danach ein zweites Mal dekodieren,
 * weil Attribute wie `&amp;amp;` doppelt kodiert sein koennen.
 */
function cleanText(value: string | null): string {
  if (!value) return "";

  const decoded = decodeEntities(value);
  const withoutMarkup = decoded.replace(/<[^>]*>/g, " ");

  return decodeEntities(withoutMarkup)
    .replace(/\s+/g, " ")
    .trim();
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&(\w+);/g, (match, name) => ENTITIES[name.toLowerCase()] ?? match);
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/**
 * Bringt Datumsangaben auf das SQLite-Format. Feeds nutzen RFC 822 (RSS) oder
 * ISO 8601 (Atom); `Date` versteht beides.
 */
function normalizeDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(cleanText(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace("T", " ").slice(0, 19);
}
