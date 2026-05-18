import os
import sqlite3
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), 'migrations')


def run_migrations(db_path: str):
    """执行所有待执行的 SQL 迁移文件。

    迁移文件命名规范: {version:03d}_{description}.sql
    例如: 001_init_schema.sql, 002_add_index.sql

    已执行的迁移版本记录在 schema_migrations 表中，自动跳过。
    每个迁移在独立事务中执行，失败时自动回滚。
    """
    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()

        # 创建迁移记录表
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                applied_at TEXT NOT NULL
            )
        ''')
        conn.commit()

        # 获取已执行的迁移版本
        cursor.execute('SELECT version FROM schema_migrations ORDER BY version')
        applied_versions = {row[0] for row in cursor.fetchall()}

        # 确保迁移目录存在
        if not os.path.exists(MIGRATIONS_DIR):
            os.makedirs(MIGRATIONS_DIR)
            logger.info(f'Created migrations directory: {MIGRATIONS_DIR}')
            return

        # 扫描并排序迁移文件
        migration_files = sorted([
            f for f in os.listdir(MIGRATIONS_DIR)
            if f.endswith('.sql') and f[:3].isdigit()
        ])

        applied_count = 0
        for filename in migration_files:
            version = int(filename[:3])
            if version in applied_versions:
                logger.debug(f'Migration {version:03d} already applied, skipping: {filename}')
                continue

            filepath = os.path.join(MIGRATIONS_DIR, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                sql = f.read()

            if not sql.strip():
                logger.warning(f'Migration file is empty, skipping: {filename}')
                continue

            try:
                if version == 2:
                    _apply_migration_002(cursor, sql, version, filename)
                elif version == 3:
                    _apply_migration_003(cursor, sql, version, filename)
                else:
                    cursor.executescript(sql)
                
                cursor.execute(
                    'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)',
                    (version, datetime.now(timezone.utc).isoformat())
                )
                conn.commit()
                applied_count += 1
                logger.info(f'Applied migration {version:03d}: {filename}')
            except Exception as e:
                conn.rollback()
                logger.error(f'Failed to apply migration {version:03d} ({filename}): {e}')
                raise

        if applied_count == 0:
            logger.info('No pending migrations')
        else:
            logger.info(f'Applied {applied_count} migration(s)')
    finally:
        conn.close()


_UNESCAPE_REPLACES = [
    ('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'),
    ('&quot;', '"'), ('&#39;', "'"),
]

def _unescape_value(value: str) -> str:
    for entity, char in _UNESCAPE_REPLACES:
        value = value.replace(entity, char)
    return value

def _apply_migration_002(cursor, sql: str, version: int, filename: str):
    cursor.execute("PRAGMA table_info(questions)")
    columns = {row[1] for row in cursor.fetchall()}

    text_columns = ['content', 'answer', 'questions', 'blanks']
    for col in text_columns:
        if col in columns:
            like_clauses = ' OR '.join(
                [f"{col} LIKE '%{entity}%'" for entity, _ in _UNESCAPE_REPLACES]
            )
            cursor.execute(
                f"SELECT rowid, {col} FROM questions WHERE {like_clauses}"
            )
            for rowid, val in cursor.fetchall():
                new_val = _unescape_value(val)
                cursor.execute(
                    f"UPDATE questions SET {col} = ? WHERE rowid = ?",
                    (new_val, rowid)
                )

    tags_col = 'tags' if 'tags' in columns else ('exam_points' if 'exam_points' in columns else None)
    if tags_col:
        like_clauses = ' OR '.join(
            [f"{tags_col} LIKE '%{entity}%'" for entity, _ in _UNESCAPE_REPLACES]
        )
        cursor.execute(
            f"SELECT rowid, {tags_col} FROM questions WHERE {like_clauses}"
        )
        for rowid, val in cursor.fetchall():
            new_val = _unescape_value(val)
            cursor.execute(
                f"UPDATE questions SET {tags_col} = ? WHERE rowid = ?",
                (new_val, rowid)
            )


def _apply_migration_003(cursor, sql: str, version: int, filename: str):
    """特殊处理迁移 003：检查列是否存在并安全添加"""
    # 获取当前表结构
    cursor.execute("PRAGMA table_info(questions)")
    columns = {row[1] for row in cursor.fetchall()}
    
    # 1. 处理 difficulty 列
    if 'difficulty' not in columns:
        cursor.execute("ALTER TABLE questions ADD COLUMN difficulty TEXT")
        logger.debug('Added difficulty column')
    
    # 2. 处理 unit 列
    if 'unit' not in columns:
        cursor.execute("ALTER TABLE questions ADD COLUMN unit TEXT")
        logger.debug('Added unit column')
    
    # 3. 处理 tags -> exam_points 迁移
    # 重新获取列信息，因为可能刚添加了列
    cursor.execute("PRAGMA table_info(questions)")
    columns = {row[1] for row in cursor.fetchall()}
    
    if 'tags' in columns and 'exam_points' not in columns:
        # 执行重命名
        cursor.execute("ALTER TABLE questions RENAME COLUMN tags TO exam_points")
        logger.debug('Renamed tags column to exam_points')
    elif 'tags' not in columns and 'exam_points' not in columns:
        # 中间状态：两个列都不存在，需要创建 exam_points
        cursor.execute("ALTER TABLE questions ADD COLUMN exam_points TEXT")
        logger.debug('Added exam_points column')
    # 如果 exam_points 已存在（正常情况），无需操作
