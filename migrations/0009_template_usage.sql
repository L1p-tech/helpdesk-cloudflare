-- Nutzungszaehler pro Benutzer und Vorlage.
--
-- Damit laesst sich die Vorlagenliste nach "zuletzt benutzt" bzw. "am
-- haeufigsten benutzt" sortieren. Bewusst pro Benutzer und nicht global: Wer
-- im Support arbeitet, hat eigene Standardvorlagen, und eine gemeinsame
-- Rangliste wuerde die persoenliche Reihenfolge verwaessern.
--
-- Die Zeile wird beim Kopieren angelegt bzw. hochgezaehlt (ON CONFLICT).
-- Loescht ein Admin die Vorlage endgueltig, verschwindet der Zaehler per
-- CASCADE mit; beim Loeschen eines Benutzers ebenso.

CREATE TABLE IF NOT EXISTS template_usage (
  user_id INTEGER NOT NULL,
  template_id INTEGER NOT NULL,
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, template_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_template_usage_recent
  ON template_usage(user_id, last_used_at DESC);
