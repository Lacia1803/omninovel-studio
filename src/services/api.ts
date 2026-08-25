const API_BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

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
    provider?: string; api_key?: string; model?: string;
    style_prompt?: string; temperature?: number;
    apply_glossary?: boolean; glossary?: any[];
  }) => request<TranslateResult>('/translate', { method: 'POST', body: JSON.stringify(data) }),
  batchTranslate: (pid: string, chapterIds: string[], mode: 'ai' | 'vietphrase') =>
    request<ChapterData[]>(`/projects/${pid}/translate-batch`, { method: 'POST', body: JSON.stringify({ chapter_ids: chapterIds, mode }) }),

  // TTS
  generateTTS: async (text: string, voice?: string, rate?: string): Promise<Blob> => {
    const res = await fetch(`${API_BASE}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: voice || 'vi-VN-HoaiMyNeural', rate: rate || '+0%' }),
    });
    if (!res.ok) throw new Error('TTS generation failed');
    return res.blob();
  },
  listVoices: () => request<{ id: string; name: string }[]>('/tts/voices'),
};