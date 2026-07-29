CREATE TABLE typing_game_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  wpm INTEGER NOT NULL CHECK (wpm >= 0 AND wpm <= 400),
  accuracy INTEGER NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
  correct_chars INTEGER NOT NULL CHECK (correct_chars >= 0),
  total_chars INTEGER NOT NULL CHECK (total_chars >= 1),
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 10000 AND duration_ms <= 300000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_typing_scores_wpm ON typing_game_scores(wpm DESC, accuracy DESC);
CREATE INDEX idx_typing_scores_user ON typing_game_scores(user_id, wpm DESC);
