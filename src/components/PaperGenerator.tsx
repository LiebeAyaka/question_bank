import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuestionStore } from '@/stores/questionStore';
import { usePaperStore } from '@/stores/paperStore';
import { useStrategyStore } from '@/stores/strategyStore';
import { useToast } from './common/Toast';
import { StrategyForm } from './StrategyForm';
import { TYPE_NAMES, VALID_TYPES, LETTERS, type QuestionType } from '@/types/question';
import { escapeHtml } from '@/utils/escapeHtml';
import type { GenerationStrategy, StrategyCreate, StrategyUpdate } from '@/types/strategy';
import styles from './PaperGenerator.module.css';

export function PaperGenerator() {
  const { questions, loadQuestions, initialized } = useQuestionStore();
  const { strategies, loadStrategies } = useStrategyStore();
  const {
    paperTitle, setPaperTitle,
    sections, addSection, removeSection, updateSection,
    generatedQuestions, generatePaper,
    showAnswer, setShowAnswer, resetPaper,
    resetNumber, setResetNumber,
    selectedStrategyId, setSelectedStrategyId
  } = usePaperStore();
  const { showToast } = useToast();

  const [exportFileName, setExportFileName] = useState('');
  const [showStrategyList, setShowStrategyList] = useState(false);
  const [showStrategyForm, setShowStrategyForm] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<GenerationStrategy | null>(null);

  const { createStrategy, updateStrategy, deleteStrategy } = useStrategyStore();

  const handleCreateStrategy = async (data: StrategyCreate | StrategyUpdate) => {
    const result = await createStrategy(data as StrategyCreate);
    return !!result;
  };

  const handleUpdateStrategy = async (data: StrategyCreate | StrategyUpdate) => {
    if (!editingStrategy) return false;
    const result = await updateStrategy(editingStrategy.id, data as StrategyUpdate);
    return !!result;
  };

  const handleDeleteStrategy = async (id: string) => {
    if (!confirm('确定要删除这个策略吗？')) return;
    const success = await deleteStrategy(id);
    if (success) {
      showToast('策略已删除', 'success');
      if (selectedStrategyId === id) {
        setSelectedStrategyId(null);
      }
    } else {
      showToast('删除失败', 'error');
    }
  };

  const handleEditStrategy = (strategy: GenerationStrategy) => {
    setEditingStrategy(strategy);
    setShowStrategyForm(true);
  };

  const handleNewStrategy = () => {
    setEditingStrategy(null);
    setShowStrategyForm(true);
  };

  // 使用 ref 稳定 loadQuestions 引用，避免 useEffect 依赖警告
  const loadQuestionsRef = useRef(loadQuestions);
  loadQuestionsRef.current = loadQuestions;

  useEffect(() => {
    loadStrategies();
  }, []);

  useEffect(() => {
    if (!initialized) {
      loadQuestionsRef.current();
    }
  }, [initialized]);

  useEffect(() => {
    if (generatedQuestions.length > 0) {
      setExportFileName(paperTitle);
    }
  }, [paperTitle, generatedQuestions]);

  const handleGenerate = () => {
    if (sections.length === 0 || sections.every(s => s.count === 0)) {
      showToast('请至少设置一个大题', 'warning');
      return;
    }
    const warnings = generatePaper(questions);
    if (warnings.length > 0) {
      showToast(warnings.join('; '), 'warning');
    }
  };

  const handleExport = () => {
    const content = generateMarkdown();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFileName || '试卷'}_${new Date().toLocaleDateString().replace(/\//g, '-')}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const generateMarkdown = (): string => {
    let md = `# ${paperTitle}\n\n`;

    if (showAnswer) {
      md += `**姓名：__________ 班级：__________ 学号：__________**\n\n`;
      md += `---\n\n`;
    }

    let globalIndex = 1;

    sections.forEach((section, sIdx) => {
      const sectionQuestions = generatedQuestions.filter(q => q.type === section.type);

      if (sectionQuestions.length === 0) return;

      md += `## ${section.name || `第${sIdx + 1}大题`}\n\n`;

      let sectionIndex = 1;

      sectionQuestions.forEach((q) => {
        const num = resetNumber ? sectionIndex : globalIndex;

        if (q.type === 'single') {
          md += `${num}. ${escapeHtml(q.content)}\n`;
          (q.options || []).forEach((opt, idx) => {
            md += `   ${LETTERS[idx]}. ${escapeHtml(opt)}\n`;
          });
          if (showAnswer && q.answer) {
            md += `   **答案：${q.answer}**\n`;
          }
          md += `\n`;
          sectionIndex++;
          globalIndex++;
        } else if (q.type === 'judge') {
          md += `${num}. ${escapeHtml(q.content)}\n`;
          if (showAnswer && q.answer) {
            md += `   **答案：${q.answer === 'T' || q.answer === 'V' ? '正确' : '错误'}**\n`;
          }
          md += `\n`;
          sectionIndex++;
          globalIndex++;
        } else if (q.type === 'reading' || q.type === 'cloze') {
          md += `${num}. ${q.title ? escapeHtml(q.title) : (q.type === 'cloze' ? '完形填空' : '阅读理解')}\n`;
          if (q.content) {
            md += `${escapeHtml(q.content)}\n`;
          }
          const subQuestionCount = q.questions?.length || 0;
          if (subQuestionCount > 0) {
            q.questions!.forEach((sq, sqIdx) => {
              const subNum = resetNumber ? sqIdx + 1 : globalIndex + 1 + sqIdx;
              md += `   ${subNum}. ${escapeHtml(sq.content || '')}\n`;
              if (sq.options) {
                sq.options.forEach((opt, idx) => {
                  md += `      ${LETTERS[idx]}. ${escapeHtml(opt)}\n`;
                });
              }
              if (showAnswer) {
                md += `   **答案：${sq.answer}**\n`;
              }
            });
            globalIndex += subQuestionCount;
          }
          sectionIndex++;
          md += `\n`;
        } else if (q.type === 'fill') {
          md += `${num}. ${escapeHtml(q.content)}\n`;
          if (q.blanks) {
            q.blanks.forEach((b, bIdx) => {
              if (showAnswer) {
                md += `   (${bIdx + 1}) **${escapeHtml(b.answer)}**\n`;
              } else {
                md += `   (${bIdx + 1}) ____________\n`;
              }
            });
          }
          md += `\n`;
          sectionIndex++;
          globalIndex++;
        } else if (q.type === 'short_answer' || q.type === 'essay') {
          md += `${num}. ${escapeHtml(q.content)}\n`;
          if (showAnswer && q.answer) {
            md += `   **参考答案：${escapeHtml(q.answer)}**\n`;
          } else {
            md += `   ______________________________________________________________________\n`;
            md += `   ______________________________________________________________________\n`;
          }
          md += `\n`;
          sectionIndex++;
          globalIndex++;
        }
      });
    });

    if (!showAnswer) {
      md += `---\n\n`;
      md += `**班级：__________ 姓名：__________ 学号：__________**\n`;
    }

    return md;
  };

  const getTotalQuestionCount = (): number => {
    let total = 0;
    generatedQuestions.forEach(q => {
      if (q.type === 'reading' || q.type === 'cloze') {
        total += (q.questions?.length || 0);
      } else {
        total += 1;
      }
    });
    return total;
  };

  const previewSections = useMemo(() => {
    let globalIndex = 1;
    return sections.map((section) => {
      const sectionQuestions = generatedQuestions.filter(q => q.type === section.type);
      const items = sectionQuestions.map((q, qIdx) => {
        const num = resetNumber ? qIdx + 1 : globalIndex;
        const subItems = (q.questions || []).map((sq, sqIdx) => ({
          sq,
          num: resetNumber ? sqIdx + 1 : globalIndex + sqIdx
        }));
        globalIndex += q.questions?.length || 1;
        return { q, num, subItems };
      });
      return { section, items };
    });
  }, [sections, generatedQuestions, resetNumber]);

  const renderPreview = () => {
    if (generatedQuestions.length === 0) return null;

    const actualCount = getTotalQuestionCount();

    return (
      <div className={styles.preview}>
        <div className={styles.previewTitle}>📋 试卷预览：{paperTitle}</div>
        <div className={styles.previewInfo}>
          共 {actualCount} 道题目
        </div>
        <hr className={styles.hr} />

        {previewSections.map(({ section, items }, sIdx) => {
          if (items.length === 0) return null;

          return (
            <div key={sIdx} className={styles.previewSection}>
              <div className={styles.sectionName}>{section.name || `第${sIdx + 1}大题`}</div>
              {items.map(({ q, num, subItems }) => {
                return (
                  <div key={q.id} className={styles.questionItem}>
                    <div className={styles.questionContent}>
                      {q.type === 'reading' ? (
                        <>
                          {q.title && <strong>{q.title}</strong>}
                          {q.content && <p>{q.content}</p>}
                          {subItems.length > 0 && (
                            <div className={styles.subQuestions}>
                              {subItems.map(({ sq, num: subNum }) => (
                                <div key={subNum} className={styles.subQuestion}>
                                  <div className={styles.questionContent}>{subNum}. {sq.content}</div>
                                  {sq.options && sq.options.map((opt, optIdx) => (
                                    <div key={optIdx} className={styles.optionItem}>{LETTERS[optIdx]}. {opt}</div>
                                  ))}
                                  {showAnswer && (
                                    <div className={styles.answerItem}>答案: {sq.answer}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : q.type === 'cloze' ? (
                        <>
                          <strong>完形填空</strong>
                          <p>{q.content}</p>
                          {subItems.length > 0 && (
                            <div className={styles.subQuestions}>
                              {subItems.map(({ sq, num: subNum }) => (
                                <div key={subNum} className={styles.subQuestion}>
                                  <div className={styles.questionContent}>{subNum}.</div>
                                  {sq.options && sq.options.map((opt, optIdx) => (
                                    <div key={optIdx} className={styles.optionItem}>{LETTERS[optIdx]}. {opt}</div>
                                  ))}
                                  {showAnswer && (
                                    <div className={styles.answerItem}>答案: {sq.answer}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : q.type === 'single' ? (
                        <>
                          {num}. {q.content}
                          {q.options && q.options.map((opt, optIdx) => (
                            <div key={optIdx} className={styles.optionItem}>{LETTERS[optIdx]}. {opt}</div>
                          ))}
                          {showAnswer && q.answer && (
                            <div className={styles.answerItem}>答案: {q.answer}</div>
                          )}
                        </>
                      ) : q.type === 'judge' ? (
                        <>
                          {num}. {q.content}
                          {showAnswer && q.answer && (
                            <div className={styles.answerItem}>答案: {q.answer === 'T' || q.answer === 'V' ? '正确' : '错误'}</div>
                          )}
                        </>
                      ) : (
                        <>{num}. {q.content}</>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className={styles.exportArea}>
          <div className={styles.exportInputGroup}>
            <input
              type="text"
              className={styles.exportInput}
              placeholder="输入文件名"
              value={exportFileName}
              onChange={(e) => setExportFileName(e.target.value)}
            />
          </div>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                checked={!showAnswer}
                onChange={() => setShowAnswer(false)}
              />
              无答案
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                checked={showAnswer}
                onChange={() => setShowAnswer(true)}
              />
              含答案
            </label>
          </div>
          <button className={`${styles.exportBtn} ${styles.exportBtnPrimary}`} onClick={handleExport}>
            📥 导出 Markdown
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputGroup}>
        <label className={styles.label}>试卷标题</label>
        <input
          type="text"
          className={styles.input}
          placeholder="请输入试卷标题"
          value={paperTitle}
          onChange={(e) => setPaperTitle(e.target.value)}
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>📋 出题策略</label>
        <div className={styles.strategyRow}>
          <select
            className={styles.input}
            value={selectedStrategyId || ''}
            onChange={(e) => setSelectedStrategyId(e.target.value || null)}
          >
            <option value="">自定义（不使用策略）</option>
            {strategies.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.difficulty_easy}%:{s.difficulty_medium}%:{s.difficulty_hard}%)</option>
            ))}
          </select>
          <button
            type="button"
            className={styles.manageStrategyBtn}
            onClick={() => setShowStrategyList(!showStrategyList)}
          >
            {showStrategyList ? '收起策略' : '管理策略 ▼'}
          </button>
        </div>

        {showStrategyList && (
          <div className={styles.strategyListPanel}>
            <div className={styles.strategyListHeader}>
              <span>📋 出题策略</span>
              <button type="button" className={styles.newStrategyBtn} onClick={handleNewStrategy}>
                + 新建策略
              </button>
            </div>
            {strategies.length === 0 ? (
              <div className={styles.emptyStrategies}>暂无策略，点击上方按钮创建</div>
            ) : (
              <div className={styles.strategyList}>
                {strategies.map(strategy => (
                  <div key={strategy.id} className={styles.strategyCard}>
                    <div className={styles.strategyCardHeader}>
                      <span className={styles.strategyName}>{strategy.name}</span>
                      <div className={styles.strategyActions}>
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={() => handleEditStrategy(strategy)}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteStrategy(strategy.id)}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <div className={styles.strategyInfo}>
                      <div>难度比例：{strategy.difficulty_easy}%:{strategy.difficulty_medium}%:{strategy.difficulty_hard}%</div>
                      <div>单元比例：{
                        strategy.unit_ratios && Object.keys(strategy.unit_ratios).length > 0
                          ? Object.entries(strategy.unit_ratios).map(([u, r]) => `${u}(${Math.round(r * 100)}%)`).join(', ')
                          : '不限'
                      }</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.checkboxGroup}>
          <input
            type="checkbox"
            checked={resetNumber}
            onChange={(e) => setResetNumber(e.target.checked)}
          />
          题号独立（每大题从1开始）
        </label>
      </div>

      <div>
        <label className={styles.label}>📋 设置大题</label>
        <div className={styles.sectionsContainer}>
          {sections.map((section, idx) => (
            <div key={idx} className={styles.sectionItem}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>大题 {idx + 1}</span>
                {sections.length > 1 && (
                  <button className={styles.removeBtn} onClick={() => removeSection(idx)}>✕ 删除</button>
                )}
              </div>
              <div className={styles.sectionGrid}>
                <div className={styles.sectionField}>
                  <div className={styles.sectionFieldLabel}>大题名称</div>
                  <input
                    type="text"
                    className={styles.input}
                    placeholder="如：一、单项选择题"
                    value={section.name}
                    onChange={(e) => updateSection(idx, { name: e.target.value })}
                  />
                </div>
                <div className={styles.sectionField}>
                  <div className={styles.sectionFieldLabel}>题型</div>
                  <select
                    className={styles.sectionSelect}
                    value={section.type}
                    onChange={(e) => updateSection(idx, { type: e.target.value as QuestionType })}
                  >
                    {VALID_TYPES.map(type => (
                      <option key={type} value={type}>{TYPE_NAMES[type]}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.sectionField}>
                  <div className={styles.sectionFieldLabel}>题目数量</div>
                  <input
                    type="number"
                    className={styles.sectionCount}
                    value={section.count}
                    min="1"
                    onChange={(e) => updateSection(idx, { count: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>
          ))}
          <button className={styles.addSectionBtn} onClick={addSection}>➕ 添加大题</button>
        </div>
      </div>

      <button className={styles.generateBtn} onClick={handleGenerate}>📄 生成试卷</button>
      {generatedQuestions.length > 0 && (
        <button className={styles.generateBtn} onClick={resetPaper} style={{ marginLeft: '10px', backgroundColor: '#6c757d' }}>🔄 重置试卷</button>
      )}

      {renderPreview()}

      {showStrategyForm && (
        <StrategyForm
          strategy={editingStrategy}
          onSubmit={editingStrategy ? handleUpdateStrategy : handleCreateStrategy}
          onClose={() => {
            setShowStrategyForm(false);
            setEditingStrategy(null);
          }}
        />
      )}
    </div>
  );
}