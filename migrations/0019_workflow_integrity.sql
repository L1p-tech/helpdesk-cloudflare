-- Preserve every proposal status and keep IDs, authors, notes and dates intact.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE template_proposals_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER,
  base_version INTEGER,
  proposal_type TEXT NOT NULL DEFAULT 'create' CHECK (proposal_type IN ('create', 'update')),
  category_id INTEGER,
  proposed_category_name TEXT,
  proposed_category_color TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'changes_requested', 'approved', 'rejected', 'withdrawn')),
  duplicate_score REAL NOT NULL DEFAULT 0,
  duplicate_template_id INTEGER,
  submitted_by INTEGER,
  submitted_by_name TEXT NOT NULL,
  reviewed_by INTEGER,
  review_note TEXT,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (duplicate_template_id) REFERENCES templates(id) ON DELETE SET NULL,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO template_proposals_new SELECT * FROM template_proposals;
DROP TABLE template_proposals;
ALTER TABLE template_proposals_new RENAME TO template_proposals;
CREATE INDEX idx_proposals_status ON template_proposals(status);
CREATE INDEX idx_proposals_submitter ON template_proposals(submitted_by);

-- Transaction-local assertions used by mutations.ts; empty after every commit.
CREATE TABLE mutation_guards (
  valid INTEGER NOT NULL CONSTRAINT mutation_precondition CHECK (valid = 1)
);
ALTER TABLE commands ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE solutions ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE content_proposals ADD COLUMN base_version INTEGER;
-- Existing update proposals have no reliable original version. Leave NULL:
-- they must be resubmitted after reviewing the current content.
UPDATE reminders SET due_at = strftime('%Y-%m-%dT%H:%M:%fZ', due_at)
WHERE julianday(due_at) IS NOT NULL;
CREATE INDEX idx_reminders_pending_due ON reminders(due_at) WHERE done = 0 AND notified_at IS NULL;
ALTER TABLE notifications ADD COLUMN reminder_id INTEGER REFERENCES reminders(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX idx_notifications_reminder ON notifications(reminder_id);
PRAGMA defer_foreign_keys = OFF;
