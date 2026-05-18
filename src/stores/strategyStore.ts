import { create } from 'zustand';
import type { GenerationStrategy, StrategyCreate, StrategyUpdate } from '@/types/strategy';
import * as api from '@/api/strategy';

interface StrategyState {
  strategies: GenerationStrategy[];
  loading: boolean;
  error: string | null;
  
  loadStrategies: () => Promise<void>;
  createStrategy: (data: StrategyCreate) => Promise<GenerationStrategy | null>;
  updateStrategy: (id: string, data: StrategyUpdate) => Promise<GenerationStrategy | null>;
  deleteStrategy: (id: string) => Promise<boolean>;
}

export const useStrategyStore = create<StrategyState>((set, get) => ({
  strategies: [],
  loading: false,
  error: null,

  loadStrategies: async () => {
    set({ loading: true, error: null });
    try {
      const strategies = await api.fetchStrategies();
      set({ strategies, loading: false });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  createStrategy: async (data: StrategyCreate) => {
    try {
      const strategy = await api.createStrategy(data);
      set(state => ({ strategies: [strategy, ...state.strategies] }));
      return strategy;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  updateStrategy: async (id: string, data: StrategyUpdate) => {
    try {
      const strategy = await api.updateStrategy(id, data);
      set(state => ({
        strategies: state.strategies.map(s => s.id === id ? strategy : s)
      }));
      return strategy;
    } catch (e) {
      set({ error: (e as Error).message });
      return null;
    }
  },

  deleteStrategy: async (id: string) => {
    try {
      await api.deleteStrategy(id);
      set(state => ({
        strategies: state.strategies.filter(s => s.id !== id)
      }));
      return true;
    } catch (e) {
      set({ error: (e as Error).message });
      return false;
    }
  }
}));