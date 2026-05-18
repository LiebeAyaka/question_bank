export interface DifficultyRatio {
  easy: number;
  medium: number;
  hard: number;
}

export interface UnitRatio {
  [unit: string]: number;
}

export interface GenerationStrategy {
  id: string;
  name: string;
  difficulty_easy: number;
  difficulty_medium: number;
  difficulty_hard: number;
  unit_ratios: UnitRatio;
  created_at: string;
  updated_at?: string;
}

export interface StrategyCreate {
  name: string;
  difficulty_easy: number;
  difficulty_medium: number;
  difficulty_hard: number;
  unit_ratios: UnitRatio;
}

export interface StrategyUpdate {
  name?: string;
  difficulty_easy?: number;
  difficulty_medium?: number;
  difficulty_hard?: number;
  unit_ratios?: UnitRatio;
}

export const DIFFICULTY_PRESETS = {
  balanced: { easy: 30, medium: 50, hard: 20, label: '均衡型' },
  hard: { easy: 20, medium: 40, hard: 40, label: '偏难型' },
  easy: { easy: 50, medium: 40, hard: 10, label: '简单优先型' },
} as const;