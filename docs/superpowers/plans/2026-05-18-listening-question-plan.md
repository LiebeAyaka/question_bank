# 听力题型实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增两种听力题型（听力单选题、听力理解），支持一段材料配一道或多道子题（单选/填空混合）

**Architecture:** 复用现有 `questions` 数组字段存储子题，通过 `options` 是否存在区分单选题和填空题。在 QuestionForm 中添加材料输入区域和子题类型选择。

**Tech Stack:** React + Zustand + TypeScript + Flask + SQLite

---

## 文件结构

```
src/
├── types/question.ts          # 扩展 QuestionType 和 VALID_TYPES
├── components/
│   ├── QuestionForm.tsx      # 适配听力题型表单
│   └── QuestionDisplay.tsx   # 适配听力题展示
server/
└── (无需修改)
```

---

## 任务清单

### Task 1: 扩展前端类型定义

**文件：**
- Modify: `src/types/question.ts`

- [ ] **Step 1: 更新 QuestionType**

在第 1 行添加新类型：

```typescript
export type QuestionType = 'single' | 'judge' | 'reading' | 'cloze' | 'task_reading' | 'fill' | 'short_answer' | 'essay' | 'listening_single' | 'listening_group';
```

- [ ] **Step 2: 更新 TYPE_NAMES**

在 TYPE_NAMES 中添加：

```typescript
export const TYPE_NAMES: Record<QuestionType, string> = {
  single: '单选题',
  judge: '判断题',
  reading: '阅读理解',
  cloze: '完形填空',
  task_reading: '任务型阅读',
  fill: '填空题',
  short_answer: '问答题',
  essay: '作文题',
  listening_single: '听力单选题',
  listening_group: '听力理解'
};
```

- [ ] **Step 3: 更新 VALID_TYPES**

添加新类型到数组中：

```typescript
export const VALID_TYPES: QuestionType[] = ['single', 'judge', 'reading', 'cloze', 'task_reading', 'fill', 'short_answer', 'essay', 'listening_single', 'listening_group'];
```

---

### Task 2: 适配题目表单组件

**文件：**
- Modify: `src/components/QuestionForm.tsx`
- 依赖: Task 1 完成

- [ ] **Step 1: 读取现有 QuestionForm 组件**

执行：Read `src/components/QuestionForm.tsx`

- [ ] **Step 2: 定位表单结构，找到题目内容输入区域**

根据现有结构确定添加位置

- [ ] **Step 3: 添加听力材料输入区域**

在题目类型选择后，对于听力题型显示材料输入框。参考添加位置在 `content` 输入框附近：

```tsx
{(questionType === 'listening_single' || questionType === 'listening_group') && (
  <div className={styles.field}>
    <label>听力材料（原文）</label>
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      placeholder="请输入听力原文材料"
      rows={4}
    />
  </div>
)}
```

- [ ] **Step 4: 在子题编辑区域添加类型切换**

对于听力题型，每道子题上方添加单选题/填空题切换：

```tsx
<div className={styles.subQuestionType}>
  <label>
    <input
      type="radio"
      checked={!subQuestion.options}
      onChange={() => handleSubQuestionTypeChange(index, 'fill')}
    />
    填空题
  </label>
  <label>
    <input
      type="radio"
      checked={!!subQuestion.options}
      onChange={() => handleSubQuestionTypeChange(index, 'single')}
    />
    单选题
  </label>
</div>
```

其中 `handleSubQuestionTypeChange` 函数：

```tsx
const handleSubQuestionTypeChange = (index: number, type: 'single' | 'fill') => {
  const updated = [...subQuestions];
  if (type === 'single') {
    updated[index] = { content: updated[index].content, options: ['A. ', 'B. ', 'C. ', 'D. '], answer: updated[index].answer };
  } else {
    updated[index] = { content: updated[index].content, answer: updated[index].answer };
  }
  setSubQuestions(updated);
};
```

- [ ] **Step 5: 条件渲染选项输入**

单选题时显示 A/B/C/D 选项输入框：

```tsx
{subQuestion.options && (
  <div className={styles.optionsGrid}>
    {subQuestion.options.map((opt, optIdx) => (
      <input
        key={optIdx}
        type="text"
        value={opt}
        onChange={(e) => {
          const updated = [...subQuestions];
          updated[index].options[optIdx] = e.target.value;
          setSubQuestions(updated);
        }}
        placeholder={`${['A', 'B', 'C', 'D'][optIdx]}. `}
      />
    ))}
  </div>
)}
```

---

### Task 3: 适配题目展示组件

**文件：**
- Modify: `src/components/QuestionDisplay.tsx`
- Modify: `src/components/QuestionDisplay.module.css`
- 依赖: Task 1 完成

- [ ] **Step 1: 读取现有 QuestionDisplay 组件**

执行：Read `src/components/QuestionDisplay.tsx`

- [ ] **Step 2: 修改题目内容渲染逻辑**

找到渲染 `question.content` 的位置，添加听力材料判断：

```tsx
{question.type === 'listening_single' || question.type === 'listening_group' ? (
  <div className={styles.listeningMaterial}>
    <div className={styles.materialLabel}>听力材料：</div>
    <div className={styles.materialContent}>{question.content}</div>
  </div>
) : (
  <p>{question.content}</p>
)}
```

- [ ] **Step 3: 添加听力材料样式**

在 `QuestionDisplay.module.css` 中添加：

```css
.listeningMaterial {
  background: #f0f7ff;
  border-left: 3px solid #1890ff;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 4px;
}

.materialLabel {
  font-size: 12px;
  color: #1890ff;
  font-weight: 500;
  margin-bottom: 8px;
}

.materialContent {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}
```

---

### Task 4: 验证和测试

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 测试类型定义**

确认类型选择器中显示「听力单选题」和「听力理解」选项

- [ ] **Step 3: 测试表单创建**

1. 选择「听力单选题」题型
2. 输入听力材料原文
3. 填写一道单选题子题
4. 提交创建

- [ ] **Step 4: 测试题组创建**

1. 选择「听力理解」题型
2. 输入听力材料原文
3. 添加多道子题（混合单选题和填空题）
4. 提交创建

- [ ] **Step 5: 测试题目列表**

1. 筛选「听力单选题」类型
2. 筛选「听力理解」类型
3. 确认展示时听力材料正确显示

---

## 自检清单

- [ ] QuestionType 包含 `listening_single` 和 `listening_group`
- [ ] TYPE_NAMES 包含新题型的中文名称
- [ ] VALID_TYPES 包含新题型
- [ ] QuestionForm 支持选择听力题型
- [ ] QuestionForm 显示材料输入区域（仅听力题型）
- [ ] QuestionForm 支持单选题和填空题子题切换
- [ ] QuestionDisplay 正确展示听力材料样式
- [ ] 后端无需修改（复用现有 questions 字段）

---

**Plan complete. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**