import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { Chapter, NovelProject, TranslationSettings, ViewMode } from './types/novel';
import { Navbar } from './components/Navbar';
import { ChapterSidebar } from './components/ChapterSidebar';
import { DualEditor } from './components/DualEditor';
import { ImportModal } from './components/ImportModal';
import { GlossaryManager } from './components/GlossaryManager';
import { SettingsModal } from './components/SettingsModal';
import { BatchTranslator } from './components/BatchTranslator';
import { ExportModal } from './components/ExportModal';
import { ReaderMode } from './components/ReaderMode';
import { api } from './services/api';
import { convertVietphrase } from './services/dictionaries/vietphrase';
import { translateText } from './services/translators';

// Default initial state
const INITIAL_SETTINGS: TranslationSettings = {
  provider: 'free_google',
  apiKey: '',
  model: 'gemini-2.0-flash',
  stylePrompt: 'literary',
  temperature: 0.3,
  maxConcurrent: 2,
  batchSize: 1,
  applyGlossary: true,
  autoChapterSplit: true
};

const INITIAL_PROJECT: NovelProject = {
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
  settings: INITIAL_SETTINGS,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

export function App() {
  // Persistence
  const [project, setProject] = useState<NovelProject>(INITIAL_PROJECT);

  // Load from API on mount, fallback to localStorage
  useEffect(() => {
    api.listProjects().then(async (projects) => {
      if (projects.length > 0) {
        const full = await api.getProject(projects[0].id);
        setProject({
          ...INITIAL_PROJECT,
          ...full,
          id: full.id,
          title: full.title,
          author: full.author,
          sourceLanguage: full.source_language as any,
          targetLanguage: full.target_language as any,
          chapters: (full.chapters || []) as any,
          glossary: (full.glossary || []) as any,
          settings: JSON.parse(full.settings_json || '{}'),
          createdAt: full.created_at,
          updatedAt: full.updated_at,
        });
      }
    }).catch(() => {
      const saved = localStorage.getItem('omni_novel_project');
      if (saved) {
        try { setProject(JSON.parse(saved)); } catch { /* ignore */ }
      }
    });
  }, []);

  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('parallel_dual');

  // Modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('omni_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('omni_theme', theme);
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'i' && !e.shiftKey) { e.preventDefault(); setIsImportOpen(true); }
      else if (key === 'e' && !e.shiftKey) { e.preventDefault(); if (project.chapters.length > 0) setIsExportOpen(true); }
      else if (key === 'g') { e.preventDefault(); setIsGlossaryOpen(true); }
      else if (key === ',') { e.preventDefault(); setIsSettingsOpen(true); }
      else if (key === '/') { e.preventDefault(); setTheme(t => t === 'light' ? 'dark' : 'light'); }
      else if (key === 'b' && e.shiftKey) { e.preventDefault(); if (project.chapters.length > 0) setIsBatchOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [project.chapters.length, setTheme]);

  // Processing & Progress
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, activeTitle: '' });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('omni_novel_project', JSON.stringify(project));
  }, [project]);

  // Set default active chapter when chapters change
  useEffect(() => {
    if (project.chapters.length > 0 && !activeChapterId) {
      setActiveChapterId(project.chapters[0].id);
    }
  }, [project.chapters]);

  const activeChapter = project.chapters.find(c => c.id === activeChapterId) || null;

  // Single Chapter Convert Vietphrase
  const handleConvertCurrentChapter = () => {
    if (!activeChapter) return;
    setIsProcessing(true);

    const glossaryMap: Record<string, string> = {};
    project.glossary.filter(g => g.enabled).forEach(g => {
      glossaryMap[g.sourceTerm] = g.targetTerm;
    });

    const converted = convertVietphrase(activeChapter.originalContent, {
      mode: 'vietphrase',
      customGlossary: glossaryMap,
      cleanWatermarks: true,
      normalizeParagraphs: true
    });

    const updatedChapters = project.chapters.map(c => 
      c.id === activeChapter.id ? { ...c, convertedContent: converted, status: 'converted' as const } : c
    );

    setProject({ ...project, chapters: updatedChapters, updatedAt: Date.now() });
    setIsProcessing(false);
  };

  // Single Chapter AI Translate
  const handleTranslateCurrentChapter = async () => {
    if (!activeChapter) return;
    setIsProcessing(true);

    try {
      const res = await translateText({
        text: activeChapter.originalContent,
        sourceLang: project.sourceLanguage,
        targetLang: project.targetLanguage,
        settings: project.settings,
        glossary: project.glossary
      });

      const updatedChapters = project.chapters.map(c => 
        c.id === activeChapter.id ? { 
          ...c, 
          translatedContent: res.translatedText, 
          status: 'translated' as const 
        } : c
      );

      setProject({ ...project, chapters: updatedChapters, updatedAt: Date.now() });
    } catch (err: any) {
      alert(`Dịch thất bại: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Translate Single Paragraph Inline
  const handleTranslateParagraph = async (paragraphText: string): Promise<string> => {
    const res = await translateText({
      text: paragraphText,
      sourceLang: project.sourceLanguage,
      targetLang: project.targetLanguage,
      settings: project.settings,
      glossary: project.glossary
    });
    return res.translatedText;
  };

  // Batch Processing
  const handleStartBatch = async (chapterIds: string[], mode: 'ai' | 'vietphrase') => {
    setIsProcessing(true);
    setBatchProgress({ current: 0, total: chapterIds.length, activeTitle: '' });

    const updatedChapters = [...project.chapters];

    for (let i = 0; i < chapterIds.length; i++) {
      const id = chapterIds[i];
      const chapIndex = updatedChapters.findIndex(c => c.id === id);
      if (chapIndex === -1) continue;

      const chap = updatedChapters[chapIndex];
      setBatchProgress({ current: i + 1, total: chapterIds.length, activeTitle: chap.title });

      if (mode === 'vietphrase') {
        const glossaryMap: Record<string, string> = {};
        project.glossary.filter(g => g.enabled).forEach(g => {
          glossaryMap[g.sourceTerm] = g.targetTerm;
        });

        const converted = convertVietphrase(chap.originalContent, {
          mode: 'vietphrase',
          customGlossary: glossaryMap,
          cleanWatermarks: true,
          normalizeParagraphs: true
        });

        updatedChapters[chapIndex] = {
          ...chap,
          convertedContent: converted,
          status: 'converted'
        };
      } else {
        try {
          const res = await translateText({
            text: chap.originalContent,
            sourceLang: project.sourceLanguage,
            targetLang: project.targetLanguage,
            settings: project.settings,
            glossary: project.glossary
          });

          updatedChapters[chapIndex] = {
            ...chap,
            translatedContent: res.translatedText,
            status: 'translated'
          };
        } catch (err) {
          console.error(`Batch Error on chapter ${chap.title}:`, err);
        }
      }

      setProject(prev => ({ ...prev, chapters: updatedChapters, updatedAt: Date.now() }));
    }

    setIsProcessing(false);
    setIsBatchOpen(false);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  // Inline Add to Glossary
  return (
    <div className="app-shell">
      {/* Header Bar */}
      <Navbar
        project={project}
        onUpdateProject={setProject}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGlossary={() => setIsGlossaryOpen(true)}
        onOpenBatchTranslate={() => setIsBatchOpen(true)}
        onToggleReaderMode={() => setIsReaderOpen(true)}
        onConvertCurrentChapter={handleConvertCurrentChapter}
        onTranslateCurrentChapter={handleTranslateCurrentChapter}
        isProcessing={isProcessing}
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
      />

      {/* Main Studio Body */}
      <div className="app-body">
        <ChapterSidebar
          chapters={project.chapters}
          activeChapterId={activeChapterId}
          onSelectChapter={setActiveChapterId}
          onAddChapter={() => {
            const newChap: Chapter = {
              id: `chap_${Date.now()}`,
              number: project.chapters.length + 1,
              title: `Chương ${project.chapters.length + 1}`,
              originalContent: 'Nhập nội dung chương mới vào đây...',
              status: 'raw'
            };
            setProject({ ...project, chapters: [...project.chapters, newChap] });
            setActiveChapterId(newChap.id);
          }}
          onDeleteChapter={(id) => {
            const updated = project.chapters.filter(c => c.id !== id);
            setProject({ ...project, chapters: updated });
            if (activeChapterId === id) {
              setActiveChapterId(updated[0]?.id || null);
            }
          }}
          onConvertSelected={(ids) => handleStartBatch(ids, 'vietphrase')}
          onTranslateSelected={(ids) => handleStartBatch(ids, 'ai')}
        />

        <DualEditor
          chapter={activeChapter}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          onUpdateChapter={(updated) => {
            setProject({
              ...project,
              chapters: project.chapters.map(c => c.id === updated.id ? updated : c)
            });
          }}
          onTranslateParagraph={handleTranslateParagraph}
        />
      </div>

      {/* Modals */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportComplete={({ title, author, chapters, sourceLanguage }) => {
          setProject({
            ...project,
            title: title || project.title,
            author: author || project.author,
            sourceLanguage,
            chapters
          });
          if (chapters.length > 0) {
            setActiveChapterId(chapters[0].id);
          }
        }}
      />

      <GlossaryManager
        isOpen={isGlossaryOpen}
        onClose={() => setIsGlossaryOpen(false)}
        glossary={project.glossary}
        onUpdateGlossary={(updated) => setProject({ ...project, glossary: updated })}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={project.settings}
        onUpdateSettings={(updated) => setProject({ ...project, settings: updated })}
      />

      <BatchTranslator
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        chapters={project.chapters}
        settings={project.settings}
        onStartBatch={handleStartBatch}
        isProcessing={isProcessing}
        progress={batchProgress}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={project}
      />

      {isReaderOpen && (
        <ReaderMode
          isOpen={isReaderOpen}
          onClose={() => setIsReaderOpen(false)}
          chapters={project.chapters}
          currentChapterId={activeChapterId || ''}
          onSelectChapter={setActiveChapterId}
        />
      )}
    </div>
  );
}

export default App;
