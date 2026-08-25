import React, { useState } from 'react';
import {
  Columns2, FileText, Sparkles, Languages, Edit3, Save,
  Search, RefreshCw, Copy, Check, RotateCcw
} from 'lucide-react';
import type { Chapter, ViewMode } from '../types/novel';

interface DualEditorProps {
  chapter: Chapter | null;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onUpdateChapter: (updated: Chapter) => void;
  onTranslateParagraph: (text: string) => Promise<string>;
  onAddToGlossary: (term: string) => void;
}

export const DualEditor: React.FC<DualEditorProps> = ({
  chapter, viewMode, onChangeViewMode, onUpdateChapter,
  onTranslateParagraph, onAddToGlossary,
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [translatingIdx, setTranslatingIdx] = useState<number | null>(null);

  if (!chapter) {
    return (
      <main className="app-main">
        <div className="editor-empty-state">
          <div className="empty-icon-ring">
            <FileText size={28} />
          </div>
          <h3 className="empty-title">Chưa chọn chương</h3>
          <p className="empty-desc">
            Chọn chương từ mục lục bên trái, hoặc nhấn <strong>Nhập</strong> để tải truyện lên.
          </p>
        </div>
      </main>
    );
  }

  const origParagraphs = chapter.originalContent.split(/\n+/).filter(p => p.trim());
  const convParagraphs = (chapter.convertedContent || '').split(/\n+/).filter(p => p.trim());
  const transParagraphs = (chapter.translatedContent || '').split(/\n+/).filter(p => p.trim());

  const handleCopy = () => {
    const text =
      viewMode === 'single_translated' ? chapter.translatedContent || chapter.originalContent :
      viewMode === 'single_converted'  ? chapter.convertedContent  || chapter.originalContent :
      chapter.originalContent;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleFindReplace = () => {
    if (!findQuery) return;
    const rep = (s?: string) => s?.split(findQuery).join(replaceQuery);
    onUpdateChapter({
      ...chapter,
      originalContent: rep(chapter.originalContent) || chapter.originalContent,
      convertedContent: rep(chapter.convertedContent),
      translatedContent: rep(chapter.translatedContent),
    });
  };

  const handleRetranslate = async (idx: number, text: string) => {
    setTranslatingIdx(idx);
    try {
      const result = await onTranslateParagraph(text);
      const updated = [...transParagraphs];
      updated[idx] = result;
      onUpdateChapter({ ...chapter, translatedContent: updated.join('\n\n'), status: 'translated' });
    } finally {
      setTranslatingIdx(null);
    }
  };

  return (
    <main className="app-main">
      {/* Editor Toolbar */}
      <div className="editor-toolbar">
        {/* Chapter title */}
        <div className="editor-chapter-title">
          {editingTitle ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                style={{ fontSize: 14, fontWeight: 600, padding: '5px 10px' }}
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    onUpdateChapter({ ...chapter, title: titleInput });
                    setEditingTitle(false);
                  }
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
              />
              <button
                onClick={() => { onUpdateChapter({ ...chapter, title: titleInput }); setEditingTitle(false); }}
                className="btn btn-primary" style={{ padding: '5px 10px', fontSize: 12 }}
              >
                <Save size={12} /> Lưu
              </button>
            </div>
          ) : (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onClick={() => { setTitleInput(chapter.title); setEditingTitle(true); }}
              title="Click để đổi tên chương"
            >
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {chapter.title}
              </span>
              <Edit3 size={12} color="var(--text-muted)" />
            </div>
          )}
        </div>

        {/* View mode tabs */}
        <div className="view-mode-tabs">
          <button
            className={`view-tab ${viewMode === 'parallel_dual' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('parallel_dual')}
          >
            <Columns2 size={13} /> Song ngữ
          </button>
          <button
            className={`view-tab ${viewMode === 'single_translated' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('single_translated')}
          >
            <Sparkles size={13} /> Dịch AI
          </button>
          <button
            className={`view-tab ${viewMode === 'single_converted' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('single_converted')}
          >
            <Languages size={13} /> Vietphrase
          </button>
          <button
            className={`view-tab ${viewMode === 'single_original' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('single_original')}
          >
            <FileText size={13} /> Gốc
          </button>
        </div>

        {/* Utility buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setShowFindReplace(v => !v)}
            className={`btn btn-ghost btn-icon ${showFindReplace ? 'active' : ''}`}
            title="Tìm & Thay thế"
          >
            <Search size={14} />
          </button>
          <button onClick={handleCopy} className="btn btn-ghost btn-icon" title="Sao chép">
            {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
          </button>
        </div>
      </div>

      {/* Find & Replace */}
      {showFindReplace && (
        <div className="find-replace-bar">
          <Search size={13} color="var(--text-muted)" />
          <input
            className="input"
            style={{ maxWidth: 200, padding: '5px 10px', fontSize: 12 }}
            placeholder="Tìm kiếm..."
            value={findQuery}
            onChange={e => setFindQuery(e.target.value)}
          />
          <input
            className="input"
            style={{ maxWidth: 200, padding: '5px 10px', fontSize: 12 }}
            placeholder="Thay thế bằng..."
            value={replaceQuery}
            onChange={e => setReplaceQuery(e.target.value)}
          />
          <button onClick={handleFindReplace} className="btn btn-subtle" style={{ fontSize: 12, padding: '5px 12px' }}>
            <RotateCcw size={12} /> Thay thế tất cả
          </button>
        </div>
      )}

      {/* Content */}
      <div className="editor-content">
        {/* PARALLEL DUAL VIEW */}
        {viewMode === 'parallel_dual' && (
          <div className="parallel-container">
            {origParagraphs.map((origText, idx) => {
              const convText = convParagraphs[idx] || '';
              const transText = transParagraphs[idx] || '';

              return (
                <div key={idx} className="parallel-paragraph">
                  {/* Left: Original + Converted */}
                  <div className="para-pane">
                    <div className="para-pane-header">
                      <span className="para-pane-label label-original">
                        #{idx + 1} · Bản gốc
                      </span>
                    </div>
                    <p className="para-original-text">{origText}</p>
                    {convText && (
                      <div className="para-converted-box">{convText}</div>
                    )}
                  </div>

                  {/* Right: AI Translated (editable) */}
                  <div className="para-pane">
                    <div className="para-pane-header">
                      <span className="para-pane-label label-translated">
                        Dịch AI
                      </span>
                      <button
                        className="para-retranslate-btn"
                        onClick={() => handleRetranslate(idx, origText)}
                        disabled={translatingIdx === idx}
                      >
                        {translatingIdx === idx
                          ? <><span className="spinner" style={{ width: 10, height: 10 }} /> Đang dịch</>
                          : <><RefreshCw size={10} /> Dịch lại</>
                        }
                      </button>
                    </div>
                    <textarea
                      className="para-translated-textarea"
                      value={transText}
                      placeholder="Click 'Dịch lại' hoặc dịch cả chương từ toolbar..."
                      onChange={e => {
                        const updated = [...transParagraphs];
                        updated[idx] = e.target.value;
                        onUpdateChapter({ ...chapter, translatedContent: updated.join('\n\n') });
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SINGLE TRANSLATED */}
        {viewMode === 'single_translated' && (
          <div className="single-editor-wrap">
            <h2 className="single-editor-heading">{chapter.title}</h2>
            <textarea
              className="single-editor-textarea"
              value={chapter.translatedContent || ''}
              placeholder="Chưa có bản dịch AI. Nhấn 'Dịch AI' ở thanh công cụ trên để bắt đầu…"
              onChange={e => onUpdateChapter({ ...chapter, translatedContent: e.target.value })}
            />
          </div>
        )}

        {/* SINGLE CONVERTED */}
        {viewMode === 'single_converted' && (
          <div className="single-editor-wrap">
            <h2 className="single-editor-heading" style={{ color: 'var(--accent-cyan)' }}>
              {chapter.title} — Vietphrase
            </h2>
            <textarea
              className="single-editor-textarea"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-cyan)', opacity: 0.85 }}
              value={chapter.convertedContent || ''}
              placeholder="Chưa convert Vietphrase. Nhấn 'Vietphrase' ở thanh công cụ…"
              onChange={e => onUpdateChapter({ ...chapter, convertedContent: e.target.value })}
            />
          </div>
        )}

        {/* SINGLE ORIGINAL */}
        {viewMode === 'single_original' && (
          <div className="single-editor-wrap">
            <h2 className="single-editor-heading" style={{ color: 'var(--text-secondary)' }}>
              {chapter.title} — Bản gốc
            </h2>
            <textarea
              className="single-editor-textarea"
              value={chapter.originalContent}
              onChange={e => onUpdateChapter({ ...chapter, originalContent: e.target.value })}
            />
          </div>
        )}
      </div>
    </main>
  );
};
