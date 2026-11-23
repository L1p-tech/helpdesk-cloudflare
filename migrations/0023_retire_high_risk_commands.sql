-- Die drei mitgelieferten Befehle mit hohem Risiko werden archiviert (nicht gelöscht).
-- Sie lassen sich bei Bedarf in der Befehlsliste wiederherstellen. Die Standardbibliothek
-- legt sie nicht neu an, weil der Befehlstext weiterhin vorhanden ist.

UPDATE commands
SET active = 0, updated_at = CURRENT_TIMESTAMP
WHERE active = 1 AND risk_level = 'high' AND command IN (
  'taskkill /PID [PROZESS-ID] /F',
  'netsh winsock reset && netsh int ip reset',
  'net stop wuauserv && net stop bits && ren C:\Windows\SoftwareDistribution SoftwareDistribution.old && net start wuauserv && net start bits'
);
