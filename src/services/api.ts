const API_BASE = '/api';

// --- Auth token management ---
const STORAGE_KEY = 'omninovel_token';
function getToken(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
export function setToken(token: string) {
  try { localStorage.setItem(STORAGE_KEY, token); } catch { /* noop */ }
}
export function clearToken() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}
export function isLoggedIn(): boolean {
  return !!getToken();
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // Don't set Content-Type for FormData
  if (options?.body instanceof FormData) {
    delete headers['Content-Type'];
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

// --- Auth API ---
export interface UserPublic {
  id: string;
  email: string;
  username: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserPublic;
}

export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    request<TokenResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    request<TokenResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request<UserPublic>('/auth/me'),
};

// --- Existing API ---
export interface ProjectSummary {
  id: string;
  title: string;
  author: string;
  updated_at: number;
}

export interface FullProject extends ProjectSummary {
  source_language: string;
  target_language: string;
  settings_json: string;
  created_at: number;
  chapters: ChapterData[];
  glossary: GlossaryData[];
}

export interface ChapterData {
  id: string;
  project_id: string;
  number: number;
  title: string;
  original_content: string;
  converted_content?: string;
  translated_content?: string;
  status: string;
  word_count?: number;
}

export interface GlossaryData {
  id: string;
  project_id: string;
  source_term: string;
  target_term: string;
  category: string;
  enabled: boolean;
}

export interface ParsedNovelData {
  title: string;
  author: string;
  detected_language: string;
  chapters: {
    number: number;
    title: string;
    original_content: string;
    status: string;
    word_count: number;
  }[];
}

export interface TranslateResult {
  translated_text: string;
  provider_used: string;
  token_count?: number;
}

export const api = {
  listProjects: () => request<ProjectSummary[]>('/projects'),
  getProject: (id: string) => request<FullProject>(`/projects/${id}`),
  createProject: (data: { title: string; author?: string; source_language?: string; target_language?: string }) =>
    request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Record<string, any>) =>
    request<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    request<{ ok: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
  addChapter: (pid: string, data: { number: number; title: string; original_content: string }) =>
    request<ChapterData>(`/projects/${pid}/chapters`, { method: 'POST', body: JSON.stringify(data) }),
  updateChapter: (pid: string, cid: string, data: Record<string, any>) =>
    request<ChapterData>(`/projects/${pid}/chapters/${cid}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteChapter: (pid: string, cid: string) =>
    request<{ ok: boolean }>(`/projects/${pid}/chapters/${cid}`, { method: 'DELETE' }),
  addGlossary: (pid: string, data: { source_term: string; target_term: string; category?: string }) =>
    request<GlossaryData>(`/projects/${pid}/glossary`, { method: 'POST', body: JSON.stringify(data) }),
  deleteGlossary: (pid: string, itemId: string) =>
    request<{ ok: boolean }>(`/projects/${pid}/glossary/${itemId}`, { method: 'DELETE' }),
  parseFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<ParsedNovelData>('/parse', { method: 'POST', body: form });
  },
  translate: (data: {
    text: string; source_lang?: string; target_lang?: string;
    provider?: string; api_key?: string; custom_endpoint?: string; model?: string;
    style_prompt?: string; temperature?: number;
    apply_glossary?: boolean; glossary?: any[];
  }) => request<TranslateResult>('/translate', { method: 'POST', body: JSON.stringify(data) }),
  batchTranslate: (pid: string, chapterIds: string[], mode: 'ai' | 'vietphrase') =>
    request<ChapterData[]>(`/projects/${pid}/translate-batch`, { method: 'POST', body: JSON.stringify({ chapter_ids: chapterIds, mode }) }),

  // TTS
  generateTTS: async (text: string, voice?: string, rate?: string): Promise<Blob> => {
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/tts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, voice: voice || 'vi-VN-HoaiMyNeural', rate: rate || '+0%' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'TTS generation failed');
    }
    return res.blob();
  },
  listVoices: () => request<{ id: string; name: string }[]>('/tts/voices'),

  // Bilingual EPUB Export
  exportBilingualEPUB: async (pid: string): Promise<Blob> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}/projects/${pid}/export/bilingual-epub`, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'EPUB export failed');
    }
    return res.blob();
  },
};