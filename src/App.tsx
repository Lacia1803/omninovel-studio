import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { Chapter, GlossaryItem, NovelProject, TranslationSettings, ViewMode } from './types/novel';
import { Navbar } from './components/Navbar';
import { ChapterSidebar } from './components/ChapterSidebar';
import { DualEditor } from './components/DualEditor';
import { ImportModal } from './components/ImportModal';
import { GlossaryManager } from './components/GlossaryManager';
import { SettingsModal } from './components/SettingsModal';
import { BatchTranslator } from './components/BatchTranslator';
import { ExportModal } from './components/ExportModal';
import { ReaderMode } from './components/ReaderMode';
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
  const [project, setProject] = useState<NovelProject>(() => {
    const saved = localStorage.getItem('omni_novel_project');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_PROJECT;
  });

  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('parallel_dual');

  // Modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

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
  const handleAddToGlossary = (sourceTerm: string) => {
    const targetTerm = prompt(`Nhập từ dịch thay thế cho "${sourceTerm}":`);
    if (!targetTerm || !targetTerm.trim()) return;

    const newItem: GlossaryItem = {
      id: `gloss_${Date.now()}`,
      sourceTerm: sourceTerm.trim(),
      targetTerm: targetTerm.trim(),
      category: 'general',
      enabled: true
    };

    setProject({ ...project, glossary: [newItem, ...project.glossary] });
    alert(`Đã thêm "${sourceTerm}" -> "${targetTerm}" vào Từ điển!`);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100">
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
      />

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden">
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
          onAddToGlossary={handleAddToGlossary}
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

      <ReaderMode
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
        chapters={project.chapters}
        currentChapterId={activeChapterId || ''}
        onSelectChapter={setActiveChapterId}
      />
    </div>
  );
}

export default App;
