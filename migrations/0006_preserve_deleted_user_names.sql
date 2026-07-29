PRAGMA foreign_keys = OFF;

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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
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

INSERT INTO template_proposals_new (
  id, template_id, base_version, proposal_type, category_id, proposed_category_name,
  proposed_category_color, title, body, reason, status, duplicate_score, duplicate_template_id,
  submitted_by, submitted_by_name, reviewed_by, review_note, submitted_at, reviewed_at, updated_at
)
SELECT
  p.id, p.template_id, p.base_version, p.proposal_type, p.category_id, p.proposed_category_name,
  p.proposed_category_color, p.title, p.body, p.reason, p.status, p.duplicate_score, p.duplicate_template_id,
  p.submitted_by, COALESCE(u.display_name, 'Ehemaliger Mitarbeiter'), p.reviewed_by, p.review_note,
  p.submitted_at, p.reviewed_at, p.updated_at
FROM template_proposals p
LEFT JOIN users u ON u.id = p.submitted_by;

DROP TABLE template_proposals;
ALTER TABLE template_proposals_new RENAME TO template_proposals;

CREATE INDEX idx_proposals_status ON template_proposals(status);
CREATE INDEX idx_proposals_submitter ON template_proposals(submitted_by);

CREATE TABLE feedback_items_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('bug', 'improvement')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'planned', 'closed')),
  submitted_by INTEGER,
  submitted_by_name TEXT NOT NULL,
  reviewed_by INTEGER,
  admin_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO feedback_items_new (
  id, type, title, message, status, submitted_by, submitted_by_name,
  reviewed_by, admin_note, created_at, updated_at
)
SELECT
  f.id, f.type, f.title, f.message, f.status, f.submitted_by,
  COALESCE(u.display_name, 'Ehemaliger Mitarbeiter'),
  f.reviewed_by, f.admin_note, f.created_at, f.updated_at
FROM feedback_items f
LEFT JOIN users u ON u.id = f.submitted_by;

DROP TABLE feedback_items;
ALTER TABLE feedback_items_new RENAME TO feedback_items;

CREATE INDEX idx_feedback_status ON feedback_items(status, created_at DESC);
CREATE INDEX idx_feedback_submitted_by ON feedback_items(submitted_by, created_at DESC);

CREATE TABLE game_scores_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  display_name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 1000000),
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO game_scores_new (id, user_id, display_name, score, duration_ms, created_at)
SELECT
  g.id, g.user_id, COALESCE(u.display_name, 'Ehemaliger Mitarbeiter'), g.score, g.duration_ms, g.created_at
FROM game_scores g
LEFT JOIN users u ON u.id = g.user_id;

DROP TABLE game_scores;
ALTER TABLE game_scores_new RENAME TO game_scores;

CREATE INDEX idx_game_scores_score ON game_scores(score DESC);
CREATE INDEX idx_game_scores_user ON game_scores(user_id, score DESC);

CREATE TABLE typing_game_scores_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  display_name TEXT NOT NULL,
  wpm INTEGER NOT NULL CHECK (wpm >= 0 AND wpm <= 400),
  accuracy INTEGER NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
  correct_chars INTEGER NOT NULL CHECK (correct_chars >= 0),
  total_chars INTEGER NOT NULL CHECK (total_chars >= 1),
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 10000 AND duration_ms <= 300000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO typing_game_scores_new (
  id, user_id, display_name, wpm, accuracy, correct_chars, total_chars, duration_ms, created_at
)
SELECT
  t.id, t.user_id, COALESCE(u.display_name, 'Ehemaliger Mitarbeiter'),
  t.wpm, t.accuracy, t.correct_chars, t.total_chars, t.duration_ms, t.created_at
FROM typing_game_scores t
LEFT JOIN users u ON u.id = t.user_id;

DROP TABLE typing_game_scores;
ALTER TABLE typing_game_scores_new RENAME TO typing_game_scores;

CREATE INDEX idx_typing_scores_wpm ON typing_game_scores(wpm DESC, accuracy DESC);
CREATE INDEX idx_typing_scores_user ON typing_game_scores(user_id, wpm DESC);

PRAGMA foreign_keys = ON;
