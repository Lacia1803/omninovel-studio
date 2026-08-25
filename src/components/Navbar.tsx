import React from 'react';
import { BookOpen, Upload, Download, Settings, BookMarked, Languages, Play, Sparkles, Eye, Library, PenLine } from 'lucide-react';
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
        <div className="brand-icon">
          <BookOpen size={16} color="#fff" strokeWidth={2.5} />
        </div>
        <div>
          <div className="brand-name">OmniNovel</div>
          <div className="brand-tag">Studio</div>
        </div>
      </div>

      {/* Project info */}
      <div className="topbar-project-info">
        <Library size={14} color="var(--text-muted)" />
        <input
          className="topbar-project-title"
          value={project.title}
          onChange={e => onUpdateProject({ ...project, title: e.target.value })}
          placeholder="Tên truyện..."
        />
        <span className="topbar-divider" />
        <PenLine size={12} color="var(--text-muted)" />
        <input
          className="topbar-project-author"
          value={project.author}
          onChange={e => onUpdateProject({ ...project, author: e.target.value })}
          placeholder="Tác giả..."
        />
      </div>

      {/* Actions */}
      <div className="topbar-actions">
        <button onClick={onOpenImport} className="btn btn-subtle" title="Nhập file TXT, EPUB, PDF, DOCX">
          <Upload size={14} />
          <span>Nhập</span>
        </button>

        <button
          onClick={onConvertCurrentChapter}
          disabled={isProcessing || project.chapters.length === 0}
          className="btn btn-cyan"
          title="Convert Vietphrase / Hán Việt"
        >
          <Languages size={14} />
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
            <Sparkles size={14} />
          )}
          <span>{isProcessing ? 'Đang dịch...' : 'Dịch AI'}</span>
        </button>

        <button
          onClick={onOpenBatchTranslate}
          disabled={project.chapters.length === 0}
          className="btn btn-emerald"
          title="Dịch hàng loạt"
        >
          <Play size={14} />
          <span>Hàng loạt</span>
        </button>

        <span className="topbar-divider" />

        <button onClick={onOpenGlossary} className="btn btn-ghost btn-icon" title={`Từ điển (${project.glossary.filter(g => g.enabled).length})`}>
          <BookMarked size={15} color="var(--accent-amber)" />
        </button>

        <button
          onClick={onToggleReaderMode}
          disabled={project.chapters.length === 0}
          className="btn btn-ghost btn-icon"
          title="Chế độ đọc"
        >
          <Eye size={15} color="var(--text-accent)" />
        </button>

        <button
          onClick={onOpenExport}
          disabled={project.chapters.length === 0}
          className="btn btn-ghost btn-icon"
          title="Xuất EPUB / PDF / DOCX / TXT"
        >
          <Download size={15} color="var(--accent-cyan)" />
        </button>

        <button onClick={onOpenSettings} className="btn btn-ghost btn-icon" title="Cài đặt API">
          <Settings size={15} />
        </button>
      </div>
    </header>
  );
};
