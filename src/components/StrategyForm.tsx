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