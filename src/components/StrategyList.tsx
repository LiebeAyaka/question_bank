import { useEffect, useState } from 'react';
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