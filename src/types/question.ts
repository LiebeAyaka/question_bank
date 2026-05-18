export type QuestionType = 'single' | 'judge' | 'reading' | 'cloze' | 'task_reading' | 'fill' | 'short_answer' | 'essay' | 'listening_single' | 'listening_group';

export interface SubQuestion {
  content: string;
  options?: string[];
  answer: string;
}

export interface Blank {
  content?: string;
  answer: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  content: string;
  title?: string;
  sub_type?: 'single' | 'judge';
  options?: string[];
  answer?: string;
  questions?: SubQuestion[];
  blanks?: Blank[];
  exam_points?: string[];
  difficulty?: string;
  unit?: string;
  created_at: string;
  updated_at?: string;
}

export interface QuestionCreate {
  type: QuestionType;
  content: string;
  title?: string;
  sub_type?: 'single' | 'judge';
  options?: string[];
  answer?: string;
  questions?: SubQuestion[];
  blanks?: Blank[];
  exam_points?: string[];
  difficulty?: string;
  unit?: string;
}

export interface QuestionUpdate {
  type?: QuestionType;
  content?: string;
  title?: string;
  sub_type?: 'single' | 'judge';
  options?: string[];
  answer?: string;
  questions?: SubQuestion[];
  blanks?: Blank[];
  exam_points?: string[];
  difficulty?: string;
  unit?: string;
}

export interface PaperSection {
  name: string;
  type: QuestionType;
  count: number;
}

export interface PaperConfig {
  title: string;
  sections: PaperSection[];
  resetNumber: boolean;
}

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

export const VALID_TYPES: QuestionType[] = ['single', 'judge', 'reading', 'cloze', 'task_reading', 'fill', 'short_answer', 'essay', 'listening_single', 'listening_group'];

export const DIFFICULTY_NAMES: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难'
};

export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];