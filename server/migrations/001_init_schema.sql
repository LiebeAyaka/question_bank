-- 初始 schema：创建 questions 表
-- 兼容已有数据库（IF NOT EXISTS）
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    title TEXT,
    sub_type TEXT,
    options TEXT,
    answer TEXT,
    questions TEXT,
    blanks TEXT,
    tags TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
);
