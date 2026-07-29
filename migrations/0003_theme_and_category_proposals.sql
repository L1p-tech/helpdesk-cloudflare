PRAGMA foreign_keys = OFF;

CREATE TABLE template_proposals_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER,
  base_version INTEGER,
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('create', 'update')),
  category_id INTEGER,
  proposed_category_name TEXT,
  proposed_category_color TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'changes_requested', 'approved', 'rejected', 'withdrawn')),
  duplicate_score REAL NOT NULL DEFAULT 0,
  duplicate_template_id INTEGER,
  submitted_by INTEGER NOT NULL,
  reviewed_by INTEGER,
  review_note TEXT,
  submitted_at TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (duplicate_template_id) REFERENCES templates(id) ON DELETE SET NULL,
  FOREIGN KEY (submitted_by) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

INSERT INTO template_proposals_new (
  id, template_id, base_version, proposal_type, category_id, title, body, reason,
  status, duplicate_score, duplicate_template_id, submitted_by, reviewed_by,
  review_note, submitted_at, reviewed_at, created_at, updated_at
)
SELECT
  id, template_id, base_version, proposal_type, category_id, title, body, reason,
  status, duplicate_score, duplicate_template_id, submitted_by, reviewed_by,
  review_note, submitted_at, reviewed_at, created_at, updated_at
FROM template_proposals;

DROP TABLE template_proposals;
ALTER TABLE template_proposals_new RENAME TO template_proposals;

CREATE INDEX idx_proposals_status ON template_proposals(status);
CREATE INDEX idx_proposals_submitter ON template_proposals(submitted_by);

PRAGMA foreign_keys = ON;
