import React from 'react';
import { BookOpen, Upload, Download, Settings, BookMarked, Languages, Play, Sparkles, Eye, PenLine } from 'lucide-react';
import type { NovelProject } from '../types/novel';

interface NavbarProps {
  project: NovelProject;
  onUpdateProject: (project: NovelProject) => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
  onOpenGlossary: () => void;
  onOpenBatchTranslate: () => void;
  onToggleReaderMode: () => void;
  onConvertCurrentChapter: () => void;
  onTranslateCurrentChapter: () => void;
  isProcessing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  project, onUpdateProject, onOpenImport, onOpenExport,
  onOpenSettings, onOpenGlossary, onOpenBatchTranslate,
  onToggleReaderMode, onConvertCurrentChapter, onTranslateCurrentChapter,
  isProcessing,
}) => {
  return (
    <header className="app-topbar">
      {/* Brand */}
      <div className="brand-area">
        <div className="brand-mark">
          <BookOpen size={14} color="#2b1f15" strokeWidth={2} />
        </div>
        <div className="brand-text">
          <div className="brand-name">OmniNovel</div>
          <div className="brand-tag">Studio</div>
        </div>
      </div>

      {/* Project info */}
      <div className="topbar-project-info">
        <PenLine size={13} color="#8b7355" strokeWidth={1.5} />
        <input
          className="topbar-project-title"
          value={project.title}
          onChange={e => onUpdateProject({ ...project, title: e.target.value })}
          placeholder="Untitled Manuscript"
        />
        <span className="topbar-divider" />
        <input
          className="topbar-project-author"
          value={project.author}
          onChange={e => onUpdateProject({ ...project, author: e.target.value })}
          placeholder="Anonymous"
        />
      </div>

      {/* Actions */}
      <div className="topbar-actions">
        <button onClick={onOpenImport} className="btn btn-subtle" title="Nhập file TXT, EPUB, PDF, DOCX">
          <Upload size={13} strokeWidth={2} />
          <span>Import</span>
        </button>

        <button
          onClick={onConvertCurrentChapter}
          disabled={isProcessing || project.chapters.length === 0}
          className="btn btn-indigo"
          title="Convert Vietphrase / Hán Việt"
        >
          <Languages size={13} strokeWidth={2} />
          <span>Vietphrase</span>
        </button>

        <button
          onClick={onTranslateCurrentChapter}
          disabled={isProcessing || project.chapters.length === 0}
          className="btn btn-primary"
          title="Dịch AI chương hiện tại"
        >
          {isProcessing ? (
            <span className="spinner" />
          ) : (
            <Sparkles size={13} strokeWidth={2} />
          )}
          <span>{isProcessing ? 'Đang dịch...' : 'Dịch AI'}</span>
        </button>

        <button
          onClick={onOpenBatchTranslate}
          disabled={project.chapters.length === 0}
          className="btn btn-gold"
          title="Dịch hàng loạt"
        >
          <Play size={13} strokeWidth={2} />
          <span>Batch</span>
        </button>

        <span className="topbar-divider" />

        <button onClick={onOpenGlossary} className="btn btn-ghost btn-icon" title={`Glossary (${project.glossary.filter(g => g.enabled).length})`}>
          <BookMarked size={14} color="#a8842c" strokeWidth={2} />
        </button>

        <button
          onClick={onToggleReaderMode}
          disabled={project.chapters.length === 0}
          className="btn btn-ghost btn-icon"
          title="Reader Mode"
        >
          <Eye size={14} color="#2c4870" strokeWidth={2} />
        </button>

        <button
          onClick={onOpenExport}
          disabled={project.chapters.length === 0}
          className="btn btn-ghost btn-icon"
          title="Export"
        >
          <Download size={14} color="#c13828" strokeWidth={2} />
        </button>

        <button onClick={onOpenSettings} className="btn btn-ghost btn-icon" title="Settings">
          <Settings size={14} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
};