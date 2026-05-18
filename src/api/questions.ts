import axios, { AxiosError } from 'axios';
import type { Question, QuestionCreate, QuestionUpdate } from '@/types/question';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 响应拦截器：统一处理错误
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      // 服务器返回错误状态码
      const status = error.response.status;
      const data = error.response.data as { error?: string };

      switch (status) {
        case 400:
          throw new Error(data.error || '请求参数错误');
        case 401:
          throw new Error('未授权，请重新登录');
        case 403:
          throw new Error('无权访问此资源');
        case 404:
          throw new Error(data.error || '资源不存在');
        case 500:
          throw new Error('服务器内部错误');
        default:
          throw new Error(data.error || `请求失败 (${status})`);
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      throw new Error('网络连接失败，请检查网络');
    } else {
      // 请求配置出错
      throw new Error('请求配置错误');
    }
  }
);

export function createFetchQuestionsAbortController() {
  return new AbortController();
}

export async function fetchQuestions(
  type?: string,
  search?: string,
  signal?: AbortSignal,
  difficulty?: string,
  units?: string[],
  examPoints?: string
): Promise<Question[]> {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (search) params.append('search', search);
  if (difficulty) params.append('difficulty', difficulty);
  if (units && units.length > 0) params.append('units', units.join(','));
  if (examPoints) params.append('exam_points', examPoints);

  const response = await api.get(`/questions?${params.toString()}`, { signal });
  return response.data.questions || [];
}

export async function fetchQuestion(id: string): Promise<Question> {
  const response = await api.get(`/questions/${id}`);
  return response.data;
}

export async function createQuestion(data: QuestionCreate): Promise<{ id: string; message: string }> {
  const response = await api.post('/questions', data);
  return response.data;
}

export async function updateQuestion(id: string, data: QuestionUpdate): Promise<{ message: string }> {
  const response = await api.put(`/questions/${id}`, data);
  return response.data;
}

export async function deleteQuestion(id: string): Promise<{ message: string }> {
  const response = await api.delete(`/questions/${id}`);
  return response.data;
}

export interface DbStatus {
  has_data: boolean;
  question_count: number;
}

export async function fetchDbStatus(): Promise<DbStatus> {
  const response = await api.get('/status');
  return response.data;
}

export async function seedFromExample(): Promise<{ message: string; question_count: number }> {
  const response = await api.post('/seed');
  return response.data;
}