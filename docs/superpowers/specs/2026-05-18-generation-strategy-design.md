# 出题策略管理功能设计

**日期**: 2026-05-18

**状态**: 已批准

## 概述

本设计文档描述了题库系统的三个新功能：
1. **出题策略管理**：支持按难度比例和单元比例进行智能出题
2. **试卷生成集成**：将出题策略应用于试卷生成过程
3. **题目列表筛选**：支持按难度、单元、考点标签进行多维度筛选查看

## 1. 出题策略管理

### 1.1 功能描述

创建独立的出题策略管理页面，允许用户：
- 创建、编辑、删除多个策略模板
- 每个策略配置难度比例和单元比例
- 生成试卷时选择应用哪个策略

### 1.2 数据结构

```typescript
interface GenerationStrategy {
  id: string;
  name: string;                                    // 策略名称
  difficultyRatio: {
    easy: number;                                  // 简单题百分比 (0-100)
    medium: number;                                // 中等题百分比 (0-100)
    hard: number;                                  // 困难题百分比 (0-100)
  };
  unitRatio: {
    [unit: string]: number;                        // 各单元百分比，如 { "Unit 1": 0.4 }
  };
  created_at: string;
  updated_at?: string;
}
```

### 1.3 策略模板预设

系统提供三个内置模板供快速选择：
- **均衡型**：简单 30%、中等 50%、困难 20%
- **偏难型**：简单 20%、中等 40%、困难 40%
- **简单优先型**：简单 50%、中等 40%、困难 10%

### 1.4 单元比例逻辑

1. 用户手动设置各单元比例（百分比）
2. 生成试卷时，按比例计算各单元应抽取的题目数
3. 若某单元题目不足，先从其他单元补足
4. 若整体题目仍不足，向用户提示警告（不阻止生成）

## 2. 试卷生成集成

### 2.1 界面变更

在 `PaperGenerator.tsx` 中添加：
- 策略选择下拉框（位于试卷标题下方）
- 可选择已有策略或选择"自定义"进行临时调整
- 显示当前策略的难度/单元比例预览

### 2.2 生成逻辑

生成试卷时：
1. 读取选择的策略配置
2. 按难度比例分配各难度等级的题目数量
3. 按单元比例分配各单元的题目数量
4. 交叉筛选（同时满足难度和单元要求）
5. 若筛选结果不足，按以下优先级补充：
   - 先放宽单元限制（从其他单元补）
   - 再放宽难度限制（从其他难度补）
6. 生成完成后显示实际抽取结果和任何警告信息

### 2.3 警告提示场景

- 某单元题目不足，已用其他单元补充
- 某难度题目不足，已用其他难度补充
- 总题目数少于需求数

## 3. 题目列表筛选

### 3.1 筛选功能

扩展 `QuestionList.tsx`，添加三个筛选器：
- **难度筛选**：简单 / 中等 / 困难 / 全部
- **单元筛选**：下拉多选已有单元
- **考点筛选**：输入框，支持模糊匹配

### 3.2 UI 布局

```
[全部题型 ▼] [难度：全部 ▼] [单元：全部 ▼] [考点：____] [重置]
                          共 128 道题目
```

### 3.3 数据流

```
用户选择筛选条件
    ↓
更新 store 中的 filterDiffculty, filterUnits, filterExamPoints
    ↓
触发 loadQuestions() 重新获取数据
    ↓
后端根据筛选条件查询并返回结果
```

### 3.4 后端接口变更

`GET /api/questions` 新增查询参数：
- `difficulty`: 难度筛选
- `units`: 单元筛选（逗号分隔多选）
- `exam_points`: 考点模糊匹配

## 4. 文件清单

### 新增文件

| 文件路径 | 描述 |
|---------|------|
| `src/components/StrategyList.tsx` | 策略管理列表组件 |
| `src/components/StrategyForm.tsx` | 策略编辑表单组件 |
| `src/stores/strategyStore.ts` | 策略状态管理 |
| `src/api/strategy.ts` | 策略 API 调用 |
| `src/types/strategy.ts` | 策略类型定义 |
| `server/models/strategy.py` | 策略数据模型 |
| `server/routes/strategy.py` | 策略 API 路由 |
| `docs/superpowers/specs/2026-05-18-generation-strategy-design.md` | 本设计文档 |

### 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `src/components/QuestionList.tsx` | 添加难度/单元/考点筛选器 |
| `src/components/PaperGenerator.tsx` | 集成策略选择和智能出题 |
| `src/stores/questionStore.ts` | 添加筛选状态 |
| `server/routes/questions.py` | 添加筛选查询逻辑 |
| `server/app.py` | 注册策略路由 |

## 5. 数据库变更

### 新增表：strategy

```sql
CREATE TABLE strategy (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  difficulty_easy INTEGER DEFAULT 30,
  difficulty_medium INTEGER DEFAULT 50,
  difficulty_hard INTEGER DEFAULT 20,
  unit_ratios TEXT,  -- JSON: {"Unit 1": 0.4, "Unit 2": 0.3}
  created_at TEXT NOT NULL,
  updated_at TEXT
);
```

## 6. 优先级与排期

1. **第一阶段**：数据库和后端 API
2. **第二阶段**：策略管理前端页面
3. **第三阶段**：试卷生成集成
4. **第四阶段**：题目列表筛选

---

*设计完成，等待实现*