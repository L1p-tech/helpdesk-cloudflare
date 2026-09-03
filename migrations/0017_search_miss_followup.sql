-- Erfolglose Suchen bekommen einen Bearbeitungsstand.
--
-- Bisher liessen sich die Begriffe nur ansehen. Damit aus einer Luecke
-- nachweislich Wissen wird, haelt "resolved_at" fest, wann jemand sie
-- bearbeitet hat -- erledigte Begriffe verschwinden dann aus der Liste,
-- ohne dass die Rohdaten verloren gehen.
ALTER TABLE search_misses ADD COLUMN resolved_at TEXT;
ALTER TABLE search_misses ADD COLUMN resolved_by INTEGER
  REFERENCES users(id) ON DELETE SET NULL;

-- Die Auswertung gruppiert nach Begriff und filtert auf offene Eintraege.
CREATE INDEX idx_search_misses_offen
  ON search_misses(term, resolved_at);
