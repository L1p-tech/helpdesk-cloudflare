-- Gemeinsamer Team-Chat: ein einziger Raum, den alle Rollen lesen und
-- beschreiben duerfen.
--
-- Der Autor wird per SET NULL entkoppelt statt kaskadierend geloescht, damit
-- das Loeschen eines Kontos den Verlauf nicht zerreisst. Der Anzeigename steht
-- redundant in author_name -- dasselbe Muster wie bei templates/commands, wo
-- die *_by_name-Spalten die Zuordnung ueber das Konto hinaus erhalten.
CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Der Chat wird ausschliesslich chronologisch abgefragt ("die letzten N",
-- "alles neuer als id X"), deshalb ein Index auf die Zeitachse.
CREATE INDEX IF NOT EXISTS idx_chat_messages_created
  ON chat_messages (created_at DESC);
