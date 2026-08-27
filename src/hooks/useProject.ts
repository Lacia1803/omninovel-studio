import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { NovelProject, TranslationSettings } from '../types/novel';

const DEFAULT_SETTINGS: TranslationSettings = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-2.0-flash',
  stylePrompt: 'literary',
  temperature: 0.3,
  maxConcurrent: 2,
  batchSize: 1,
  applyGlossary: true,
  autoChapterSplit: true,
};

const createDefaultProject = (): NovelProject => ({
  id: `project_${Date.now()}`,
  title: 'OmniNovel Studio',
  author: 'Khuyết danh',
  sourceLanguage: 'zh-CN',
  targetLanguage: 'vi',
  chapters: [],
  glossary: [
    { id: 'g1', sourceTerm: '老祖', targetTerm: 'Lão Tổ', category: 'name', enabled: true },
    { id: 'g2', sourceTerm: '金丹', targetTerm: 'Kim Đan', category: 'technique', enabled: true },
    { id: 'g3', sourceTerm: '元婴', targetTerm: 'Nguyên Anh', category: 'technique', enabled: true },
  ],
  settings: DEFAULT_SETTINGS,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

/**
 * Project state: load from API, fallback localStorage, auto-sync.
 * Exposes project + setProject (raw) + patchProject (merge + auto-timestamp).
 */
export function useProject() {
  const [project, setProject] = useState<NovelProject>(createDefaultProject);

  // Load on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const projects = await api.listProjects();
        if (cancelled || projects.length === 0) return;
        const full = await api.getProject(projects[0].id);
        if (cancelled) return;
        setProject({
          ...createDefaultProject(),
          id: full.id,
          title: full.title,
          author: full.author,
          sourceLanguage: full.source_language as NovelProject['sourceLanguage'],
          targetLanguage: full.target_language as NovelProject['targetLanguage'],
          chapters: (full.chapters || []) as any,
          glossary: (full.glossary || []) as any,
          settings: { ...DEFAULT_SETTINGS, ...JSON.parse(full.settings_json || '{}') },
          createdAt: full.created_at,
          updatedAt: full.updated_at,
        });
      } catch {
        if (cancelled) return;
        const saved = localStorage.getItem('omni_novel_project');
        if (saved) {
          try { setProject(JSON.parse(saved)); } catch { /* corrupt cache */ }
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-sync to localStorage
  useEffect(() => {
    localStorage.setItem('omni_novel_project', JSON.stringify(project));
  }, [project]);

  /** Merge partial update + auto-timestamp */
  const patchProject = (patch: Partial<NovelProject>) => {
    setProject(prev => ({ ...prev, ...patch, updatedAt: Date.now() }));
  };

  return { project, setProject, patchProject };
}
