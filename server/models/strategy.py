import sqlite3
import json
from datetime import datetime
from typing import Optional, List, Dict
from flask import current_app

def get_db_connection():
    DATABASE = current_app.config['DATABASE']
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def dict_from_row(row: sqlite3.Row) -> dict:
    return dict(row) if row else None

class StrategyModel:
    @staticmethod
    def create(name: str, difficulty_easy: int, difficulty_medium: int, difficulty_hard: int, unit_ratios: dict) -> dict:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()
        strategy_id = f"str_{datetime.now().strftime('%Y%m%d%H%M%S')}"

        cursor.execute('''
            INSERT INTO strategy (id, name, difficulty_easy, difficulty_medium, difficulty_hard, unit_ratios, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (strategy_id, name, difficulty_easy, difficulty_medium, difficulty_hard, json.dumps(unit_ratios), now))

        conn.commit()
        strategy = dict_from_row(cursor.execute('SELECT * FROM strategy WHERE id = ?', (strategy_id,)).fetchone())
        conn.close()
        return strategy

    @staticmethod
    def get_all() -> List[dict]:
        conn = get_db_connection()
        cursor = conn.cursor()
        rows = cursor.execute('SELECT * FROM strategy ORDER BY created_at DESC').fetchall()
        strategies = [dict_from_row(row) for row in rows]
        conn.close()
        return strategies

    @staticmethod
    def get_by_id(strategy_id: str) -> Optional[dict]:
        conn = get_db_connection()
        cursor = conn.cursor()
        row = cursor.execute('SELECT * FROM strategy WHERE id = ?', (strategy_id,)).fetchone()
        strategy = dict_from_row(row)
        conn.close()
        return strategy

    @staticmethod
    def update(strategy_id: str, name: str, difficulty_easy: int, difficulty_medium: int, difficulty_hard: int, unit_ratios: dict) -> Optional[dict]:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.now().isoformat()

        cursor.execute('''
            UPDATE strategy
            SET name = ?, difficulty_easy = ?, difficulty_medium = ?, difficulty_hard = ?, unit_ratios = ?, updated_at = ?
            WHERE id = ?
        ''', (name, difficulty_easy, difficulty_medium, difficulty_hard, json.dumps(unit_ratios), now, strategy_id))

        conn.commit()
        if cursor.rowcount == 0:
            conn.close()
            return None

        strategy = dict_from_row(cursor.execute('SELECT * FROM strategy WHERE id = ?', (strategy_id,)).fetchone())
        conn.close()
        return strategy

    @staticmethod
    def delete(strategy_id: str) -> bool:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM strategy WHERE id = ?', (strategy_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
        conn.close()
        return deleted
