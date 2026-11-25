-- Begrenzt fehlgeschlagene Anmeldungen pro IP-Adresse.
--
-- Die Kontosperre (failed_login_count) schuetzt nur ein einzelnes Konto. Wer
-- viele Benutzernamen mit einem Passwort durchprobiert oder nicht vorhandene
-- Namen verwendet, wurde bisher nicht gebremst. Diese Tabelle zaehlt
-- Anmeldeversuche je IP: Jeder Versuch reserviert vor der Pruefung einen
-- Platz (atomar, damit parallele Anfragen das Limit nicht umgehen) und gibt ihn
-- bei Erfolg wieder frei. Eintraege werden beim Schreiben nach einem Tag geloescht.
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_login_attempts_ip ON login_attempts(ip, attempted_at);
