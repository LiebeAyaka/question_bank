import { create } from 'zustand';
import type { Question, PaperSection } from '@/types/question';
import { TYPE_NAMES } from '@/types/question';
import { shuffle } from '@/utils/shuffle';
import type { GenerationStrategy } from '@/types/strategy';
import { useStrategyStore } from './strategyStore';

interface PaperState {
  paperTitle: string;
  sections: PaperSection[];
  generatedQuestions: Question[];
  showAnswer: boolean;
  warnings: string[];
  resetNumber: boolean;
  selectedStrategyId: string | null;
  resetNumber: boolean;

  setPaperTitle: (title: string) => void;
  addSection: () => void;
  removeSection: (index: number) => void;
  updateSection: (index: number, section: Partial<PaperSection>) => void;
  generatePaper: (allQuestions: Question[]) => string[];
  setShowAnswer: (show: boolean) => void;
  resetPaper: () => void;
}

export const usePaperStore = create<PaperState>((set, get) => ({
  paperTitle: '测试试卷',
  sections: [{ name: '', type: 'single', count: 5 }],
  generatedQuestions: [],
  showAnswer: false,
  warnings: [],

  setPaperTitle: (title) => set({ paperTitle: title }),

  addSection: () => {
    set(state => ({
      sections: [...state.sections, { name: '', type: 'single', count: 1 }]
    }));
  },

  removeSection: (index) => {
    set(state => ({
      sections: state.sections.filter((_, i) => i !== index)
    }));
  },

  updateSection: (index, section) => {
    set(state => ({
      sections: state.sections.map((s, i) => i === index ? { ...s, ...section } : s)
    }));
  },

  setSelectedStrategyId: (id) => set({ selectedStrategyId: id }),

  generatePaper: (allQuestions) => {
    const { sections, selectedStrategyId } = get();
    const strategies = useStrategyStore.getState().strategies;
    const strategy = strategies.find(s => s.id === selectedStrategyId);

    let filteredQuestions = allQuestions;

    if (strategy) {
      const difficultyEasy = strategy.difficulty_easy / 100;
      const difficultyMedium = strategy.difficulty_medium / 100;
      const difficultyHard = strategy.difficulty_hard / 100;

      const byDifficulty: Record<string, Question[]> = {
        easy: allQuestions.filter(q => q.difficulty === 'easy'),
        medium: allQuestions.filter(q => q.difficulty === 'medium'),
        hard: allQuestions.filter(q => q.difficulty === 'hard')
      };

      const totalNeeded = sections.reduce((sum, s) => sum + s.count, 0);
      const easyNeeded = Math.ceil(totalNeeded * difficultyEasy);
      const mediumNeeded = Math.ceil(totalNeeded * difficultyMedium);
      const hardNeeded = Math.ceil(totalNeeded * difficultyHard);

      const selected: Question[] = [];

      const addFromPool = (pool: Question[], count: number) => {
        const shuffled = shuffle([...pool]);
        const taken = shuffled.slice(0, count);
        taken.forEach(q => {
          const idx = pool.indexOf(q);
          if (idx > -1) pool.splice(idx, 1);
        });
        return taken;
      };

      selected.push(...addFromPool(byDifficulty.easy, Math.min(easyNeeded, byDifficulty.easy.length)));
      selected.push(...addFromPool(byDifficulty.medium, Math.min(mediumNeeded, byDifficulty.medium.length)));
      selected.push(...addFromPool(byDifficulty.hard, Math.min(hardNeeded, byDifficulty.hard.length)));

      if (strategy.unit_ratios && Object.keys(strategy.unit_ratios).length > 0) {
        const byUnit: Record<string, Question[]> = {};
        selected.forEach(q => {
          const unit = q.unit || '未分类';
          if (!byUnit[unit]) byUnit[unit] = [];
          byUnit[unit].push(q);
        });

        filteredQuestions = Object.values(byUnit).flat();
      } else {
        filteredQuestions = selected;
      }
    }

    const byType: Record<string, Question[]> = {};
    filteredQuestions.forEach(q => {
      if (!byType[q.type]) byType[q.type] = [];
      byType[q.type].push(q);
    });

    const selectedQuestions: Question[] = [];
    const warnings: string[] = [];

    sections.forEach(section => {
      const typeQuestions = byType[section.type] || [];
      if (typeQuestions.length < section.count) {
        warnings.push(`${TYPE_NAMES[section.type as keyof typeof TYPE_NAMES] || section.type} 题目库只有 ${typeQuestions.length} 道（请求 ${section.count} 道）`);
      }
      const shuffled = shuffle([...typeQuestions]);
      const taken = shuffled.slice(0, section.count);
      taken.forEach(q => {
        const idx = byType[section.type].indexOf(q);
        if (idx > -1) byType[section.type].splice(idx, 1);
      });
      selectedQuestions.push(...taken);
    });

    set({ generatedQuestions: selectedQuestions, warnings });
    return warnings;
  },

  setShowAnswer: (show) => set({ showAnswer: show }),

  setResetNumber: (reset) => set({ resetNumber: reset }),

  resetPaper: () => set({
    paperTitle: '测试试卷',
    sections: [{ name: '', type: 'single', count: 5 }],
    generatedQuestions: [],
    showAnswer: false,
    warnings: []
  })
}))