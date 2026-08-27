import React, { useState, useEffect, Suspense } from "react";
import confetti from "canvas-confetti";
import type { Chapter, ViewMode } from "./types/novel";
import { Navbar } from "./components/Navbar";
import { ChapterSidebar } from "./components/ChapterSidebar";
import { DualEditor } from "./components/DualEditor";
import { ImportModal } from "./components/ImportModal";
import { GlossaryManager } from "./components/GlossaryManager";
import { SettingsModal } from "./components/SettingsModal";
import { AuthModal } from "./components/AuthModal";
const BatchTranslator = React.lazy(() => import("./components/BatchTranslator").then(m => ({ default: m.BatchTranslator })));
const ExportModal = React.lazy(() => import("./components/ExportModal").then(m => ({ default: m.ExportModal })));
const ReaderMode = React.lazy(() => import("./components/ReaderMode").then(m => ({ default: m.ReaderMode })));
import { convertVietphrase } from "./services/dictionaries/vietphrase";
import { translateText } from "./services/translators";
import { useProject } from "./hooks/useProject";
import { useTheme } from "./hooks/useTheme";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { isLoggedIn, type UserPublic, clearToken } from "./services/api";

export function App() {
  const { project, setProject, patchProject } = useProject();
  const { theme, toggleTheme } = useTheme();

  // Auth state
  const [user, setUser] = useState<UserPublic | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      // Token exists — try to load user info; if expired, show auth
      import("./services/api").then(({ authApi }) =>
        authApi.me().then(setUser).catch(() => { clearToken(); setIsAuthOpen(true); })
      );
    } else {
      setIsAuthOpen(true);
    }
  }, []);

  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("parallel_dual");

  // Modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  // Processing & Progress
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, activeTitle: "" });

  // Auto-select first chapter
  useEffect(() => {
    if (project.chapters.length > 0 && !activeChapterId) {
      setActiveChapterId(project.chapters[0].id);
    }
  }, [project.chapters]);

  const activeChapter = project.chapters.find((c) => c.id === activeChapterId) || null;

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onImport: () => setIsImportOpen(true),
    onExport: () => { if (project.chapters.length > 0) setIsExportOpen(true); },
    onGlossary: () => setIsGlossaryOpen(true),
    onSettings: () => setIsSettingsOpen(true),
    onToggleTheme: toggleTheme,
    onBatch: () => { if (project.chapters.length > 0) setIsBatchOpen(true); },
    chapterCount: project.chapters.length,
  });

  // Single Chapter Convert Vietphrase
  const handleConvertCurrentChapter = () => {
    if (!activeChapter) return;
    setIsProcessing(true);

    const glossaryMap: Record<string, string> = {};
    project.glossary.filter((g) => g.enabled).forEach((g) => {
      glossaryMap[g.sourceTerm] = g.targetTerm;
    });

    const converted = convertVietphrase(activeChapter.originalContent, {
      mode: "vietphrase",
      customGlossary: glossaryMap,
      cleanWatermarks: true,
      normalizeParagraphs: true,
    });

    const updatedChapters = project.chapters.map((c) =>
      c.id === activeChapter.id ? { ...c, convertedContent: converted, status: "converted" as const } : c
    );

    patchProject({ chapters: updatedChapters });
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
        glossary: project.glossary,
      });

      const updatedChapters = project.chapters.map((c) =>
        c.id === activeChapter.id
          ? { ...c, translatedContent: res.translatedText, status: "translated" as const }
          : c
      );

      patchProject({ chapters: updatedChapters });
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
      glossary: project.glossary,
    });
    return res.translatedText;
  };

  // Batch Processing
  const handleStartBatch = async (chapterIds: string[], mode: "ai" | "vietphrase") => {
    setIsProcessing(true);
    setBatchProgress({ current: 0, total: chapterIds.length, activeTitle: "" });

    const updatedChapters = [...project.chapters];

    for (let i = 0; i < chapterIds.length; i++) {
      const id = chapterIds[i];
      const chapIndex = updatedChapters.findIndex((c) => c.id === id);
      if (chapIndex === -1) continue;

      const chap = updatedChapters[chapIndex];
      setBatchProgress({ current: i + 1, total: chapterIds.length, activeTitle: chap.title });

      if (mode === "vietphrase") {
        const glossaryMap: Record<string, string> = {};
        project.glossary.filter((g) => g.enabled).forEach((g) => {
          glossaryMap[g.sourceTerm] = g.targetTerm;
        });

        const converted = convertVietphrase(chap.originalContent, {
          mode: "vietphrase",
          customGlossary: glossaryMap,
          cleanWatermarks: true,
          normalizeParagraphs: true,
        });

        updatedChapters[chapIndex] = {
          ...chap,
          convertedContent: converted,
          status: "converted",
        };
      } else {
        try {
          const res = await translateText({
            text: chap.originalContent,
            sourceLang: project.sourceLanguage,
            targetLang: project.targetLanguage,
            settings: project.settings,
            glossary: project.glossary,
          });

          updatedChapters[chapIndex] = {
            ...chap,
            translatedContent: res.translatedText,
            status: "translated",
          };
        } catch (err) {
          console.error(`Batch Error on chapter ${chap.title}:`, err);
        }
      }

      patchProject({ chapters: updatedChapters });
    }

    setIsProcessing(false);
    setIsBatchOpen(false);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  // Show auth modal if not logged in
  if (!user && isAuthOpen) {
    return (
      <div className="app-shell">
        <AuthModal isOpen={isAuthOpen} onClose={() => {}} onAuth={setUser} />
      </div>
    );
  }

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
        onToggleTheme={toggleTheme}
        user={user}
        onLogout={() => { clearToken(); setUser(null); setIsAuthOpen(true); }}
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
              originalContent: "Nhập nội dung chương mới vào đây...",
              status: "raw",
            };
            patchProject({ chapters: [...project.chapters, newChap] });
            setActiveChapterId(newChap.id);
          }}
          onDeleteChapter={(id) => {
            const updated = project.chapters.filter((c) => c.id !== id);
            patchProject({ chapters: updated });
            if (activeChapterId === id) {
              setActiveChapterId(updated[0]?.id || null);
            }
          }}
          onConvertSelected={(ids) => handleStartBatch(ids, "vietphrase")}
          onTranslateSelected={(ids) => handleStartBatch(ids, "ai")}
        />

        <DualEditor
          chapter={activeChapter}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          onUpdateChapter={(updated) => {
            patchProject({
              chapters: project.chapters.map((c) => (c.id === updated.id ? updated : c)),
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
          patchProject({
            title: title || project.title,
            author: author || project.author,
            sourceLanguage,
            chapters,
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
        onUpdateGlossary={(updated) => patchProject({ glossary: updated })}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={project.settings}
        onUpdateSettings={(updated) => patchProject({ settings: updated })}
      />

      <Suspense fallback={null}>
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
            currentChapterId={activeChapterId || ""}
            onSelectChapter={setActiveChapterId}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
