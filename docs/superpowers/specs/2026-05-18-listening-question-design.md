# 听力题型设计文档

**日期：** 2026-05-18
**状态：** 已批准

## 概述

新增两种听力题型：听力单选题（`listening_single`）和听力理解题组（`listening_group`）。听力材料以纯文本形式存储在题目的 `content` 字段中，支持单选题和填空题两种子题类型。

## 需求分析

### 用户需求
- 支持按照难度比例进行出题
- 支持按照单元内容比例进行出题
- 支持按照难度、单元和考点标签进行筛选查看列表
- 新增听力题型，支持一段材料配一道题或配多道题
- 目前只做听力的单选题和填空

### 设计决策
1. **材料存储方式：** 仅文本材料，存储在 content 字段中
2. **子题类型：** 支持单选题（有 options）和填空题（无 options）
3. **题型区分：** 分为两种独立题型
   - `listening_single`：一材一题
   - `listening_group`：一材多题
4. **子题结构：** 复用现有的 `questions` 数组字段
5. **实现方案：** 作为现有题型的变体，复用现有数据结构

## 数据模型

### 新增题型

| type 值 | 名称 | 说明 |
|---------|------|------|
| `listening_single` | 听力单选题 | 一段材料 + 一道单选题 |
| `listening_group` | 听力理解 | 一段材料 + 多道子题（单选/填空混合）|

### 存储示例

**听力单选题 (listening_single)**

```json
{
  "type": "listening_single",
  "content": "女：¿Qué hora es ahora?\n男：Son las tres de la tarde.",
  "difficulty": "medium",
  "unit": "1",
  "exam_points": ["时间表达", "日常对话"],
  "questions": [
    {
      "content": "¿Qué hora es ahora?",
      "options": ["A. 2点", "B. 3点", "C. 4点", "D. 5点"],
      "answer": "B"
    }
  ]
}
```

**听力理解题组 (listening_group)**

```json
{
  "type": "listening_group",
  "content": "女：¿Qué计划 para el fin de semana?\n男：Quiero ir al supermercado y luego al cine. Nos vemos el sábado por la tarde.\n女：Perfecto, hasta el sábado.",
  "difficulty": "medium",
  "unit": "2",
  "exam_points": ["周末计划", "时间表达"],
  "questions": [
    {
      "content": "¿Qué quiere hacer el hombre primero?",
      "options": ["A. Ir al cine", "B. Ir al supermercado"],
      "answer": "B"
    },
    {
      "content": "¿Cuándo van al cine?",
      "options": ["A. El sábado", "B. El domingo"],
      "answer": "A"
    },
    {
      "content": "El hombre va al supermercado para comprar ______.",
      "answer": "comida"
    }
  ]
}
```

### 子题类型判断规则
- 有 `options` 字段 → 单选题，选项必为 4 个
- 无 `options` 字段 → 填空题

## 数据字段

### Question 类型扩展

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 题型：`listening_single` 或 `listening_group` |
| `content` | string | 是 | 听力原文材料 |
| `questions` | SubQuestion[] | 是 | 子题数组，至少 1 个 |
| `difficulty` | string | 否 | 难度：easy / medium / hard |
| `unit` | string | 否 | 所属单元 |
| `exam_points` | string[] | 否 | 考点标签 |

### SubQuestion 类型

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | string | 是 | 子题题目内容 |
| `options` | string[] | 否 | 选项数组（单选题时有，填空题时无） |
| `answer` | string | 是 | 答案 |

## 组件设计

### 题目类型选择器
- 在现有类型选择器中添加 `listening_single` 和 `listening_group`
- 显示中文名称：「听力单选题」「听力理解」

### 题目表单 (QuestionForm)
复用现有表单组件，新增/调整以下区域：

1. **材料输入区域**
   - 位置：表单顶部
   - 组件：Textarea，输入提示"请输入听力原文"
   - 预览：以引用样式显示听力材料

2. **子题编辑区域**
   - 对于 `listening_single`：显示单个子题编辑区
   - 对于 `listening_group`：支持添加/删除多个子题
   - 每道子题可选择类型：单选题 / 填空题
   - 单选题：显示选项输入框（A/B/C/D）
   - 填空题：显示单个答案输入框

3. **验证规则**
   - `content` 必填
   - `questions` 数组至少 1 项
   - 单选题的 `options` 必填且至少 2 项
   - 所有子题的 `answer` 必填

### 题目展示组件
- 复用现有展示逻辑
- 听力材料以特殊样式显示（带"听力材料"标签）
- 子题继承现有单选题/填空题的展示样式

## 后端改动

### 类型定义
- `server/models/question.py`：无需修改，已支持 `questions` 字段
- `server/routes/questions.py`：无需修改

### 前端类型定义
- `src/types/question.ts`：
  - `QuestionType` 添加 `listening_single` 和 `listening_group`
  - `TYPE_NAMES` 添加中文名称
  - `VALID_TYPES` 添加新类型

## 考点的考量

### 与现有功能集成
1. **出题策略**：听力题可参与难度比例出题
2. **筛选功能**：支持按难度、单元、考点筛选听力题
3. **试卷生成**：听力题可加入试卷的不同 Section

### 注意事项
- 听力题的特殊性在于 `content` 是材料而非题目
- 出题策略中可选择是否包含听力题
- 试卷生成时听力题会作为一个 Section 出现

## 实施范围

### 本次实现
- [x] 新增题型定义
- [x] 前端类型扩展
- [x] 表单组件适配
- [x] 展示组件适配
- [x] 验证规则
- [x] 题目列表筛选

### 后续扩展（不在本次范围）
- 实际音频文件上传和管理
- 音频播放器组件
- 听力专项出题策略
- 听力材料预览功能