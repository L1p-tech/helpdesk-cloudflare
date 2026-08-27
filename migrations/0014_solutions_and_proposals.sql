-- Loesungen fuer bekannte IT-Probleme sowie der Vorschlagsweg fuer Befehle
-- und Loesungen.
--
-- Vorlagen haben ihre eigene Vorschlagstabelle (template_proposals). Befehle
-- und Loesungen teilen sich hier eine gemeinsame Tabelle: beide Inhaltsarten
-- durchlaufen denselben Ablauf und unterscheiden sich nur in den Feldern, die
-- als JSON im Payload liegen. Zwei nahezu identische Tabellen waeren doppelte
-- Pflege ohne Gewinn.

CREATE TABLE solutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  symptom TEXT NOT NULL,
  cause TEXT,
  solution TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_by INTEGER,
  created_by_name TEXT NOT NULL,
  updated_by INTEGER,
  updated_by_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_solutions_active ON solutions(active);
CREATE INDEX idx_solutions_category ON solutions(category);

-- Gemeinsame Vorschlagstabelle fuer Befehle und Loesungen.
--
-- `payload_json` haelt die inhaltlichen Felder der jeweiligen Art. Das haelt
-- die Tabelle schmal und erlaubt spaeter weitere Arten, ohne das Schema
-- anzufassen. Geprueft werden die Felder beim Einreichen und erneut beim
-- Genehmigen -- die Datenbank kann JSON-Inhalte nicht selbst validieren.
CREATE TABLE content_proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type TEXT NOT NULL CHECK (content_type IN ('command', 'solution')),
  target_id INTEGER,
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('create', 'update')),
  title TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'changes_requested', 'approved', 'rejected', 'withdrawn')),
  submitted_by INTEGER,
  submitted_by_name TEXT NOT NULL,
  reviewed_by INTEGER,
  review_note TEXT,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_content_proposals_status ON content_proposals(status);
CREATE INDEX idx_content_proposals_submitter ON content_proposals(submitted_by);
