import { useRef } from 'react';
import { useQuestionStore } from '@/stores/questionStore';
import { QuestionCard } from './QuestionCard';
import { useToast } from './common/Toast';
import type { QuestionType } from '@/types/question';
import { VALID_TYPES, TYPE_NAMES } from '@/types/question';
import styles from './QuestionList.module.css';

import type { Question } from '@/types/question';

interface QuestionListProps {
  onEdit: (question: Question) => void;
}

export function QuestionList({ onEdit }: QuestionListProps) {
  const {
    questions, loading, error, filterType, filterSearch, filterDifficulty, filterUnits, filterExamPoints,
    deleteQuestion, setFilterType, setFilterSearch, setFilterDifficulty, setFilterUnits, setFilterExamPoints
  } = useQuestionStore();
  const { showToast } = useToast();

  const searchTimeoutRef = useRef<number | null>(null);
  const handleSearchInput = (value: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = window.setTimeout(() => {
      setFilterSearch(value);
    }, 300);
  };

  const uniqueUnits = Array.from(new Set(questions.map(q => q.unit).filter(Boolean) as string[])).sort();

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这道题目吗？')) return;
    const success = await deleteQuestion(id);
    if (success) {
      showToast('题目已删除', 'success');
    } else {
      showToast('删除失败', 'error');
    }
  };

  return (
    <div>
      <div className={styles.filterBar}>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as QuestionType | '')}
        >
          <option value="">全部题型</option>
          {VALID_TYPES.map(type => (
            <option key={type} value={type}>{TYPE_NAMES[type]}</option>
          ))}
        </select>
        <select
          value={filterDifficulty}
          onChange={(e) => setFilterDifficulty(e.target.value)}
        >
          <option value="">难度：全部</option>
          <option value="easy">简单</option>
          <option value="medium">中等</option>
          <option value="hard">困难</option>
        </select>
        <select
          value={filterUnits[0] || ''}
          onChange={(e) => setFilterUnits(e.target.value ? [e.target.value] : [])}
        >
          <option value="">单元：全部</option>
          {uniqueUnits.map(unit => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="考点筛选..."
          value={filterExamPoints}
          onChange={(e) => setFilterExamPoints(e.target.value)}
        />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="搜索题目内容..."
          defaultValue={filterSearch}
          onChange={(e) => handleSearchInput(e.target.value)}
        />
      </div>

      {loading && (
        <div className={styles.loading}>⏳ 加载中...</div>
      )}

      {error && (
        <div className={styles.error}>
          ❌ 加载失败: {error}
          <button className={styles.retryBtn} onClick={() => useQuestionStore.getState().loadQuestions()}>
            🔄 重试
          </button>
        </div>
      )}

      {!loading && !error && questions.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <p>暂无题目</p>
        </div>
      )}

      {!loading && !error && questions.length > 0 && (
        <div className={styles.questionList}>
          {questions.map(question => (
            <QuestionCard
              key={question.id}
              question={question}
              onEdit={onEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}