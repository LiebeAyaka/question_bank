import { useState } from 'react';
import type { Question, QuestionType } from '@/types/question';
import { TYPE_NAMES, LETTERS, DIFFICULTY_NAMES } from '@/types/question';
import { unescapeHtml } from '@/utils/escapeHtml';
import styles from './QuestionCard.module.css';

interface QuestionCardProps {
  question: Question;
  onEdit: (question: Question) => void;
  onDelete: (id: string) => void;
}

export function QuestionCard({ question, onEdit, onDelete }: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderSubQuestions = () => {
    if (!question.questions) return null;
    const showContent = question.type !== 'cloze';

    return question.questions.map((sq, idx) => (
      <div key={idx} className={styles.subQuestionItem}>
        <div className={styles.questionText}>
          {idx + 1}. {showContent ? unescapeHtml(sq.content) : ''}
          {!sq.options && <span className={styles.fillAnswer}>（答案：{unescapeHtml(sq.answer)}）</span>}
        </div>
        {sq.options && sq.options.length > 0 && (
          <div className={styles.options}>
            {sq.options.map((opt, optIdx) => (
              <div key={optIdx} className={styles.optionItem}>
                <span className={styles.optionLetter}>{LETTERS[optIdx]}</span>
                <span>{unescapeHtml(opt)}</span>
              </div>
            ))}
          </div>
        )}
        {sq.options && sq.options.length > 0 && (
          <div className={styles.answerDisplay}>
            <span className={styles.answerLabel}>答案：</span>
            {LETTERS[sq.options.findIndex(o => o === sq.answer)] || sq.answer}
          </div>
        )}
        {question.sub_type === 'judge' && (
          <div className={styles.options}>
            <div className={styles.optionItem}>
              <span className={styles.optionLetter}>A</span>
              <span>正确</span>
            </div>
            <div className={styles.optionItem}>
              <span className={styles.optionLetter}>B</span>
              <span>错误</span>
            </div>
          </div>
        )}
      </div>
    ));
  };

  const renderBlanks = () => {
    if (!question.blanks) return null;

    return (
      <div className={styles.blanksList}>
        {question.blanks.map((blank, idx) => (
          <div key={idx} className={styles.blankItem}>
            <span className={styles.blankNumber}>{idx + 1}</span>
            <span>{unescapeHtml(blank.answer)}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderOptions = () => {
    if (!question.options || question.options.length === 0) return null;

    return (
      <div className={styles.options}>
        {question.options.map((opt, idx) => {
          const isCorrect = question.answer === opt;
          return (
            <div key={idx} className={`${styles.optionItem} ${isCorrect ? styles.correct : ''}`}>
              <span className={styles.optionLetter}>{LETTERS[idx]}</span>
              <span>{unescapeHtml(opt)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderJudgeOptions = () => {
    if (question.type !== 'judge') return null;

    return (
      <div className={styles.options}>
        <div className={`${styles.optionItem} ${question.answer === 'T' || question.answer === 'V' ? styles.correct : ''}`}>
          <span className={styles.optionLetter}>A</span>
          <span>正确</span>
        </div>
        <div className={`${styles.optionItem} ${question.answer === 'F' ? styles.correct : ''}`}>
          <span className={styles.optionLetter}>B</span>
          <span>错误</span>
        </div>
      </div>
    );
  };

  const renderAnswer = () => {
    if (question.type === 'single') return null;
    if (question.type === 'judge') return null;
    if (question.type === 'fill') return null;
    if (!question.answer) return null;

    const label = question.type === 'essay' ? '评分标准' : '参考答案';

    return (
      <div className={styles.answerDisplay}>
        <span className={styles.answerLabel}>{label}：</span>
        {unescapeHtml(question.answer)}
      </div>
    );
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.tagType}>{TYPE_NAMES[question.type as QuestionType]}</span>
          {(() => {
            const difficulty = question.difficulty || 'easy';
            return (
              <span className={`${styles.tag} ${styles[`difficulty_${difficulty}`]}`}>
                {DIFFICULTY_NAMES[difficulty] || difficulty}
              </span>
            );
          })()}
          {(question.type === 'reading' || question.type === 'cloze' || question.type === 'task_reading') && question.questions && (
            <span className={styles.tag}>
              {question.type === 'cloze' ? `${question.questions.length}个空位` : `${question.questions.length}道子题`}
            </span>
          )}
          {question.unit && (
            <span className={styles.tag}>{question.unit}</span>
          )}
        </div>
        <div className={styles.actions}>
          <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => onEdit(question)}>
            ✏️ 编辑
          </button>
          <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => onDelete(question.id)}>
            🗑️ 删除
          </button>
        </div>
      </div>
      {(question.type === 'reading' || question.type === 'task_reading') && (
        <>
          <div className={styles.readingBox}>
            {question.title && <div className={styles.readingTitle}>{unescapeHtml(question.title)}</div>}
            {question.content && (
              <div className={styles.questionText}>
                {unescapeHtml(question.content)}
              </div>
            )}
            {question.type === 'reading' && (
              <div className={styles.subQuestionLabel}>
                子问题题型：{question.sub_type === 'single' ? '单选题' : '判断题'}
              </div>
            )}
            {question.type === 'task_reading' && (
              <div className={styles.subQuestionLabel}>子问题为文本作答</div>
            )}
          </div>
          {question.questions && question.questions.length > 0 && (
            <button
              type="button"
              className={styles.expandBtn}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▲ 收起' : '▼ 展开'}
            </button>
          )}
          {isExpanded && (
            <>
              {renderSubQuestions()}
              <button
                type="button"
                className={styles.expandBtn}
                onClick={() => setIsExpanded(false)}
              >
                ▲ 收起
              </button>
            </>
          )}
        </>
      )}

      {question.type === 'fill' && (
        <>
          <div className={styles.content}>{unescapeHtml(question.content)}</div>
          {renderBlanks()}
        </>
      )}

      {(question.type === 'short_answer' || question.type === 'essay') && (
        <>
          <div className={styles.content}>{unescapeHtml(question.content)}</div>
          {renderAnswer()}
        </>
      )}

      {question.type === 'cloze' && (
        <>
          <div className={styles.readingBox}>
            <div className={styles.questionText}>{unescapeHtml(question.content)}</div>
          </div>
          <div className={styles.subQuestionLabel}>（共 {question.questions?.length || 0} 个空位）</div>
          {question.questions && question.questions.length > 0 && (
            <button
              type="button"
              className={styles.expandBtn}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▲ 收起' : '▼ 展开'}
            </button>
          )}
          {isExpanded && (
            <>
              {renderSubQuestions()}
              <button
                type="button"
                className={styles.expandBtn}
                onClick={() => setIsExpanded(false)}
              >
                ▲ 收起
              </button>
            </>
          )}
        </>
      )}

      {(question.type === 'single') && (
        <>
          <div className={styles.content}>{unescapeHtml(question.content)}</div>
          {renderOptions()}
        </>
      )}

      {question.type === 'judge' && (
        <>
          <div className={styles.content}>{unescapeHtml(question.content)}</div>
          {renderJudgeOptions()}
        </>
      )}

      {(question.type === 'listening_single' || question.type === 'listening_group') && (
        <>
          <div className={styles.listeningMaterial}>
            <div className={styles.listeningLabel}>🎧 听力材料</div>
            <div className={styles.listeningContent}>{unescapeHtml(question.content)}</div>
          </div>
          <div className={styles.subQuestionLabel}>
            {question.type === 'listening_single' 
              ? '题目' 
              : `共 ${question.questions?.length || 0} 道子题`}
          </div>
          {question.questions && question.questions.length > 0 && (
            <button
              type="button"
              className={styles.expandBtn}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▲ 收起' : '▼ 展开'}
            </button>
          )}
          {isExpanded && (
            <>
              {renderSubQuestions()}
              <button
                type="button"
                className={styles.expandBtn}
                onClick={() => setIsExpanded(false)}
              >
                ▲ 收起
              </button>
            </>
          )}
        </>
      )}

      {question.exam_points && question.exam_points.length > 0 && (
        <div className={styles.tags}>
          考点：{question.exam_points.map(t => unescapeHtml(t)).join(', ')}
        </div>
      )}
    </div>
  );
}