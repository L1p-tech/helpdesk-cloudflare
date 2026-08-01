-- Cloudflare Workers unterstuetzen bei PBKDF2 hoechstens 100000 Iterationen.
-- Datensaetze mit hoeheren Werten liessen sich in der Produktion weder anlegen
-- noch verifizieren ("NotSupportedError: Pbkdf2 failed"). Der Anwendungscode
-- deckelt den Wert seit MAX_PBKDF2_ITERATIONS zusaetzlich zur Laufzeit.
--
-- Wichtig: Der Hash selbst bleibt unveraendert. Betroffene Konten wurden mit
-- einer Iterationszahl gehasht, die die Laufzeit nie ausfuehren konnte -- es
-- existiert also kein gueltiger Hash, der hier ungueltig gemacht wuerde.
UPDATE users
SET password_iterations = 100000
WHERE password_iterations > 100000;
