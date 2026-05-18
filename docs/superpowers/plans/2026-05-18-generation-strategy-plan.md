# 出题策略管理功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现出题策略管理功能，支持按难度比例和单元比例智能出题，并扩展题目列表的多维度筛选

**Architecture:** 采用前后端分离架构。后端新增 strategy 表和 API；前端新增策略管理组件，与试卷生成模块集成；题目列表扩展筛选功能

**Tech Stack:** React + Zustand (前端), Flask + SQLite (后端), TypeScript

---

## 文件结构

### 新增文件

| 文件 | 职责 |
|------|------|
| `server/models/strategy.py` | Strategy 数据模型 |
| `server/routes/strategy.py` | Strategy API 路由 |
| `server/migrations/005_add_strategy_table.sql` | 数据库迁移 |
| `src/types/strategy.ts` | Strategy 类型定义 |
| `src/api/strategy.ts` | Strategy API 调用 |
| `src/stores/strategyStore.ts` | Strategy 状态管理 |
| `src/components/StrategyList.tsx` | 策略列表组件 |
| `src/components/StrategyForm.tsx` | 策略编辑表单组件 |

### 修改文件

| 文件 | 修改内容 |
|------|---------|
| `server/app.py` | 注册 strategy 路由 |
| `src/types/question.ts` | 添加筛选类型 |
| `src/stores/questionStore.ts` | 添加筛选状态 |
| `src/components/QuestionList.tsx` | 添加筛选器 UI |
| `src/components/PaperGenerator.tsx` | 集成策略选择 |

---

## Task 1: 数据库迁移 - 添加 strategy 表

**Files:**
- Create: `server/migrations/005_add_strategy_table.sql`

```sql
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

-- 题目表添加筛选索引（可选，提升查询性能）
CREATE INDEX IF NOT EXISTS idx_question_difficulty ON question(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_unit ON question(unit);
```

- [ ] **Step 1: 执行数据库迁移**

Run: `cd server; python migrations.py`

Expected: 输出 "Database initialized successfully"

- [ ] **Step 2: 提交**

```bash
git add server/migrations/005_add_strategy_table.sql
git commit -m "feat: add strategy table for generation rules"
```

---

## Task 2: 后端 - Strategy 模型

**Files:**
- Create: `server/models/strategy.py`

```python
import sqlite3
import json
from datetime import datetime
from typing import Optional, List, Dict

DATABASE_PATH = 'example.db'

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
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
```

- [ ] **Step 1: 创建文件**

创建 `server/models/strategy.py`

- [ ] **Step 2: 提交**

```bash
git add server/models/strategy.py
git commit -m "feat: add Strategy model"
```

---

## Task 3: 后端 - Strategy API 路由

**Files:**
- Create: `server/routes/strategy.py`

```python
from flask import Blueprint, request, jsonify
from models.strategy import StrategyModel

strategy_bp = Blueprint('strategy', __name__, url_prefix='/api/strategy')

@strategy_bp.route('', methods=['GET'])
def get_strategies():
    strategies = StrategyModel.get_all()
    for s in strategies:
        if s and 'unit_ratios' in s and s['unit_ratios']:
            import json
            s['unit_ratios'] = json.loads(s['unit_ratios'])
    return jsonify({'strategies': strategies})

@strategy_bp.route('', methods=['POST'])
def create_strategy():
    data = request.get_json()
    
    if not data.get('name'):
        return jsonify({'error': '策略名称不能为空'}), 400
    
    difficulty_easy = data.get('difficulty_easy', 30)
    difficulty_medium = data.get('difficulty_medium', 50)
    difficulty_hard = data.get('difficulty_hard', 20)
    unit_ratios = data.get('unit_ratios', {})
    
    strategy = StrategyModel.create(
        name=data['name'],
        difficulty_easy=difficulty_easy,
        difficulty_medium=difficulty_medium,
        difficulty_hard=difficulty_hard,
        unit_ratios=unit_ratios
    )
    
    if strategy and 'unit_ratios' in strategy:
        import json
        strategy['unit_ratios'] = json.loads(strategy['unit_ratios'])
    
    return jsonify({'strategy': strategy, 'message': '策略创建成功'}), 201

@strategy_bp.route('/<strategy_id>', methods=['GET'])
def get_strategy(strategy_id):
    strategy = StrategyModel.get_by_id(strategy_id)
    if not strategy:
        return jsonify({'error': '策略不存在'}), 404
    
    if strategy and 'unit_ratios' in strategy:
        import json
        strategy['unit_ratios'] = json.loads(strategy['unit_ratios'])
    
    return jsonify({'strategy': strategy})

@strategy_bp.route('/<strategy_id>', methods=['PUT'])
def update_strategy(strategy_id):
    data = request.get_json()
    
    strategy = StrategyModel.get_by_id(strategy_id)
    if not strategy:
        return jsonify({'error': '策略不存在'}), 404
    
    strategy = StrategyModel.update(
        strategy_id=strategy_id,
        name=data.get('name', strategy['name']),
        difficulty_easy=data.get('difficulty_easy', strategy['difficulty_easy']),
        difficulty_medium=data.get('difficulty_medium', strategy['difficulty_medium']),
        difficulty_hard=data.get('difficulty_hard', strategy['difficulty_hard']),
        unit_ratios=data.get('unit_ratios', json.loads(strategy['unit_ratios']) if strategy.get('unit_ratios') else {})
    )
    
    if strategy and 'unit_ratios' in strategy:
        import json
        strategy['unit_ratios'] = json.loads(strategy['unit_ratios'])
    
    return jsonify({'strategy': strategy, 'message': '策略更新成功'})

@strategy_bp.route('/<strategy_id>', methods=['DELETE'])
def delete_strategy(strategy_id):
    success = StrategyModel.delete(strategy_id)
    if not success:
        return jsonify({'error': '策略不存在'}), 404
    
    return jsonify({'message': '策略删除成功'})
```

- [ ] **Step 1: 创建文件**

创建 `server/routes/strategy.py`

- [ ] **Step 2: 修改 app.py 注册路由**

在 `server/app.py` 中添加：

```python
from routes.strategy import strategy_bp
app.register_blueprint(strategy_bp)
```

- [ ] **Step 3: 提交**

```bash
git add server/routes/strategy.py server/app.py
git commit -m "feat: add strategy API routes"
```

---

## Task 4: 前端 - Strategy 类型定义

**Files:**
- Create: `src/types/strategy.ts`

```typescript
export interface DifficultyRatio {
  easy: number;
  medium: number;
  hard: number;
}

export interface UnitRatio {
  [unit: string]: number;
}

export interface GenerationStrategy {
  id: string;
  name: string;
  difficulty_easy: number;
  difficulty_medium: number;
  difficulty_hard: number;
  unit_ratios: UnitRatio;
  created_at: string;
  updated_at?: string;
}

export interface StrategyCreate {
  name: string;
  difficulty_easy: number;
  difficulty_medium: number;
  difficulty_hard: number;
  unit_ratios: UnitRatio;
}

export interface StrategyUpdate {
  name?: string;
  difficulty_easy?: number;
  difficulty_medium?: number;
  difficulty_hard?: number;
  unit_ratios?: UnitRatio;
}

export const DIFFICULTY_PRESETS = {
  balanced: { easy: 30, medium: 50, hard: 20, label: '均衡型' },
  hard: { easy: 20, medium: 40, hard: 40, label: '偏难型' },
  easy: { easy: 50, medium: 40, hard: 10, label: '简单优先型' },
} as const;
```

- [ ] **Step 1: 创建文件**

创建 `src/types/strategy.ts`

- [ ] **Step 2: 提交**

```bash
git add src/types/strategy.ts
git commit -m "feat: add strategy types"
```

---

## Task 5: 前端 - Strategy API 调用

**Files:**
- Create: `src/api/strategy.ts`

```typescript
import axios from 'axios';
import type { GenerationStrategy, StrategyCreate, StrategyUpdate } from '@/types/strategy';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

export async function fetchStrategies(): Promise<GenerationStrategy[]> {
  const response = await api.get('/strategy');
  return response.data.strategies || [];
}

export async function fetchStrategy(id: string): Promise<GenerationStrategy> {
  const response = await api.get(`/strategy/${id}`);
  return response.data.strategy;
}

export async function createStrategy(data: StrategyCreate): Promise<GenerationStrategy> {
  const response = await api.post('/strategy', data);
  return response.data.strategy;
}

export async function updateStrategy(id: string, data: StrategyUpdate): Promise<GenerationStrategy> {
  const response = await api.put(`/strategy/${id}`, data);
  return response.data.strategy;
}

export async function deleteStrategy(id: string): Promise<void> {
  await api.delete(`/strategy/${id}`);
}
```

- [ ] **Step 1: 创建文件**

创建 `src/api/strategy.ts`

- [ ] **Step 2: 提交**

```bash
git add src/api/strategy.ts
git commit -m "feat: add strategy API client"
```

---

## Task 6: 前端 - Strategy Store

**Files:**
- Create: `src/stores/strategyStore.ts`

```typescript
import { create } from 'zustand';
import type { GenerationStrategy, StrategyCreate, StrategyUpdate } from '@/types/strategy';
import * as api from '@/api/strategy';

interface StrategyState {
  strategies: GenerationStrategy[];
  loading: boolean;
  error: string | null;
  
  loadStrategies: () => Promise<void>;
  createStrategy: (data: StrategyCreate) => Promise<GenerationStrategy | null>;
  updateStrategy: (id: string, data: StrategyUpdate) => Promise<GenerationStrategy | null>;
  deleteStrategy: (id: string) => Promise<boolean>;
}

export const useStrategyStore = create<StrategyState>((set, get) => ({
  strategies: [],
  loading: false,
  error: null,

  loadStrategies: async () => {
    set({ loading: true, error: null });
    try {
      const strategies = await api.fetchStrategies();
      set({ strategies, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createStrategy: async (data: StrategyCreate) => {
    try {
      const strategy = await api.createStrategy(data);
      set(state => ({ strategies: [strategy, ...state.strategies] }));
      return strategy;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  updateStrategy: async (id: string, data: StrategyUpdate) => {
    try {
      const strategy = await api.updateStrategy(id, data);
      set(state => ({
        strategies: state.strategies.map(s => s.id === id ? strategy : s)
      }));
      return strategy;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  deleteStrategy: async (id: string) => {
    try {
      await api.deleteStrategy(id);
      set(state => ({
        strategies: state.strategies.filter(s => s.id !== id)
      }));
      return true;
    } catch (e) {
      set({ error: (e as Error).message });
      return false;
    }
  }
}));
```

- [ ] **Step 1: 创建文件**

创建 `src/stores/strategyStore.ts`

- [ ] **Step 2: 提交**

```bash
git add src/stores/strategyStore.ts
git commit -m "feat: add strategy store"
```

---

## Task 7: 前端 - StrategyForm 组件

**Files:**
- Create: `src/components/StrategyForm.tsx`
- Create: `src/components/StrategyForm.module.css`

```typescript
import React, { useState } from 'react';
import type { GenerationStrategy, StrategyCreate, StrategyUpdate } from '@/types/strategy';
import { DIFFICULTY_PRESETS } from '@/types/strategy';
import { Modal } from './common/Modal';
import { useToast } from './common/Toast';
import styles from './StrategyForm.module.css';

interface StrategyFormProps {
  strategy?: GenerationStrategy | null;
  onSubmit: (data: StrategyCreate | StrategyUpdate) => Promise<boolean>;
  onClose: () => void;
}

export function StrategyForm({ strategy, onSubmit, onClose }: StrategyFormProps) {
  const [name, setName] = useState(strategy?.name || '');
  const [difficultyEasy, setDifficultyEasy] = useState(strategy?.difficulty_easy || 30);
  const [difficultyMedium, setDifficultyMedium] = useState(strategy?.difficulty_medium || 50);
  const [difficultyHard, setDifficultyHard] = useState(strategy?.difficulty_hard || 20);
  const [unitRatios, setUnitRatios] = useState<Record<string, string>>(transformUnitRatios(strategy?.unit_ratios));
  const [newUnit, setNewUnit] = useState('');
  const [newRatio, setNewRatio] = useState('');
  const { showToast } = useToast();

  const isEditing = !!strategy;

  function transformUnitRatios(ratios?: Record<string, number>): Record<string, string> {
    if (!ratios) return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(ratios)) {
      result[key] = String(Math.round(value * 100));
    }
    return result;
  }

  const handlePresetSelect = (preset: keyof typeof DIFFICULTY_PRESETS) => {
    const p = DIFFICULTY_PRESETS[preset];
    setDifficultyEasy(p.easy);
    setDifficultyMedium(p.medium);
    setDifficultyHard(p.hard);
  };

  const handleAddUnit = () => {
    if (!newUnit.trim() || !newRatio.trim()) return;
    setUnitRatios(prev => ({ ...prev, [newUnit.trim()]: newRatio.trim() }));
    setNewUnit('');
    setNewRatio('');
  };

  const handleRemoveUnit = (unit: string) => {
    setUnitRatios(prev => {
      const next = { ...prev };
      delete next[unit];
      return next;
    });
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      showToast('请输入策略名称', 'warning');
      return false;
    }
    if (difficultyEasy + difficultyMedium + difficultyHard !== 100) {
      showToast('难度比例之和必须等于100%', 'warning');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const unitRatiosNum: Record<string, number> = {};
    for (const [key, value] of Object.entries(unitRatios)) {
      const num = parseInt(value);
      if (isNaN(num) || num < 0 || num > 100) {
        showToast(`单元"${key}"的比例必须是0-100的数字`, 'warning');
        return;
      }
      unitRatiosNum[key] = num / 100;
    }

    const data = {
      name: name.trim(),
      difficulty_easy: difficultyEasy,
      difficulty_medium: difficultyMedium,
      difficulty_hard: difficultyHard,
      unit_ratios: unitRatiosNum
    };

    const success = await onSubmit(data as StrategyCreate);
    if (success) {
      showToast(isEditing ? '策略已更新' : '策略创建成功', 'success');
      onClose();
    } else {
      showToast(isEditing ? '更新失败' : '创建失败', 'error');
    }
  };

  return (
    <Modal title={isEditing ? '编辑策略' : '创建策略'} onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>策略名称</label>
          <input
            type="text"
            className={styles.input}
            placeholder="例如：期末考试策略"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>难度比例</label>
          <div className={styles.presetButtons}>
            {(Object.keys(DIFFICULTY_PRESETS) as Array<keyof typeof DIFFICULTY_PRESETS>).map(key => (
              <button
                key={key}
                type="button"
                className={styles.presetBtn}
                onClick={() => handlePresetSelect(key)}
              >
                {DIFFICULTY_PRESETS[key].label}
                <span className={styles.presetRatio}>
                  {DIFFICULTY_PRESETS[key].easy}:{DIFFICULTY_PRESETS[key].medium}:{DIFFICULTY_PRESETS[key].hard}
                </span>
              </button>
            ))}
          </div>
          <div className={styles.ratioInputs}>
            <div className={styles.ratioInput}>
              <label>简单</label>
              <input
                type="number"
                min="0"
                max="100"
                value={difficultyEasy}
                onChange={(e) => setDifficultyEasy(parseInt(e.target.value) || 0)}
              />
              <span>%</span>
            </div>
            <div className={styles.ratioInput}>
              <label>中等</label>
              <input
                type="number"
                min="0"
                max="100"
                value={difficultyMedium}
                onChange={(e) => setDifficultyMedium(parseInt(e.target.value) || 0)}
              />
              <span>%</span>
            </div>
            <div className={styles.ratioInput}>
              <label>困难</label>
              <input
                type="number"
                min="0"
                max="100"
                value={difficultyHard}
                onChange={(e) => setDifficultyHard(parseInt(e.target.value) || 0)}
              />
              <span>%</span>
            </div>
          </div>
          <div className={styles.ratioSum}>
            合计: {difficultyEasy + difficultyMedium + difficultyHard}% 
            {difficultyEasy + difficultyMedium + difficultyHard !== 100 && <span className={styles.error}> (必须等于100%)</span>}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>单元比例</label>
          <div className={styles.unitList}>
            {Object.entries(unitRatios).map(([unit, ratio]) => (
              <div key={unit} className={styles.unitItem}>
                <span>{unit}</span>
                <span>{ratio}%</span>
                <button type="button" className={styles.removeBtn} onClick={() => handleRemoveUnit(unit)}>✕</button>
              </div>
            ))}
          </div>
          <div className={styles.addUnitRow}>
            <input
              type="text"
              className={styles.input}
              placeholder="单元名称"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
            />
            <input
              type="number"
              className={styles.input}
              placeholder="%"
              min="0"
              max="100"
              value={newRatio}
              onChange={(e) => setNewRatio(e.target.value)}
            />
            <button type="button" className={styles.addBtn} onClick={handleAddUnit}>添加</button>
          </div>
          <p className={styles.hint}>不够时自动从其他单元补足</p>
        </div>

        <div className={styles.btnRow}>
          <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`}>
            {isEditing ? '💾 保存' : '➕ 创建'}
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
            取消
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

**CSS (StrategyForm.module.css)**:
```css
.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.formGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.label {
  font-weight: 600;
  color: #333;
}

.input {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.input:focus {
  outline: none;
  border-color: #007bff;
}

.presetButtons {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.presetBtn {
  padding: 8px 12px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.presetBtn:hover {
  background: #e0e0e0;
}

.presetRatio {
  font-size: 12px;
  color: #666;
}

.ratioInputs {
  display: flex;
  gap: 16px;
}

.ratioInput {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ratioInput label {
  min-width: 40px;
}

.ratioInput input {
  width: 70px;
  padding: 8px;
  text-align: center;
}

.ratioSum {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.ratioSum .error {
  color: #dc3545;
}

.unitList {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.unitItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8f8f8;
  border-radius: 6px;
}

.removeBtn {
  padding: 4px 8px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.addUnitRow {
  display: flex;
  gap: 8px;
  align-items: center;
}

.addBtn {
  padding: 10px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.hint {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.btnRow {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 12px;
}

.btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.btnPrimary {
  background: #28a745;
  color: white;
}

.btnSecondary {
  background: #6c757d;
  color: white;
}
```

- [ ] **Step 1: 创建 StrategyForm.tsx**

创建 `src/components/StrategyForm.tsx`

- [ ] **Step 2: 创建 StrategyForm.module.css**

创建 `src/components/StrategyForm.module.css`

- [ ] **Step 3: 提交**

```bash
git add src/components/StrategyForm.tsx src/components/StrategyForm.module.css
git commit -m "feat: add StrategyForm component"
```

---

## Task 8: 前端 - StrategyList 组件

**Files:**
- Create: `src/components/StrategyList.tsx`
- Create: `src/components/StrategyList.module.css`

```typescript
import React, { useEffect, useState } from 'react';
import { useStrategyStore } from '@/stores/strategyStore';
import { StrategyForm } from './StrategyForm';
import { useToast } from './common/Toast';
import type { GenerationStrategy, StrategyCreate, StrategyUpdate } from '@/types/strategy';
import styles from './StrategyList.module.css';

interface StrategyListProps {
  onSelect?: (strategy: GenerationStrategy) => void;
  selectedId?: string;
}

export function StrategyList({ onSelect, selectedId }: StrategyListProps) {
  const { strategies, loading, error, loadStrategies, createStrategy, updateStrategy, deleteStrategy } = useStrategyStore();
  const [showForm, setShowForm] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<GenerationStrategy | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadStrategies();
  }, []);

  const handleCreate = async (data: StrategyCreate | StrategyUpdate) => {
    const result = await createStrategy(data as StrategyCreate);
    return !!result;
  };

  const handleUpdate = async (data: StrategyCreate | StrategyUpdate) => {
    if (!editingStrategy) return false;
    const result = await updateStrategy(editingStrategy.id, data as StrategyUpdate);
    return !!result;
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个策略吗？')) return;
    const success = await deleteStrategy(id);
    if (success) {
      showToast('策略已删除', 'success');
    } else {
      showToast('删除失败', 'error');
    }
  };

  const handleEdit = (strategy: GenerationStrategy) => {
    setEditingStrategy(strategy);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingStrategy(null);
  };

  const formatDifficulty = (s: GenerationStrategy) => {
    return `${s.difficulty_easy}%:${s.difficulty_medium}%:${s.difficulty_hard}%`;
  };

  const formatUnits = (unitRatios?: Record<string, number>) => {
    if (!unitRatios || Object.keys(unitRatios).length === 0) return '不限';
    return Object.entries(unitRatios)
      .map(([unit, ratio]) => `${unit}(${Math.round(ratio * 100)}%)`)
      .join(', ');
  };

  if (loading) return <div className={styles.loading}>⏳ 加载中...</div>;
  if (error) return <div className={styles.error}>❌ {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>📋 出题策略</h3>
        <button className={styles.addBtn} onClick={() => setShowForm(true)}>+ 新建策略</button>
      </div>

      {strategies.length === 0 ? (
        <div className={styles.empty}>暂无策略，点击上方按钮创建</div>
      ) : (
        <div className={styles.list}>
          {strategies.map(strategy => (
            <div 
              key={strategy.id} 
              className={`${styles.card} ${selectedId === strategy.id ? styles.selected : ''}`}
              onClick={() => onSelect?.(strategy)}
            >
              <div className={styles.cardHeader}>
                <h4 className={styles.cardTitle}>{strategy.name}</h4>
                <div className={styles.cardActions}>
                  <button className={styles.editBtn} onClick={(e) => { e.stopPropagation(); handleEdit(strategy); }}>编辑</button>
                  <button className={styles.deleteBtn} onClick={(e) => { e.stopPropagation(); handleDelete(strategy.id); }}>删除</button>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>难度比例：</span>
                  <span className={styles.infoValue}>{formatDifficulty(strategy)}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>单元比例：</span>
                  <span className={styles.infoValue}>{formatUnits(strategy.unit_ratios)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <StrategyForm
          strategy={editingStrategy}
          onSubmit={editingStrategy ? handleUpdate : handleCreate}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
```

**CSS (StrategyList.module.css)**:
```css
.container {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.title {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.addBtn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.loading, .error, .empty {
  text-align: center;
  padding: 24px;
  color: #666;
}

.error {
  color: #dc3545;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.card:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
}

.card.selected {
  border-color: #007bff;
  background: #f0f7ff;
}

.cardHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.cardTitle {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.cardActions {
  display: flex;
  gap: 8px;
}

.editBtn, .deleteBtn {
  padding: 4px 12px;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.editBtn {
  background: #007bff;
  color: white;
}

.deleteBtn {
  background: #dc3545;
  color: white;
}

.cardBody {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.infoRow {
  display: flex;
  font-size: 13px;
}

.infoLabel {
  color: #666;
  min-width: 70px;
}

.infoValue {
  color: #333;
}
```

- [ ] **Step 1: 创建 StrategyList.tsx**

创建 `src/components/StrategyList.tsx`

- [ ] **Step 2: 创建 StrategyList.module.css**

创建 `src/components/StrategyList.module.css`

- [ ] **Step 3: 提交**

```bash
git add src/components/StrategyList.tsx src/components/StrategyList.module.css
git commit -m "feat: add StrategyList component"
```

---

## Task 9: 扩展题目列表筛选功能

**Files:**
- Modify: `src/stores/questionStore.ts`
- Modify: `src/components/QuestionList.tsx`
- Modify: `server/routes/questions.py`

### 9.1 更新 questionStore

在 `questionStore.ts` 中添加筛选状态：

```typescript
// 添加到 interface QuestionState
filterDifficulty: string;
filterUnits: string[];

// 添加到 state 初始值
filterDifficulty: '',
filterUnits: [],

// 添加方法
setFilterDifficulty: (difficulty: string) => void;
setFilterUnits: (units: string[]) => void;
```

在 `loadQuestions` 中传递筛选参数：
```typescript
const questions = await api.fetchQuestions(
  filterType || undefined,
  filterSearch || undefined,
  abortController.signal,
  get().filterDifficulty || undefined,
  get().filterUnits,
  // ... 其他筛选参数
);
```

- [ ] **Step 1: 更新 questionStore.ts**

- [ ] **Step 2: 更新 questions API 调用**

在 `src/api/questions.ts` 中添加参数：
```typescript
export async function fetchQuestions(
  type?: string,
  search?: string,
  signal?: AbortSignal,
  difficulty?: string,
  units?: string[],
  examPoints?: string
): Promise<Question[]> {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (search) params.append('search', search);
  if (difficulty) params.append('difficulty', difficulty);
  if (units && units.length > 0) params.append('units', units.join(','));
  if (examPoints) params.append('exam_points', examPoints);
  
  const response = await api.get(`/questions?${params.toString()}`, { signal });
  return response.data.questions || [];
}
```

- [ ] **Step 3: 更新 QuestionList.tsx**

添加筛选器 UI：
```typescript
// 在 filterBar 中添加
<div className={styles.filterGroup}>
  <select
    value={filterDifficulty}
    onChange={(e) => setFilterDifficulty(e.target.value)}
  >
    <option value="">难度：全部</option>
    <option value="easy">简单</option>
    <option value="medium">中等</option>
    <option value="hard">困难</option>
  </select>
</div>

<div className={styles.filterGroup}>
  <select
    value={filterUnits[0] || ''}
    onChange={(e) => setFilterUnits(e.target.value ? [e.target.value] : [])}
  >
    <option value="">单元：全部</option>
    {uniqueUnits.map(unit => (
      <option key={unit} value={unit}>{unit}</option>
    ))}
  </select>
</div>

<div className={styles.filterGroup}>
  <input
    type="text"
    placeholder="考点筛选"
    onChange={(e) => setFilterExamPoints(e.target.value)}
  />
</div>
```

- [ ] **Step 4: 更新后端 API**

在 `server/routes/questions.py` 的 `get_questions` 函数中添加筛选逻辑：
```python
@questions_bp.route('', methods=['GET'])
def get_questions():
    type_filter = request.args.get('type')
    search = request.args.get('search')
    difficulty = request.args.get('difficulty')
    units = request.args.get('units')
    exam_points = request.args.get('exam_points')
    
    # ... 现有查询逻辑基础上添加
    if difficulty:
        query = query.filter(QuestionModel.difficulty == difficulty)
    if units:
        unit_list = units.split(',')
        query = query.filter(QuestionModel.unit.in_(unit_list))
    if exam_points:
        query = query.filter(QuestionModel.exam_points.like(f'%{exam_points}%'))
```

- [ ] **Step 5: 提交**

```bash
git add src/stores/questionStore.ts src/api/questions.ts src/components/QuestionList.tsx server/routes/questions.py
git commit -m "feat: add question list filters for difficulty, unit and exam points"
```

---

## Task 10: 集成策略到试卷生成

**Files:**
- Modify: `src/components/PaperGenerator.tsx`
- Modify: `src/stores/paperStore.ts`

### 10.1 更新 paperStore

添加策略相关状态：
```typescript
selectedStrategyId: string | null;

// 添加方法
setSelectedStrategyId: (id: string | null) => void;
```

### 10.2 更新 PaperGenerator

在试卷标题下方添加策略选择器：
```tsx
<div className={styles.strategySelector}>
  <label>出题策略</label>
  <select
    value={selectedStrategyId || ''}
    onChange={(e) => setSelectedStrategyId(e.target.value || null)}
  >
    <option value="">自定义（不使用策略）</option>
    {strategies.map(s => (
      <option key={s.id} value={s.id}>{s.name}</option>
    ))}
  </select>
</div>
```

加载策略并应用：
```typescript
const { strategies, loadStrategies } = useStrategyStore();

// 在 useEffect 中加载策略
useEffect(() => { loadStrategies(); }, []);
```

### 10.3 实现智能出题逻辑

在 `paperStore.ts` 的 `generatePaper` 方法中添加：
```typescript
generatePaper: (questions: Question[]) => {
  // 1. 读取策略配置
  const strategy = strategies.find(s => s.id === selectedStrategyId);
  
  // 2. 按难度和单元比例筛选题目
  let filtered = questions;
  if (strategy) {
    filtered = questions.filter(q => {
      // 检查难度
      const difficultyMatch = checkDifficulty(q, strategy);
      // 检查单元
      const unitMatch = checkUnit(q, strategy);
      return difficultyMatch && unitMatch;
    });
  }
  
  // 3. 从筛选结果中按大题类型抽取
  // ... 现有逻辑
}
```

- [ ] **Step 1: 更新 paperStore.ts**

添加策略选择状态和方法

- [ ] **Step 2: 更新 PaperGenerator.tsx**

添加策略选择器和应用逻辑

- [ ] **Step 3: 实现智能出题算法**

在 `paperStore.ts` 中实现按比例抽取逻辑

- [ ] **Step 4: 提交**

```bash
git add src/stores/paperStore.ts src/components/PaperGenerator.tsx
git commit -m "feat: integrate strategy into paper generator"
```

---

## Task 11: 端到端测试

- [ ] **Step 1: 测试策略 CRUD**

1. 创建新策略（选择难度预设 + 添加单元比例）
2. 编辑策略
3. 删除策略

- [ ] **Step 2: 测试题目列表筛选**

1. 按难度筛选
2. 按单元筛选
3. 按考点筛选
4. 组合筛选

- [ ] **Step 3: 测试试卷生成**

1. 选择策略后生成试卷
2. 验证生成的试卷难度分布
3. 验证生成的试卷单元分布

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "test: add E2E tests for generation strategy feature"
```

---

## 总结

实现完成后，系统将支持：
1. 创建和管理多个出题策略模板
2. 按预设的难度比例和单元比例智能出题
3. 题目列表支持难度、单元、考点多维度筛选

**预计文件变更**：
- 新增 12 个文件
- 修改 6 个现有文件