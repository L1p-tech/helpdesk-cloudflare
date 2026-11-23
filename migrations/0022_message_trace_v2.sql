-- Nachrichtenverfolgung: Get-MessageTrace ist veraltet, Nachfolger ist Get-MessageTraceV2.
-- Der mitgelieferte Eintrag wird an Ort und Stelle angepasst, damit Favoriten erhalten
-- bleiben und beim nächsten Abgleich der Standardbibliothek kein Doppel entsteht.
-- Nur Zeilen mit dem unveränderten alten Befehl werden angefasst.

UPDATE commands
SET command = 'Get-MessageTraceV2 -SenderAddress [ABSENDER] -StartDate (Get-Date).AddDays(-2) -EndDate (Get-Date) | Select-Object Received, SenderAddress, RecipientAddress, Subject, Status',
    description = 'Zeigt, was mit Mails eines Absenders in den letzten zwei Tagen passiert ist: zugestellt, in Quarantäne, abgewiesen oder noch in der Warteschlange. Nachfolger von Get-MessageTrace und braucht ein aktuelles ExchangeOnlineManagement-Modul; im Exchange Admin Center heißt die Funktion „Nachrichtenablaufverfolgung“.',
    updated_at = CURRENT_TIMESTAMP
WHERE command = 'Get-MessageTrace -SenderAddress [ABSENDER] -StartDate (Get-Date).AddDays(-2) -EndDate (Get-Date) | Select-Object Received, SenderAddress, RecipientAddress, Subject, Status';
