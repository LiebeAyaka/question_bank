import { create } from 'zustand';
import axios from 'axios';
import type { Question, QuestionType, QuestionCreate, QuestionUpdate } from '@/types/question';
import * as api from '@/api/questions';

interface QuestionState {
  questions: Question[];
  loading: boolean;
  error: string | null;
  filterType: QuestionType | '';
  filterSearch: string;
  filterDifficulty: string;
  filterUnits: string[];
  filterExamPoints: string;
  selectedQuestion: Question | null;
  editingQuestion: Question | null;
  initialized: boolean;
  hasData: boolean;

  loadQuestions: (retryCount?: number) => Promise<void>;
  createQuestion: (data: QuestionCreate) => Promise<boolean>;
  updateQuestion: (id: string, data: QuestionUpdate) => Promise<boolean>;
  deleteQuestion: (id: string) => Promise<boolean>;
  setFilterType: (type: QuestionType | '') => void;
  setFilterSearch: (search: string) => void;
  setFilterDifficulty: (difficulty: string) => void;
  setFilterUnits: (units: string[]) => void;
  setFilterExamPoints: (examPoints: string) => void;
  setEditingQuestion: (question: Question | null) => void;
  setSelectedQuestion: (question: Question | null) => void;
  setHasData: (hasData: boolean) => void;
  seedFromExample: () => Promise<boolean>;
}

export const useQuestionStore = create<QuestionState>((set, get) => {
  let abortController: AbortController | null = null;

  return {
    questions: [],
    loading: false,
    error: null,
    filterType: '',
    filterSearch: '',
    filterDifficulty: '',
    filterUnits: [],
    filterExamPoints: '',
    selectedQuestion: null,
    editingQuestion: null,
    initialized: false,
    hasData: false,

    loadQuestions: async (retryCount = 0) => {
      if (abortController) {
        abortController.abort();
      }
      abortController = api.createFetchQuestionsAbortController();

      set({ loading: true, error: null });
      try {
        const { filterType, filterSearch, filterDifficulty, filterUnits, filterExamPoints } = get();
        const questions = await api.fetchQuestions(
          filterType || undefined,
          filterSearch || undefined,
          abortController.signal,
          filterDifficulty || undefined,
          filterUnits.length > 0 ? filterUnits : undefined,
          filterExamPoints || undefined
        );
        set({ questions, loading: false, initialized: true });
      } catch (e) {
        if (axios.isCancel(e)) {
          return;
        }
        if (retryCount < 2) {
          await new Promise(r => setTimeout(r, 1500));
          return get().loadQuestions(retryCount + 1);
        }
        set({ error: (e as Error).message, loading: false, initialized: true });
      }
    },

    createQuestion: async (data: QuestionCreate) => {
      try {
        await api.createQuestion(data);
        await get().loadQuestions();
        return true;
      } catch (e) {
        set({ error: (e as Error).message });
        return false;
      }
    },

    updateQuestion: async (id: string, data: QuestionUpdate) => {
      try {
        await api.updateQuestion(id, data);
        await get().loadQuestions();
        return true;
      } catch (e) {
        set({ error: (e as Error).message });
        return false;
      }
    },

    deleteQuestion: async (id: string) => {
      const currentCount = get().questions.length;
      try {
        await api.deleteQuestion(id);
        await get().loadQuestions();
        if (currentCount <= 1) {
          set({ hasData: false });
        }
        return true;
      } catch (e) {
        set({ error: (e as Error).message });
        return false;
      }
    },

    setFilterType: (type) => {
      set({ filterType: type });
      get().loadQuestions();
    },

    setFilterSearch: (search) => {
      set({ filterSearch: search });
      get().loadQuestions();
    },

    setFilterDifficulty: (difficulty) => {
      set({ filterDifficulty: difficulty });
      get().loadQuestions();
    },

    setFilterUnits: (units) => {
      set({ filterUnits: units });
      get().loadQuestions();
    },

    setFilterExamPoints: (examPoints) => {
      set({ filterExamPoints: examPoints });
      get().loadQuestions();
    },

    setEditingQuestion: (question) => set({ editingQuestion: question }),
    setSelectedQuestion: (question) => set({ selectedQuestion: question }),
    setHasData: (hasData) => set({ hasData }),

    seedFromExample: async () => {
      try {
        const result = await api.seedFromExample();
        if (result.question_count > 0) {
          set({ hasData: true });
          await get().loadQuestions();
          return true;
        }
        return false;
      } catch (e) {
        set({ error: (e as Error).message });
        return false;
      }
    }
  };
});