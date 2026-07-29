PRAGMA foreign_keys = OFF;

CREATE TABLE templates_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_by INTEGER,
  created_by_name TEXT NOT NULL,
  updated_by INTEGER,
  updated_by_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO templates_new (
  id, category_id, title, body, version, active,
  created_by, created_by_name, updated_by, updated_by_name, created_at, updated_at
)
SELECT
  t.id, t.category_id, t.title, t.body, t.version, t.active,
  t.created_by, COALESCE(cu.display_name, 'Ehemaliger Mitarbeiter'),
  t.updated_by, COALESCE(uu.display_name, 'Ehemaliger Mitarbeiter'),
  t.created_at, t.updated_at
FROM templates t
LEFT JOIN users cu ON cu.id = t.created_by
LEFT JOIN users uu ON uu.id = t.updated_by;

DROP TABLE templates;
ALTER TABLE templates_new RENAME TO templates;

CREATE INDEX idx_templates_category ON templates(category_id);
CREATE INDEX idx_templates_active ON templates(active);

CREATE TABLE template_versions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL,
  version INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  changed_by INTEGER,
  changed_by_name TEXT NOT NULL,
  change_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO template_versions_new (
  id, template_id, version, category_id, title, body,
  changed_by, changed_by_name, change_note, created_at
)
SELECT
  v.id, v.template_id, v.version, v.category_id, v.title, v.body,
  v.changed_by, COALESCE(u.display_name, 'Ehemaliger Mitarbeiter'),
  v.change_note, v.created_at
FROM template_versions v
LEFT JOIN users u ON u.id = v.changed_by;

DROP TABLE template_versions;
ALTER TABLE template_versions_new RENAME TO template_versions;

CREATE UNIQUE INDEX idx_template_versions_unique
ON template_versions(template_id, version);

CREATE TABLE commands_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  description TEXT NOT NULL,
  shell TEXT NOT NULL CHECK (shell IN ('cmd', 'powershell', 'windows')),
  requires_admin INTEGER NOT NULL DEFAULT 0 CHECK (requires_admin IN (0, 1)),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  remote_capable INTEGER NOT NULL DEFAULT 0 CHECK (remote_capable IN (0, 1)),
  restart_required INTEGER NOT NULL DEFAULT 0 CHECK (restart_required IN (0, 1)),
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

INSERT INTO commands_new (
  id, category, name, command, description, shell, requires_admin,
  risk_level, remote_capable, restart_required, active,
  created_by, created_by_name, updated_by, updated_by_name, created_at, updated_at
)
SELECT
  c.id, c.category, c.name, c.command, c.description, c.shell, c.requires_admin,
  c.risk_level, c.remote_capable, c.restart_required, c.active,
  c.created_by, COALESCE(cu.display_name, 'Ehemaliger Mitarbeiter'),
  c.updated_by, COALESCE(uu.display_name, 'Ehemaliger Mitarbeiter'),
  c.created_at, c.updated_at
FROM commands c
LEFT JOIN users cu ON cu.id = c.created_by
LEFT JOIN users uu ON uu.id = c.updated_by;

DROP TABLE commands;
ALTER TABLE commands_new RENAME TO commands;

PRAGMA foreign_keys = ON;
