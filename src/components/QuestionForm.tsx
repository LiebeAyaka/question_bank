import React, { useState, useEffect } from 'react';
import type { Question, QuestionType, QuestionCreate, SubQuestion } from '@/types/question';
import { VALID_TYPES, TYPE_NAMES, LETTERS } from '@/types/question';
import { Modal } from './common/Modal';
import { useToast } from './common/Toast';
import styles from './QuestionForm.module.css';

interface QuestionFormProps {
  question?: Question | null;
  onSubmit: (data: QuestionCreate) => Promise<boolean>;
  onClose: () => void;
}

const initialFormData: QuestionCreate = {
  type: 'single',
  content: '',
  title: '',
  sub_type: 'single',
  options: ['', '', '', ''],
  answer: '',
  questions: [],
  blanks: [{ content: '', answer: '' }],
  exam_points: [],
  difficulty: 'easy',
  unit: 'Unit 1'
};

export function QuestionForm({ question, onSubmit, onClose }: QuestionFormProps) {
  const [formData, setFormData] = useState<QuestionCreate>(initialFormData);
  const [examPointsInput, setExamPointsInput] = useState('');
  const { showToast } = useToast();

  const isEditing = !!question;

  useEffect(() => {
    if (question) {
      setFormData({
        type: question.type,
        content: question.content || '',
        title: question.title || '',
        sub_type: question.sub_type || 'single',
        options: question.options || ['', '', '', ''],
        answer: question.answer || '',
        questions: question.questions || [],
        blanks: question.blanks || [{ content: '', answer: '' }],
        exam_points: question.exam_points || [],
        difficulty: question.difficulty || 'easy',
        unit: question.unit || 'Unit 1'
      });
      setExamPointsInput(question.exam_points?.join(', ') || '');
    } else {
      setFormData(initialFormData);
      setExamPointsInput('');
    }
  }, [question]);

  const handleTypeChange = (type: QuestionType) => {
    setFormData(prev => ({
      ...prev,
      type,
      options: type === 'single' ? ['', '', '', ''] : prev.options,
      blanks: type === 'fill' ? [{ content: '', answer: '' }] : prev.blanks,
      questions: ['reading', 'cloze', 'task_reading'].includes(type) ? [] : prev.questions
    }));
  };

  const handleContentChange = (content: string) => {
    setFormData(prev => ({ ...prev, content }));
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({ ...prev, title }));
  };

  const handleSubTypeChange = (sub_type: 'single' | 'judge') => {
    setFormData(prev => ({ ...prev, sub_type }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(formData.options || [])];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    if ((formData.options?.length || 0) < 8) {
      setFormData(prev => ({ ...prev, options: [...(prev.options || []), ''] }));
    }
  };

  const removeOption = (index: number) => {
    const newOptions = formData.options?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const handleAnswerChange = (answer: string) => {
    setFormData(prev => ({ ...prev, answer }));
  };

  const handleSubQuestionChange = (index: number, field: 'content' | 'answer', value: string) => {
    const newQuestions = [...(formData.questions || [])];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setFormData(prev => ({ ...prev, questions: newQuestions }));
  };

  const handleSubQuestionOptionChange = (qIndex: number, optIndex: number, value: string) => {
    const newQuestions = [...(formData.questions || [])];
    const options = [...(newQuestions[qIndex].options || [])];
    options[optIndex] = value;
    newQuestions[qIndex] = { ...newQuestions[qIndex], options };
    setFormData(prev => ({ ...prev, questions: newQuestions }));
  };

  const addSubQuestion = () => {
    const newQuestion: SubQuestion = { content: '', options: ['', '', '', ''], answer: '' };
    setFormData(prev => ({ ...prev, questions: [...(prev.questions || []), newQuestion] }));
  };

  const removeSubQuestion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions?.filter((_, i) => i !== index) || []
    }));
  };

  const handleBlankChange = (index: number, answer: string) => {
    const newBlanks = [...(formData.blanks || [])];
    newBlanks[index] = { ...newBlanks[index], answer };
    setFormData(prev => ({ ...prev, blanks: newBlanks }));
  };

  const addBlank = () => {
    setFormData(prev => ({ ...prev, blanks: [...(prev.blanks || []), { content: '', answer: '' }] }));
  };

  const removeBlank = (index: number) => {
    setFormData(prev => ({
      ...prev,
      blanks: prev.blanks?.filter((_, i) => i !== index) || []
    }));
  };

  const handleExamPointsChange = (value: string) => {
    setExamPointsInput(value);
    const exam_points = value.split(/[,，]/).map(t => t.trim()).filter(t => t);
    setFormData(prev => ({ ...prev, exam_points }));
  };

  const handleDifficultyChange = (difficulty: string) => {
    setFormData(prev => ({ ...prev, difficulty }));
  };

  const handleUnitChange = (unit: string) => {
    setFormData(prev => ({ ...prev, unit }));
  };

  const validateForm = (): boolean => {
    if (!formData.content.trim()) {
      showToast('请输入题目内容', 'warning');
      return false;
    }

    if (formData.type === 'single' && (!formData.options || formData.options.length < 2)) {
      showToast('单选题至少需要2个选项', 'warning');
      return false;
    }

    if (formData.type === 'single' && !formData.answer) {
      showToast('请选择正确答案', 'warning');
      return false;
    }

    if (formData.type === 'judge' && !formData.answer) {
      showToast('请选择正确答案', 'warning');
      return false;
    }

    if (formData.type === 'fill' && (!formData.blanks || formData.blanks.length === 0)) {
      showToast('请添加至少一个空位', 'warning');
      return false;
    }

    if (['reading', 'cloze', 'task_reading'].includes(formData.type)) {
      if (!formData.questions || formData.questions.length === 0) {
        showToast('请添加至少一道子问题', 'warning');
        return false;
      }
      for (let i = 0; i < formData.questions.length; i++) {
        if (formData.type !== 'cloze' && !formData.questions[i].content.trim()) {
          showToast(`请填写第${i + 1}道子问题的内容`, 'warning');
          return false;
        }
        if (formData.type !== 'task_reading' && !formData.questions[i].answer) {
          showToast(`请为第${i + 1}道子问题选择正确答案`, 'warning');
          return false;
        }
        if (formData.type !== 'task_reading' && formData.sub_type === 'single' && (!formData.questions[i].options || formData.questions[i].options!.length < 2)) {
          showToast(`第${i + 1}道子问题至少需要2个选项`, 'warning');
          return false;
        }
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const submitData: QuestionCreate = {
      type: formData.type,
      content: formData.content,
      title: formData.title || undefined,
      sub_type: ['reading', 'cloze'].includes(formData.type) ? formData.sub_type : undefined,
      options: formData.type === 'single' ? formData.options?.filter(o => o.trim()) : undefined,
      answer: formData.answer || undefined,
      questions: ['reading', 'cloze', 'task_reading'].includes(formData.type)
        ? formData.questions?.filter(q => q.content.trim())
        : undefined,
      blanks: formData.type === 'fill'
        ? formData.blanks?.filter(b => b.answer.trim())
        : undefined,
      exam_points: formData.exam_points?.length ? formData.exam_points : undefined,
      difficulty: formData.difficulty || undefined,
      unit: formData.unit || undefined
    };

    const success = await onSubmit(submitData);
    if (success) {
      showToast(isEditing ? '题目已更新' : '题目创建成功', 'success');
      onClose();
    } else {
      showToast(isEditing ? '更新失败' : '创建失败', 'error');
    }
  };

  const renderSingleOptions = () => {
    if (formData.type !== 'single') return null;

    return (
      <div className={styles.formGroup}>
        <label className={styles.label}>选项</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(formData.options || []).map((opt, idx) => (
            <div key={idx} className={styles.optionRow}>
              <span className={styles.optionLetter}>{LETTERS[idx]}</span>
              <input
                type="text"
                className={styles.input}
                placeholder={`选项 ${LETTERS[idx]}`}
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
              />
              {(formData.options?.length || 0) > 2 && (
                <button type="button" className={styles.removeBtn} onClick={() => removeOption(idx)}>✕</button>
              )}
            </div>
          ))}
          {(formData.options?.length || 0) < 8 && (
            <button type="button" className={styles.addOptionBtn} onClick={addOption}>➕ 添加选项</button>
          )}
        </div>
        <div className={styles.answerBtns}>
          {(formData.options || []).filter(o => o.trim()).map((opt, idx) => (
            <button
              key={idx}
              type="button"
              className={`${styles.answerBtn} ${formData.answer === opt ? styles.selected : ''}`}
              onClick={() => handleAnswerChange(opt)}
            >
              {LETTERS[idx]}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderJudgeAnswer = () => {
    if (formData.type !== 'judge') return null;

    return (
      <div className={styles.formGroup}>
        <label className={styles.label}>正确答案</label>
        <div className={styles.answerBtns}>
          <button
            type="button"
            className={`${styles.answerBtn} ${formData.answer === 'T' ? styles.selected : ''}`}
            onClick={() => handleAnswerChange('T')}
          >
            ✓ 正确 (T)
          </button>
          <button
            type="button"
            className={`${styles.answerBtn} ${formData.answer === 'V' ? styles.selected : ''}`}
            onClick={() => handleAnswerChange('V')}
          >
            ✓ 正确 (V)
          </button>
          <button
            type="button"
            className={`${styles.answerBtn} ${formData.answer === 'F' ? styles.selected : ''}`}
            onClick={() => handleAnswerChange('F')}
          >
            ✗ 错误
          </button>
        </div>
      </div>
    );
  };

  const renderSubQuestions = () => {
    if (!['reading', 'cloze', 'task_reading'].includes(formData.type)) return null;

    return (
      <div className={styles.subQuestionSection}>
        <label className={styles.label}>📝 子问题列表</label>
        <div className={styles.subQuestionList}>
          {(formData.questions || []).map((sq, idx) => (
            <div key={idx} className={styles.subQuestionItem}>
              <div className={styles.subQuestionHeader}>
                <span className={styles.subQuestionTitle}>
                  {formData.type === 'cloze' ? `空位 ${idx + 1}` : `子问题 ${idx + 1}`}
                </span>
                <button type="button" className={styles.removeBtn} onClick={() => removeSubQuestion(idx)}>🗑️</button>
              </div>

              {formData.type !== 'task_reading' && formData.type !== 'cloze' && (
                <>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="请输入问题内容"
                    value={sq.content}
                    onChange={(e) => handleSubQuestionChange(idx, 'content', e.target.value)}
                    style={{ marginBottom: '10px' }}
                  />
                </>
              )}
              {formData.sub_type === 'single' && (
                <div className={styles.subQuestionGrid}>
                  {[0, 1, 2, 3].map(optIdx => (
                    <div key={optIdx} style={{ display: 'flex', gap: '5px' }}>
                      <span className={styles.optionLetter} style={{ width: '24px', height: '24px', fontSize: '12px' }}>{LETTERS[optIdx]}</span>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder={`选项${LETTERS[optIdx]}`}
                        value={sq.options?.[optIdx] || ''}
                        onChange={(e) => handleSubQuestionOptionChange(idx, optIdx, e.target.value)}
                        style={{ fontSize: '14px', padding: '8px' }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.answerBtns} style={{ marginTop: '10px' }}>
                {formData.sub_type === 'single'
                  ? sq.options?.filter(o => o?.trim()).map((opt, optIdx) => (
                    <button
                      key={optIdx}
                      type="button"
                      className={`${styles.answerBtn} ${sq.answer === opt ? styles.selected : ''}`}
                      onClick={() => handleSubQuestionChange(idx, 'answer', opt)}
                    >
                      {LETTERS[optIdx]}
                    </button>
                  ))
                  : ['T', 'V', 'F'].map(v => (
                    <button
                      key={v}
                      type="button"
                      className={`${styles.answerBtn} ${sq.answer === v ? styles.selected : ''}`}
                      onClick={() => handleSubQuestionChange(idx, 'answer', v)}
                    >
                      {v === 'T' ? '✓ 正确 (T)' : v === 'V' ? '✓ 正确 (V)' : '✗ 错误'}
                    </button>
                  ))
                }
              </div>

              {formData.type === 'task_reading' && (
                <>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="请输入问题内容"
                    value={sq.content}
                    onChange={(e) => handleSubQuestionChange(idx, 'content', e.target.value)}
                    style={{ marginBottom: '10px' }}
                  />
                  <textarea
                    className={styles.textarea}
                    placeholder="请输入参考答案"
                    value={sq.answer}
                    onChange={(e) => handleSubQuestionChange(idx, 'answer', e.target.value)}
                    style={{ minHeight: '60px' }}
                  />
                </>
              )}
            </div>
          ))}
          <button type="button" className={styles.addOptionBtn} onClick={addSubQuestion}>
            ➕ 添加{formData.type === 'cloze' ? '空位' : '子问题'}
          </button>
        </div>
      </div>
    );
  };

  const renderFillBlanks = () => {
    if (formData.type !== 'fill') return null;

    return (
      <div className={styles.formGroup}>
        <label className={styles.label}>填空题空位</label>
        <div className={styles.blanksList}>
          {(formData.blanks || []).map((blank, idx) => (
            <div key={idx} className={styles.blankRow}>
              <span className={styles.blankNumber}>{idx + 1}</span>
              <input
                type="text"
                className={styles.input}
                placeholder="请输入答案"
                value={blank.answer}
                onChange={(e) => handleBlankChange(idx, e.target.value)}
              />
              {(formData.blanks?.length || 0) > 1 && (
                <button type="button" className={styles.removeBtn} onClick={() => removeBlank(idx)}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className={styles.addOptionBtn} onClick={addBlank}>➕ 添加空位</button>
        </div>
      </div>
    );
  };

  const renderShortAnswerOrEssay = () => {
    if (formData.type !== 'short_answer' && formData.type !== 'essay') return null;

    return (
      <div className={styles.formGroup}>
        <label className={styles.label}>
          {formData.type === 'essay' ? '评分标准（可选）' : '参考答案'}
        </label>
        <textarea
          className={styles.textarea}
          placeholder={formData.type === 'essay' ? '请输入评分标准（可选）' : '请输入参考答案'}
          value={formData.answer || ''}
          onChange={(e) => handleAnswerChange(e.target.value)}
          style={{ minHeight: '80px' }}
        />
      </div>
    );
  };

  return (
    <Modal title={isEditing ? '编辑题目' : '添加题目'} onClose={onClose}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.label}>题型</label>
          <select
            className={styles.select}
            value={formData.type}
            onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
            disabled={isEditing}
          >
            {VALID_TYPES.map(type => (
              <option key={type} value={type}>{TYPE_NAMES[type]}</option>
            ))}
          </select>
        </div>

        {(formData.type === 'reading' || formData.type === 'task_reading') && (
          <div className={styles.formGroup}>
            <label className={styles.label}>阅读材料标题（可选）</label>
            <input
              type="text"
              className={styles.input}
              placeholder="请输入标题"
              value={formData.title || ''}
              onChange={(e) => handleTitleChange(e.target.value)}
            />
          </div>
        )}

        {(formData.type === 'reading' || formData.type === 'cloze' || formData.type === 'task_reading') && (
          <div className={styles.formGroup}>
            <label className={styles.label}>
              {formData.type === 'cloze' ? '文章内容（用___1___、___2___等标记空位）' : '阅读材料内容'}
            </label>
            <textarea
              className={styles.textarea}
              placeholder={formData.type === 'cloze' ? '请输入文章内容，用___1___、___2___等标记空位...' : '请输入阅读材料内容...'}
              value={formData.content}
              onChange={(e) => handleContentChange(e.target.value)}
              style={{ minHeight: '150px' }}
            />
          </div>
        )}

        {formData.type === 'reading' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>子问题题型</label>
            <select
              className={styles.select}
              value={formData.sub_type || 'single'}
              onChange={(e) => handleSubTypeChange(e.target.value as 'single' | 'judge')}
            >
              <option value="single">单选题</option>
              <option value="judge">判断题</option>
            </select>
          </div>
        )}

        {['single', 'judge'].includes(formData.type) && (
          <div className={styles.formGroup}>
            <label className={styles.label}>题目内容</label>
            <textarea
              className={styles.textarea}
              placeholder="请输入题目内容"
              value={formData.content}
              onChange={(e) => handleContentChange(e.target.value)}
            />
          </div>
        )}

        {formData.type === 'single' && renderSingleOptions()}
        {formData.type === 'judge' && renderJudgeAnswer()}

        {['reading', 'cloze', 'task_reading'].includes(formData.type) && renderSubQuestions()}

        {formData.type === 'fill' && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>题目内容（用___1___、___2___等标记空位）</label>
              <textarea
                className={styles.textarea}
                placeholder="请输入填空题内容，用___1___、___2___等标记空位..."
                value={formData.content}
                onChange={(e) => handleContentChange(e.target.value)}
              />
            </div>
            {renderFillBlanks()}
          </>
        )}

        {['short_answer', 'essay'].includes(formData.type) && (
          <div className={styles.formGroup}>
            <label className={styles.label}>题目内容</label>
            <textarea
              className={styles.textarea}
              placeholder="请输入题目内容"
              value={formData.content}
              onChange={(e) => handleContentChange(e.target.value)}
            />
          </div>
        )}

        {['short_answer', 'essay'].includes(formData.type) && renderShortAnswerOrEssay()}

        <div className={styles.formGroup}>
          <label className={styles.label}>难度</label>
          <select
            className={styles.select}
            value={formData.difficulty}
            onChange={(e) => handleDifficultyChange(e.target.value)}
          >
            <option value="">请选择难度</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>单元标记</label>
          <input
            type="text"
            className={styles.input}
            placeholder="例如：Unit 1"
            value={formData.unit || ''}
            onChange={(e) => handleUnitChange(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>考点（用逗号分隔，可选）</label>
          <input
            type="text"
            className={styles.input}
            placeholder="例如：数学,代数,基础"
            value={examPointsInput}
            onChange={(e) => handleExamPointsChange(e.target.value)}
          />
          <span className={styles.tagHint}>多个考点用逗号分隔</span>
        </div>

        <div className={styles.btnRow}>
          <button type="submit" className={`${styles.btn} ${styles.btnSuccess}`}>
            💾 保存题目
          </button>
          <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onClose}>
            ✕ 取消
          </button>
        </div>
      </form>
    </Modal>
  );
}