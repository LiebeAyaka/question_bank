import { useState, useEffect, useRef } from 'react';
import { useQuestionStore } from '@/stores/questionStore';
import { QuestionList } from '@/components/QuestionList';
import { QuestionForm } from '@/components/QuestionForm';
import { PaperGenerator } from '@/components/PaperGenerator';
import { ToastProvider } from '@/components/common/Toast';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useToast } from '@/components/common/Toast';
import type { Question, QuestionCreate } from '@/types/question';
import styles from './App.module.css';

type Tab = 'list' | 'paper';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [showForm, setShowForm] = useState(false);
  const { editingQuestion, setEditingQuestion, createQuestion, updateQuestion, loadQuestions, initialized, hasData, seedFromExample, setHasData } = useQuestionStore();
  const { showToast } = useToast();

  // 使用 ref 稳定 loadQuestions 引用，避免 useEffect 依赖警告
  const loadQuestionsRef = useRef(loadQuestions);
  loadQuestionsRef.current = loadQuestions;

  useEffect(() => {
    if (!initialized) {
      loadQuestionsRef.current();
    }
  }, [initialized]);

  // 检查数据库状态
  useEffect(() => {
    const checkDbStatus = async () => {
      try {
        const response = await fetch('/api/status');
        if (!response.ok) return;
        const data = await response.json();
        setHasData(data.has_data);
      } catch {
        // 忽略错误
      }
    };
    checkDbStatus();
  }, []);

  const handleSeedFromExample = async () => {
    const success = await seedFromExample();
    if (success) {
      showToast('示例数据导入成功', 'success');
    } else {
      showToast('示例数据导入失败', 'error');
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setEditingQuestion(null);
    setShowForm(false);
  };

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setShowForm(true);
  };

  const handleSubmit = async (data: QuestionCreate) => {
    if (editingQuestion) {
      return await updateQuestion(editingQuestion.id, data);
    } else {
      return await createQuestion(data);
    }
  };

  return (
    <div className={styles.app}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>📚 西班牙语题库系统</h1>
        </div>

        <div className={styles.navTabs}>
          <button
            className={`${styles.navTab} ${activeTab === 'list' ? styles.active : ''}`}
            onClick={() => setActiveTab('list')}
          >
            📋 题目列表
          </button>
          <button
            className={`${styles.navTab} ${activeTab === 'paper' ? styles.active : ''}`}
            onClick={() => setActiveTab('paper')}
          >
            📄 生成试卷
          </button>
        </div>

        <div className={styles.mainContent}>
          <div className={`${styles.section} ${activeTab === 'list' ? styles.active : ''}`}>
            <div className={styles.sectionTitle}>
              <span>题目列表</span>
              {!hasData && (
                <button className={styles.addQuestionBtn} onClick={handleSeedFromExample}>
                  📥 启用示例题目
                </button>
              )}
              {hasData && (
                <button className={styles.addQuestionBtn} onClick={handleAddQuestion}>
                  + 添加题目
                </button>
              )}
            </div>
            <QuestionList onEdit={handleEdit} />
          </div>

          <div className={`${styles.section} ${activeTab === 'paper' ? styles.active : ''}`}>
            <div className={styles.sectionTitle}>📄 生成试卷</div>
            <div className={styles.paperSection}>
              <PaperGenerator />
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <QuestionForm
          question={editingQuestion}
          onSubmit={handleSubmit}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ErrorBoundary onReset={() => window.location.reload()}>
        <AppContent />
      </ErrorBoundary>
    </ToastProvider>
  );
}