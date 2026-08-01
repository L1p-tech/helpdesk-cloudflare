-- IT-Meldungen: Quellen und zwischengespeicherte Eintraege.
--
-- Die Feeds werden serverseitig geholt. Das umgeht nicht nur CORS (die
-- Anbieter erlauben keinen Abruf aus fremden Seiten heraus), sondern haelt
-- auch die IP-Adressen der Mitarbeiter von den Anbietern fern.
CREATE TABLE IF NOT EXISTS news_feeds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'Allgemein',
  active INTEGER NOT NULL DEFAULT 1,
  -- Zeitpunkt und Ergebnis des letzten Abrufs, damit im Admin-Bereich
  -- sichtbar ist, ob eine Quelle stillschweigend nichts mehr liefert.
  last_fetched_at TEXT,
  last_status TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Zwischenspeicher. Ohne ihn wuerde jeder Seitenaufruf jeden Feed neu laden --
-- langsam fuer die Anwender und unhoeflich gegenueber den Anbietern.
CREATE TABLE IF NOT EXISTS news_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id INTEGER NOT NULL,
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  published_at TEXT,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Eine Meldung ist innerhalb ihres Feeds eindeutig; dieselbe Meldung darf
  -- beim naechsten Abruf nicht erneut angelegt werden.
  UNIQUE (feed_id, guid),
  FOREIGN KEY (feed_id) REFERENCES news_feeds(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_news_items_published
  ON news_items (published_at DESC);

-- Startquellen: auf Erreichbarkeit geprueft und auf 2nd-Level-Support
-- zugeschnitten. Admins koennen sie jederzeit anpassen oder ergaenzen.
INSERT INTO news_feeds (name, url, category) VALUES
  ('BSI / CERT-Bund Warnungen', 'https://wid.cert-bund.de/content/public/securityAdvisory/rss', 'Sicherheit'),
  ('Microsoft Security Updates', 'https://api.msrc.microsoft.com/update-guide/rss', 'Microsoft'),
  ('heise Security', 'https://www.heise.de/security/feed.xml', 'Sicherheit'),
  ('heise online', 'https://www.heise.de/rss/heise-atom.xml', 'Allgemein'),
  ('Golem', 'https://rss.golem.de/rss.php?feed=RSS2.0', 'Allgemein')
ON CONFLICT (url) DO NOTHING;
