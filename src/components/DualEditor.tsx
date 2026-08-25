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
}

export const DualEditor: React.FC<DualEditorProps> = ({
  chapter, viewMode, onChangeViewMode, onUpdateChapter,
  onTranslateParagraph,
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
            <FileText size={32} strokeWidth={1.5} />
          </div>
          <h3 className="empty-title">Chưa chọn chương</h3>
          <p className="empty-desc">
            Chọn một chương từ mục lục bên trái, hoặc nhấn <strong>Import</strong> ở thanh công cụ trên cùng để tải truyện lên.
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
      viewMode === 'single_converted' ? chapter.convertedContent || chapter.originalContent :
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
        <div className="editor-chapter-title">
          {editingTitle ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="input"
                style={{ fontSize: 22, fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 600, padding: '4px 0' }}
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
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: 12 }}
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
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, fontStyle: 'italic', color: 'var(--col-ink)' }}>
                {chapter.title}
              </span>
              <Edit3 size={13} color="var(--col-ink-3)" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="view-mode-tabs">
          <button
            className={`view-tab ${viewMode === 'parallel_dual' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('parallel_dual')}
          >
            <Columns2 size={12} strokeWidth={2} /> Song ngữ
          </button>
          <button
            className={`view-tab ${viewMode === 'single_translated' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('single_translated')}
          >
            <Sparkles size={12} strokeWidth={2} /> Dịch AI
          </button>
          <button
            className={`view-tab ${viewMode === 'single_converted' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('single_converted')}
          >
            <Languages size={12} strokeWidth={2} /> Vietphrase
          </button>
          <button
            className={`view-tab ${viewMode === 'single_original' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('single_original')}
          >
            <FileText size={12} strokeWidth={2} /> Gốc
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => setShowFindReplace(v => !v)}
            className={`btn btn-ghost btn-icon ${showFindReplace ? 'active' : ''}`}
            title="Tìm & Thay thế"
            style={showFindReplace ? { background: 'var(--col-paper-2)', color: 'var(--accent-vermilion)' } : {}}
          >
            <Search size={13} strokeWidth={2} />
          </button>
          <button onClick={handleCopy} className="btn btn-ghost btn-icon" title="Sao chép">
            {copied ? <Check size={13} color="var(--accent-jade)" strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Find & Replace */}
      {showFindReplace && (
        <div className="find-replace-bar">
          <Search size={12} color="var(--col-ink-3)" strokeWidth={2} />
          <input
            className="input"
            style={{ maxWidth: 200, padding: '5px 4px', fontSize: 12 }}
            placeholder="Tìm kiếm..."
            value={findQuery}
            onChange={e => setFindQuery(e.target.value)}
          />
          <input
            className="input"
            style={{ maxWidth: 200, padding: '5px 4px', fontSize: 12 }}
            placeholder="Thay thế bằng..."
            value={replaceQuery}
            onChange={e => setReplaceQuery(e.target.value)}
          />
          <button onClick={handleFindReplace} className="btn btn-subtle" style={{ fontSize: 12, padding: '5px 12px' }}>
            <RotateCcw size={11} /> Thay thế tất cả
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
                  <div className="para-pane">
                    <div className="para-pane-header">
                      <span className="para-pane-label label-original">
                        ¶ {String(idx + 1).padStart(3, '0')} · Original
                      </span>
                    </div>
                    <p className="para-original-text">{origText}</p>
                    {convText && (
                      <div className="para-converted-box">{convText}</div>
                    )}
                  </div>

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
                          : <><RefreshCw size={10} strokeWidth={2} /> Dịch lại</>
                        }
                      </button>
                    </div>
                    <textarea
                      className="para-translated-textarea"
                      value={transText}
                      placeholder="Nhấn 'Dịch lại' hoặc dịch cả chương từ thanh công cụ..."
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
            <div className="single-editor-divider" />
            <textarea
              className="single-editor-textarea"
              value={chapter.translatedContent || ''}
              placeholder="Chưa có bản dịch AI. Nhấn 'Dịch AI' ở thanh công cụ trên để bắt đầu..."
              onChange={e => onUpdateChapter({ ...chapter, translatedContent: e.target.value })}
            />
          </div>
        )}

        {/* SINGLE CONVERTED */}
        {viewMode === 'single_converted' && (
          <div className="single-editor-wrap">
            <h2 className="single-editor-heading" style={{ color: 'var(--accent-indigo)' }}>
              {chapter.title} — Vietphrase
            </h2>
            <div className="single-editor-divider" />
            <textarea
              className="single-editor-textarea"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent-indigo)', opacity: 0.9 }}
              value={chapter.convertedContent || ''}
              placeholder="Chưa convert Vietphrase. Nhấn 'Vietphrase' ở thanh công cụ..."
              onChange={e => onUpdateChapter({ ...chapter, convertedContent: e.target.value })}
            />
          </div>
        )}

        {/* SINGLE ORIGINAL */}
        {viewMode === 'single_original' && (
          <div className="single-editor-wrap">
            <h2 className="single-editor-heading" style={{ color: 'var(--col-ink-2)' }}>
              {chapter.title} — Bản Gốc
            </h2>
            <div className="single-editor-divider" />
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