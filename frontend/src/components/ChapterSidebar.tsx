import React, { useState } from 'react';
import { Search, Plus, Trash2, CheckSquare, Square, LayoutList } from 'lucide-react';
import type { Chapter, ChapterStatus } from '../types/novel';

interface ChapterSidebarProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  onSelectChapter: (id: string) => void;
  onAddChapter: () => void;
  onDeleteChapter: (id: string) => void;
  onConvertSelected: (ids: string[]) => void;
  onTranslateSelected: (ids: string[]) => void;
}

const STATUS_BADGE: Record<ChapterStatus, React.ReactElement> = {
  raw:        <span className="badge badge-raw">Raw</span>,
  converting: <span className="badge badge-converting">Converting…</span>,
  converted:  <span className="badge badge-converted">Vietphrase</span>,
  translating:<span className="badge badge-translating">Translating…</span>,
  translated: <span className="badge badge-translated">✓ Translated</span>,
  error:      <span className="badge badge-error">Error</span>,
};

export const ChapterSidebar: React.FC<ChapterSidebarProps> = ({
  chapters, activeChapterId, onSelectChapter,
  onAddChapter, onDeleteChapter,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = chapters.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || String(c.number).includes(search);
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleAll = () => {
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(c => c.id));
  };

  const toggleOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const countTranslated = chapters.filter(c => c.status === 'translated').length;
  const countConverted = chapters.filter(c => c.status === 'converted').length;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LayoutList size={12} strokeWidth={2} />
            <span>Table of Contents</span>
            <span style={{ color: 'var(--accent-vermilion)', fontWeight: 700 }}>({chapters.length})</span>
          </div>
          <button onClick={onAddChapter} className="btn btn-subtle" style={{ padding: '4px 10px', fontSize: 11 }}>
            <Plus size={11} strokeWidth={2.5} /> Thêm
          </button>
        </div>

        <div className="sidebar-search-wrap">
          <Search size={12} className="sidebar-search-icon" strokeWidth={2} />
          <input
            className="sidebar-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm chương..."
          />
        </div>

        <div className="sidebar-filter-row">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="raw">Chưa dịch</option>
            <option value="converted">Vietphrase</option>
            <option value="translated">Đã dịch AI</option>
          </select>
          <button onClick={toggleAll} className="btn btn-ghost btn-icon" style={{ padding: 5, borderRadius: 3 }} title="Toggle all">
            {selectedIds.length === filtered.length && filtered.length > 0
              ? <CheckSquare size={12} color="var(--accent-vermilion)" strokeWidth={2} />
              : <Square size={12} strokeWidth={2} />
            }
          </button>
        </div>
      </div>

      <div className="sidebar-chapter-list">
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--col-ink-3)', fontSize: 12, fontStyle: 'italic', fontFamily: 'var(--font-body)' }}>
            {chapters.length === 0
              ? 'Chưa có chương nào.\nNhấn Import để bắt đầu.'
              : 'Không tìm thấy kết quả.'}
          </div>
        ) : filtered.map(chap => {
          const isActive = chap.id === activeChapterId;
          const isSelected = selectedIds.includes(chap.id);

          return (
            <div
              key={chap.id}
              className={`chapter-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectChapter(chap.id)}
            >
              <input
                type="checkbox"
                className="chapter-checkbox"
                checked={isSelected}
                onChange={() => {}}
                onClick={e => toggleOne(chap.id, e as any)}
              />

              <div className="chapter-info">
                <div className="chapter-title">{chap.title}</div>
                <div className="chapter-meta">
                  {STATUS_BADGE[chap.status]}
                  <span className="chapter-wordcount">{(chap.wordCount || chap.originalContent.length).toLocaleString()} chars</span>
                </div>
              </div>

              <div className="chapter-actions">
                <button
                  onClick={e => { e.stopPropagation(); onDeleteChapter(chap.id); }}
                  className="btn btn-ghost btn-icon"
                  style={{ padding: 4, color: 'var(--accent-vermilion)' }}
                  title="Xóa"
                >
                  <Trash2 size={11} strokeWidth={2} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-stat">
          <div className="sidebar-stat-dot dot-translated" />
          <span>AI: {countTranslated}</span>
        </div>
        <div className="sidebar-stat">
          <div className="sidebar-stat-dot dot-converted" />
          <span>VPR: {countConverted}</span>
        </div>
        <div className="sidebar-stat">
          <div className="sidebar-stat-dot dot-raw" />
          <span>Raw: {chapters.length - countTranslated - countConverted}</span>
        </div>
      </div>
    </aside>
  );
};