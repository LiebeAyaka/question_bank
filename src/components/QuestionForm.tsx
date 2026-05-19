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

const SEMESTER_OPTIONS = ['高一上', '高一下', '高二上', '高二下', '高三上', '高三下'];

const UNIT_OPTIONS = Array.from({ length: 16 }, (_, i) => `Unidad ${i + 1}`);

function parseUnit(unitStr: string): [string, string] {
  if (!unitStr) return ['', ''];
  const parts = unitStr.split('-');
  if (parts.length >= 2) {
    return [parts[0], parts.slice(1).join('-')];
  }
  if (SEMESTER_OPTIONS.includes(parts[0])) {
    return [parts[0], ''];
  }
  return ['', unitStr];
}

function buildUnit(semester: string, unit: string): string {
  if (semester && unit) return `${semester}-${unit}`;
  if (semester) return semester;
  if (unit) return unit;
  return '';
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
  unit: ''
};

export function QuestionForm({ question, onSubmit, onClose }: QuestionFormProps) {
  const [formData, setFormData] = useState<QuestionCreate>(initialFormData);
  const [examPointsInput, setExamPointsInput] = useState('');
  const [semester, setSemester] = useState('');
  const [unit, setUnit] = useState('');
  const [semesterCustomMode, setSemesterCustomMode] = useState(false);
  const [unitCustomMode, setUnitCustomMode] = useState(false);
  const [semesterCustomValue, setSemesterCustomValue] = useState('');
  const [unitCustomValue, setUnitCustomValue] = useState('');
  const { showToast } = useToast();

  const isEditing = !!question;

  useEffect(() => {
    if (question) {
      const [sem, uni] = parseUnit(question.unit || '');
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
        unit: question.unit || ''
      });
      setExamPointsInput(question.exam_points?.join(', ') || '');
      setSemester(sem);
      setUnit(uni);
      setSemesterCustomMode(false);
      setUnitCustomMode(false);
      setSemesterCustomValue('');
      setUnitCustomValue('');
    } else {
      setFormData(initialFormData);
      setExamPointsInput('');
      setSemester('');
      setUnit('');
      setSemesterCustomMode(false);
      setUnitCustomMode(false);
      setSemesterCustomValue('');
      setUnitCustomValue('');
    }
  }, [question]);

  const handleTypeChange = (type: QuestionType) => {
    setFormData(prev => ({
      ...prev,
      type,
      options: type === 'single' ? ['', '', '', ''] : prev.options,
      blanks: type === 'fill' ? [{ content: '', answer: '' }] : prev.blanks,
      questions: type === 'listening_single' 
        ? [{ content: '', options: ['', '', '', ''], answer: '' }] 
        : ['reading', 'cloze', 'listening_group'].includes(type) ? [] 
        : prev.questions
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

  const handleSubQuestionTypeChange = (index: number, type: 'single' | 'fill') => {
    const newQuestions = [...(formData.questions || [])];
    if (type === 'single') {
      newQuestions[index] = { content: newQuestions[index].content, options: ['A. ', 'B. ', 'C. ', 'D. '], answer: '' };
    } else {
      newQuestions[index] = { content: newQuestions[index].content, answer: '' };
      if (newQuestions[index].options) delete newQuestions[index].options;
    }
    setFormData(prev => ({ ...prev, questions: newQuestions }));
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

  const handleSemesterSelect = (value: string) => {
    if (value === '__custom__') {
      setSemesterCustomMode(true);
      setSemester('');
    } else {
      setSemester(value);
      setSemesterCustomMode(false);
      setSemesterCustomValue('');
      updateFormUnit();
    }
  };

  const handleUnitSelect = (value: string) => {
    if (value === '__custom__') {
      setUnitCustomMode(true);
      setUnit('');
    } else {
      setUnit(value);
      setUnitCustomMode(false);
      setUnitCustomValue('');
      updateFormUnit();
    }
  };

  const handleSemesterCustomChange = (value: string) => {
    setSemesterCustomValue(value);
    setSemester(value);
    updateFormUnit();
  };

  const handleUnitCustomChange = (value: string) => {
    setUnitCustomValue(value);
    setUnit(value);
    updateFormUnit();
  };

  const resetSemesterToSelect = () => {
    setSemesterCustomMode(false);
    setSemesterCustomValue('');
    setSemester('');
    updateFormUnit();
  };

  const resetUnitToSelect = () => {
    setUnitCustomMode(false);
    setUnitCustomValue('');
    setUnit('');
    updateFormUnit();
  };

  const updateFormUnit = () => {
    const sem = semesterCustomMode ? semesterCustomValue : semester;
    const uni = unitCustomMode ? unitCustomValue : unit;
    setFormData(prev => ({ ...prev, unit: buildUnit(sem, uni) }));
  };

  const getUnitPreview = () => {
    const sem = semesterCustomMode ? semesterCustomValue : semester;
    const uni = unitCustomMode ? unitCustomValue : unit;
    return buildUnit(sem, uni) || '未选择';
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

    if (['reading', 'cloze', 'listening_single', 'listening_group'].includes(formData.type)) {
      if (!formData.questions || formData.questions.length === 0) {
        showToast('请添加至少一道子问题', 'warning');
        return false;
      }
      for (let i = 0; i < formData.questions.length; i++) {
        if (formData.type !== 'cloze' && !formData.questions[i].content.trim()) {
          showToast(`请填写第${i + 1}道子问题的内容`, 'warning');
          return false;
        }
        if (!formData.questions[i].answer) {
          showToast(`请为第${i + 1}道子问题填写答案`, 'warning');
          return false;
        }
        if (formData.questions[i].options && formData.questions[i].options!.length < 2) {
          showToast(`第${i + 1}道子问题至少需要2个选项`, 'warning');
          return false;
        }
      }
    }

    if (formData.type === 'listening_single' && formData.questions && formData.questions.length !== 1) {
      showToast('听力单选题只能有1道子题目', 'warning');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const submitData: QuestionCreate = {
      type: formData.type,
      content: formData.content,
      sub_type: ['reading', 'cloze'].includes(formData.type) ? formData.sub_type : undefined,
      options: formData.type === 'single' ? formData.options?.filter(o => o.trim()) : undefined,
      answer: formData.answer || undefined,
      questions: ['reading', 'cloze', 'listening_single', 'listening_group'].includes(formData.type)
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
    if (!['reading', 'cloze'].includes(formData.type)) return null;

    const isReading = formData.type === 'reading';

    return (
      <div className={styles.subQuestionSection}>
        {isReading && (
          <div className={styles.formGroup}>
            <label className={styles.label}>子问题类型</label>
            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={formData.sub_type === 'single'}
                  onChange={() => setFormData(prev => ({ ...prev, sub_type: 'single' }))}
                />
                单选题
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={formData.sub_type === 'judge'}
                  onChange={() => setFormData(prev => ({ ...prev, sub_type: 'judge' }))}
                />
                判断题
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  checked={!formData.sub_type || formData.sub_type === 'text'}
                  onChange={() => setFormData(prev => ({ ...prev, sub_type: 'text' as any }))}
                />
                文本作答
              </label>
            </div>
          </div>
        )}
        <label className={styles.label}>📝 {formData.type === 'cloze' ? '空位列表' : '子问题列表'}</label>
        <div className={styles.subQuestionList}>
          {(formData.questions || []).map((sq, idx) => (
            <div key={idx} className={styles.subQuestionItem}>
              <div className={styles.subQuestionHeader}>
                <span className={styles.subQuestionTitle}>
                  {formData.type === 'cloze' ? `空位 ${idx + 1}` : `子问题 ${idx + 1}`}
                </span>
                <button type="button" className={styles.removeBtn} onClick={() => removeSubQuestion(idx)}>🗑️</button>
              </div>

              {!isReading && formData.type !== 'cloze' && (
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

              {isReading && formData.sub_type === 'single' && (
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

              {isReading && formData.sub_type === 'single' && (
                <div className={styles.answerBtns} style={{ marginTop: '10px' }}>
                  {sq.options?.filter(o => o?.trim()).map((opt, optIdx) => (
                    <button
                      key={optIdx}
                      type="button"
                      className={`${styles.answerBtn} ${sq.answer === opt ? styles.selected : ''}`}
                      onClick={() => handleSubQuestionChange(idx, 'answer', opt)}
                    >
                      {LETTERS[optIdx]}
                    </button>
                  ))}
                </div>
              )}

              {isReading && formData.sub_type === 'judge' && (
                <div className={styles.answerBtns} style={{ marginTop: '10px' }}>
                  {['T', 'V', 'F'].map(v => (
                    <button
                      key={v}
                      type="button"
                      className={`${styles.answerBtn} ${sq.answer === v ? styles.selected : ''}`}
                      onClick={() => handleSubQuestionChange(idx, 'answer', v)}
                    >
                      {v === 'T' ? '✓ 正确 (T)' : v === 'V' ? '✓ 正确 (V)' : '✗ 错误'}
                    </button>
                  ))}
                </div>
              )}

              {isReading && (!formData.sub_type || formData.sub_type === 'text') && (
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

  const renderListeningQuestions = () => {
    if (!['listening_single', 'listening_group'].includes(formData.type)) return null;

    const isGroup = formData.type === 'listening_group';

    return (
      <div className={styles.subQuestionSection}>
        <div className={styles.formGroup}>
          <label className={styles.label}>🎧 听力材料（原文）</label>
          <textarea
            className={styles.textarea}
            placeholder="请输入听力原文材料..."
            value={formData.content}
            onChange={(e) => handleContentChange(e.target.value)}
            style={{ minHeight: '120px' }}
          />
        </div>

        <label className={styles.label}>
          📝 {isGroup ? '子问题列表' : '题目'}
          {!isGroup && <span style={{ fontWeight: 'normal', marginLeft: '8px', color: '#666' }}>（{formData.questions?.[0]?.options ? '单选题' : '填空题'}）</span>}
        </label>
        <div className={styles.subQuestionList}>
          {(formData.questions || []).map((sq, idx) => (
            <div key={idx} className={styles.subQuestionItem}>
              <div className={styles.subQuestionHeader}>
                <span className={styles.subQuestionTitle}>
                  {isGroup ? `子问题 ${idx + 1}` : '题目'}
                </span>
                {isGroup && (
                  <button type="button" className={styles.removeBtn} onClick={() => removeSubQuestion(idx)}>🗑️</button>
                )}
              </div>

              {(isGroup || formData.type === 'listening_single') && (
                <div className={styles.subQuestionTypeSelector}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={!sq.options}
                      onChange={() => handleSubQuestionTypeChange(idx, 'fill')}
                    />
                    填空题
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={!!sq.options}
                      onChange={() => handleSubQuestionTypeChange(idx, 'single')}
                    />
                    单选题
                  </label>
                </div>
              )}

              <input
                type="text"
                className={styles.input}
                placeholder={sq.options ? "请输入问题内容" : "请输入填空题题目（包含空位标记）"}
                value={sq.content}
                onChange={(e) => handleSubQuestionChange(idx, 'content', e.target.value)}
                style={{ marginBottom: '10px' }}
              />

              {sq.options && (
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
                {sq.options
                  ? sq.options.filter(o => o?.trim()).map((opt, optIdx) => (
                    <button
                      key={optIdx}
                      type="button"
                      className={`${styles.answerBtn} ${sq.answer === opt ? styles.selected : ''}`}
                      onClick={() => handleSubQuestionChange(idx, 'answer', opt)}
                    >
                      {LETTERS[optIdx]}
                    </button>
                  ))
                  : (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#666' }}>答案：</span>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="请输入答案"
                        value={sq.answer}
                        onChange={(e) => handleSubQuestionChange(idx, 'answer', e.target.value)}
                        style={{ flex: 1, minWidth: '150px' }}
                      />
                    </div>
                  )
                }
              </div>
            </div>
          ))}
          {isGroup && formData.type !== 'listening_single' && (
            <button type="button" className={styles.addOptionBtn} onClick={addSubQuestion}>
              ➕ 添加子问题
            </button>
          )}
        </div>
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

        {(formData.type === 'reading' || formData.type === 'cloze') && (
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

        {['reading', 'cloze'].includes(formData.type) && renderSubQuestions()}

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

        {['listening_single', 'listening_group'].includes(formData.type) && renderListeningQuestions()}

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

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              学期 <span className={styles.labelHint}>或自定义</span>
            </label>
            {!semesterCustomMode ? (
              <div className={styles.selectWithReset}>
                <select
                  className={styles.select}
                  value={semester}
                  onChange={(e) => handleSemesterSelect(e.target.value)}
                >
                  <option value="">请选择学期</option>
                  {SEMESTER_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="__custom__">✏️ 自定义...</option>
                </select>
              </div>
            ) : (
              <div className={styles.inputWithReset}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="输入自定义学期，如：2024秋"
                  value={semesterCustomValue}
                  onChange={(e) => handleSemesterCustomChange(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.resetBtn}
                  onClick={resetSemesterToSelect}
                >
                  ↩ 恢复选择
                </button>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              单元 <span className={styles.labelHint}>或自定义</span>
            </label>
            {!unitCustomMode ? (
              <div className={styles.selectWithReset}>
                <select
                  className={styles.select}
                  value={unit}
                  onChange={(e) => handleUnitSelect(e.target.value)}
                >
                  <option value="">请选择单元</option>
                  {UNIT_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="__custom__">✏️ 自定义...</option>
                </select>
              </div>
            ) : (
              <div className={styles.inputWithReset}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="输入自定义单元，如：期中复习"
                  value={unitCustomValue}
                  onChange={(e) => handleUnitCustomChange(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.resetBtn}
                  onClick={resetUnitToSelect}
                >
                  ↩ 恢复选择
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={styles.unitPreview}>
          <span className={styles.previewLabel}>单元标记：</span>
          <span>{getUnitPreview()}</span>
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