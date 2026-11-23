-- Lernfortschritt der Schulungsseite, pro Benutzer.
--
-- Ein Eintrag je Modul-Quiz ("grundlagen-netz") oder Checklistenpunkt
-- ("check:woche1:3"). Die Inhalte selbst liegen im Frontend; hier steht nur,
-- wer was geschafft hat. Damit geht der Stand beim Gerätewechsel nicht
-- verloren.
--
--   percent       bestes Quiz-Ergebnis in Prozent, NULL bei Checklistenpunkten
--   attempts      Anzahl der Quiz-Versuche
--   completed_at  gesetzt, sobald das Modul bestanden bzw. der Punkt erledigt
--                 ist -- bleibt auch dann stehen, wenn ein späterer Versuch
--                 schlechter ausfällt
--
-- Beim Löschen eines Benutzers verschwindet sein Fortschritt per CASCADE mit.
-- Es gibt bewusst keine Auswertung über mehrere Benutzer.

CREATE TABLE IF NOT EXISTS training_progress (
  user_id INTEGER NOT NULL,
  item_id TEXT NOT NULL,
  percent INTEGER CHECK (percent IS NULL OR (percent >= 0 AND percent <= 100)),
  attempts INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, item_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
