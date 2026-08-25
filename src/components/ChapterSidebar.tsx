import React, { useState } from 'react';
import { Search, Plus, Trash2, CheckSquare, Square, BookOpen, ChevronRight, LayoutList } from 'lucide-react';
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

const STATUS_BADGE: Record<ChapterStatus, JSX.Element> = {
  raw:        <span className="badge badge-raw">Gốc</span>,
  converting: <span className="badge badge-converting">Converting…</span>,
  converted:  <span className="badge badge-converted">Vietphrase</span>,
  translating:<span className="badge badge-translating">Dịch…</span>,
  translated: <span className="badge badge-translated">✓ Dịch AI</span>,
  error:      <span className="badge badge-error">Lỗi</span>,
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
      {/* Sidebar header */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
            <LayoutList size={13} />
            Mục lục ({chapters.length})
          </div>
          <button onClick={onAddChapter} className="btn btn-subtle" style={{ padding: '4px 8px', fontSize: 11 }}>
            <Plus size={12} /> Thêm
          </button>
        </div>

        {/* Search */}
        <div className="sidebar-search-wrap">
          <Search size={13} className="sidebar-search-icon" />
          <input
            className="sidebar-search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm chương..."
          />
        </div>

        {/* Filter row */}
        <div className="sidebar-filter-row">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="raw">Chưa dịch</option>
            <option value="converted">Vietphrase</option>
            <option value="translated">Đã dịch AI</option>
          </select>
          <button onClick={toggleAll} className="btn btn-ghost btn-icon" style={{ padding: '5px', borderRadius: 6 }}>
            {selectedIds.length === filtered.length && filtered.length > 0
              ? <CheckSquare size={13} color="var(--accent-1)" />
              : <Square size={13} />
            }
          </button>
        </div>
      </div>

      {/* Chapter list */}
      <div className="sidebar-chapter-list">
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
            {chapters.length === 0
              ? 'Chưa có chương nào. Nhập truyện để bắt đầu.'
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
                  <span className="chapter-wordcount">{chap.wordCount || chap.originalContent.length} kí tự</span>
                </div>
              </div>

              <div className="chapter-actions">
                <button
                  onClick={e => { e.stopPropagation(); onDeleteChapter(chap.id); }}
                  className="btn btn-danger btn-icon"
                  style={{ padding: 4 }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="sidebar-footer">
        <div className="sidebar-stat">
          <div className="sidebar-stat-dot dot-translated" />
          <span>Dịch AI: {countTranslated}</span>
        </div>
        <div className="sidebar-stat">
          <div className="sidebar-stat-dot dot-converted" />
          <span>VPR: {countConverted}</span>
        </div>
        <div className="sidebar-stat">
          <div className="sidebar-stat-dot dot-raw" />
          <span>Gốc: {chapters.length - countTranslated - countConverted}</span>
        </div>
      </div>
    </aside>
  );
};
