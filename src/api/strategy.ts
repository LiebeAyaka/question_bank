import axios from 'axios';
import type { GenerationStrategy, StrategyCreate, StrategyUpdate } from '@/types/strategy';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

export async function fetchStrategies(): Promise<GenerationStrategy[]> {
  const response = await api.get('/strategy');
  return response.data.strategies || [];
}

export async function fetchStrategy(id: string): Promise<GenerationStrategy> {
  const response = await api.get(`/strategy/${id}`);
  return response.data.strategy;
}

export async function createStrategy(data: StrategyCreate): Promise<GenerationStrategy> {
  const response = await api.post('/strategy', data);
  return response.data.strategy;
}

export async function updateStrategy(id: string, data: StrategyUpdate): Promise<GenerationStrategy> {
  const response = await api.put(`/strategy/${id}`, data);
  return response.data.strategy;
}

export async function deleteStrategy(id: string): Promise<void> {
  await api.delete(`/strategy/${id}`);
}