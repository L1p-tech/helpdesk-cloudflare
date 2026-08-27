-- Faelle, Eskalation, Uebergabe, Erinnerungen und Nutzungsstatistik.

-- Fall-Arbeitsblatt: sammelt waehrend der Bearbeitung, was benutzt wurde.
CREATE TABLE cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  ticket_ref TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_cases_user ON cases(user_id, status);

-- Einzelne Schritte eines Falls. `ref_type`/`ref_id` verweisen lose auf
-- Vorlagen, Befehle oder Loesungen -- bewusst ohne Fremdschluessel, damit ein
-- geloeschter Eintrag die Falldokumentation nicht mitnimmt.
CREATE TABLE case_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('template', 'command', 'solution', 'note')),
  ref_id INTEGER,
  label TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

CREATE INDEX idx_case_entries_case ON case_entries(case_id);

-- Eskalationsstufen, von Admins pflegbar.
CREATE TABLE escalation_levels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  position INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  responsible TEXT NOT NULL,
  contact TEXT,
  response_time TEXT,
  criteria TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Beispielstufen als Startpunkt -- vom Team zu ueberschreiben.
INSERT INTO escalation_levels (position, name, responsible, contact, response_time, criteria) VALUES
(1, '1st Level', 'Helpdesk', 'Interne Durchwahl eintragen', 'Sofort',
 'Standardanfragen: Passwort, Drucker, Software, bekannte Lösungen aus der Wissensbasis.'),
(2, '2nd Level', 'Systembetreuung', 'Kontakt eintragen', 'Innerhalb von 2 Stunden',
 'Kein Eintrag in der Wissensbasis, Serverdienste betroffen, mehrere Benutzer.'),
(3, 'Fachbereich / Hersteller', 'Zuständigen Fachbereich eintragen', 'Kontakt eintragen', 'Innerhalb eines Arbeitstages',
 'Fachanwendung betroffen, Fehler liegt außerhalb der eigenen Infrastruktur.'),
(4, 'Rufbereitschaft', 'Rufbereitschaft eintragen', 'Notfallnummer eintragen', '15 Minuten',
 'Ausfall kritischer Systeme außerhalb der Servicezeiten.');

-- Dienstuebergabe.
CREATE TABLE handovers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_label TEXT NOT NULL,
  open_cases TEXT,
  incidents TEXT,
  notes TEXT,
  created_by INTEGER,
  created_by_name TEXT NOT NULL,
  acknowledged_by INTEGER,
  acknowledged_by_name TEXT,
  acknowledged_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_handovers_created ON handovers(created_at DESC);

-- Erinnerungen. Der Cron-Lauf stellt faellige Eintraege als Benachrichtigung zu.
CREATE TABLE reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  ticket_ref TEXT,
  due_at TEXT NOT NULL,
  notified_at TEXT,
  done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_reminders_due ON reminders(done, notified_at, due_at);

-- Nutzung von Loesungen und Befehlen: wie oft geoeffnet, wie oft als hilfreich
-- markiert. Zeigt Luecken (viel gesucht, nichts gefunden) und veraltete
-- Eintraege.
CREATE TABLE content_usage (
  content_type TEXT NOT NULL CHECK (content_type IN ('command', 'solution')),
  content_id INTEGER NOT NULL,
  opened_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (content_type, content_id)
);

-- Suchbegriffe ohne Treffer -- daraus laesst sich ablesen, welches Wissen fehlt.
CREATE TABLE search_misses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT NOT NULL,
  scope TEXT NOT NULL,
  user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_search_misses_term ON search_misses(term);
