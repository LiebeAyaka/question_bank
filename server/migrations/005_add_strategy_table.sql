-- 出题策略表
CREATE TABLE IF NOT EXISTS strategy (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    difficulty_easy INTEGER DEFAULT 30,
    difficulty_medium INTEGER DEFAULT 50,
    difficulty_hard INTEGER DEFAULT 20,
    unit_ratios TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
);