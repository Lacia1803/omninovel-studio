import React, { useState } from 'react';
import { BookMarked, Plus, Trash2, Search, X, Sparkles } from 'lucide-react';
import type { GlossaryCategory, GlossaryItem } from '../types/novel';

interface GlossaryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  glossary: GlossaryItem[];
  onUpdateGlossary: (updated: GlossaryItem[]) => void;
}

const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  name: 'Nhân vật',
  location: 'Địa danh',
  technique: 'Công pháp',
  item: 'Vật phẩm',
  general: 'Chung',
};

const PRESETS: Record<string, GlossaryItem[]> = {
  xianxia: [
    { id: 'px1', sourceTerm: '老祖', targetTerm: 'Lão Tổ', category: 'name', enabled: true },
    { id: 'px2', sourceTerm: '宗主', targetTerm: 'Tông Chủ', category: 'name', enabled: true },
    { id: 'px3', sourceTerm: '金丹', targetTerm: 'Kim Đan', category: 'technique', enabled: true },
    { id: 'px4', sourceTerm: '元婴', targetTerm: 'Nguyên Anh', category: 'technique', enabled: true },
    { id: 'px5', sourceTerm: '渡劫', targetTerm: 'Độ Kiếp', category: 'technique', enabled: true },
    { id: 'px6', sourceTerm: '储物袋', targetTerm: 'Túi Trữ Vật', category: 'item', enabled: true },
    { id: 'px7', sourceTerm: '灵石', targetTerm: 'Linh Thạch', category: 'item', enabled: true },
    { id: 'px8', sourceTerm: '修仙', targetTerm: 'tu tiên', category: 'general', enabled: true },
  ],
  wuxia: [
    { id: 'pw1', sourceTerm: '掌门', targetTerm: 'Chưởng Môn', category: 'name', enabled: true },
    { id: 'pw2', sourceTerm: '少侠', targetTerm: 'Thiếu Hiệp', category: 'name', enabled: true },
    { id: 'pw3', sourceTerm: '女侠', targetTerm: 'Nữ Hiệp', category: 'name', enabled: true },
    { id: 'pw4', sourceTerm: '秘籍', targetTerm: 'Bí Kíp', category: 'item', enabled: true },
    { id: 'pw5', sourceTerm: '客栈', targetTerm: 'Tửu Điếm', category: 'location', enabled: true },
  ],
};

export const GlossaryManager: React.FC<GlossaryManagerProps> = ({ isOpen, onClose, glossary, onUpdateGlossary }) => {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [sourceTerm, setSourceTerm] = useState('');
  const [targetTerm, setTargetTerm] = useState('');
  const [category, setCategory] = useState<GlossaryCategory>('name');

  if (!isOpen) return null;

  const addTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceTerm.trim() || !targetTerm.trim()) return;
    const item: GlossaryItem = {
      id: `g_${Date.now()}`,
      sourceTerm: sourceTerm.trim(),
      targetTerm: targetTerm.trim(),
      category,
      enabled: true,
    };
    onUpdateGlossary([item, ...glossary]);
    setSourceTerm('');
    setTargetTerm('');
  };

  const loadPreset = (key: 'xianxia' | 'wuxia') => {
    const exist = new Set(glossary.map(g => g.sourceTerm));
    const newItems = PRESETS[key].filter(p => !exist.has(p.sourceTerm));
    onUpdateGlossary([...newItems, ...glossary]);
  };

  const filtered = glossary.filter(g => {
    const matchSearch = g.sourceTerm.toLowerCase().includes(search.toLowerCase()) || g.targetTerm.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || g.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: 700 }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon">
              <BookMarked size={16} strokeWidth={2} />
            </div>
            <div>
              <div className="modal-title">Glossary</div>
              <div className="modal-subtitle">{glossary.filter(g => g.enabled).length} thuật ngữ đang bật · Tên nhân vật · Địa danh · Chiêu thức</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={15} strokeWidth={2} /></button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--col-ink-3)', display: 'flex', alignItems: 'center', gap: 5, fontStyle: 'italic', fontFamily: 'var(--font-body)' }}>
              <Sparkles size={12} color="var(--accent-gold)" strokeWidth={2} /> Thêm preset:
            </span>
            <button onClick={() => loadPreset('xianxia')} className="btn btn-subtle" style={{ fontSize: 11.5, padding: '5px 12px' }}>
              ⚡ Tu Tiên / Tiên Hiệp
            </button>
            <button onClick={() => loadPreset('wuxia')} className="btn btn-subtle" style={{ fontSize: 11.5, padding: '5px 12px' }}>
              ⚔️ Kiếm Hiệp / Võ Hiệp
            </button>
          </div>

          <form onSubmit={addTerm} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 10, alignItems: 'flex-end' }}>
            <div className="field-group">
              <label className="field-label">Từ gốc</label>
              <input className="input input-boxed" value={sourceTerm} onChange={e => setSourceTerm(e.target.value)} placeholder="VD: 李长生 / Eldoria" required />
            </div>
            <div className="field-group">
              <label className="field-label">Thay thế bằng</label>
              <input className="input input-boxed" value={targetTerm} onChange={e => setTargetTerm(e.target.value)} placeholder="VD: Lý Trường Sinh" required />
            </div>
            <div className="field-group">
              <label className="field-label">Loại</label>
              <select className="input input-boxed" value={category} onChange={e => setCategory(e.target.value as GlossaryCategory)}>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: 38, minWidth: 80 }}>
              <Plus size={14} strokeWidth={2.5} /> Thêm
            </button>
          </form>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-ink-3)' }} strokeWidth={2} />
              <input
                className="input input-boxed"
                style={{ paddingLeft: 32 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm thuật ngữ..."
              />
            </div>
            <select className="input input-boxed" style={{ width: 150 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="all">Tất cả</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div style={{ border: '1px solid var(--col-paper-edge)', overflow: 'hidden' }}>
            <table className="glossary-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Bật</th>
                  <th>Từ gốc</th>
                  <th>Thay thế bằng</th>
                  <th>Loại</th>
                  <th style={{ width: 48, textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--col-ink-3)', fontStyle: 'italic', fontFamily: 'var(--font-body)', fontSize: 13 }}>
                    Từ điển trống. Thêm thuật ngữ ở trên hoặc tải preset.
                  </td></tr>
                ) : filtered.map(item => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => onUpdateGlossary(glossary.map(g => g.id === item.id ? { ...g, enabled: !g.enabled } : g))}
                        style={{ accentColor: 'var(--accent-vermilion)', cursor: 'pointer' }}
                      />
                    </td>
                    <td><span className="glossary-source">{item.sourceTerm}</span></td>
                    <td><span className="glossary-target">{item.targetTerm}</span></td>
                    <td><span className="badge badge-raw" style={{ fontSize: 9.5, fontStyle: 'normal' }}>{CATEGORY_LABELS[item.category]}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => onUpdateGlossary(glossary.filter(g => g.id !== item.id))}
                        className="btn btn-ghost btn-icon"
                        style={{ padding: 5, color: 'var(--accent-vermilion)' }}
                        title="Xóa"
                      >
                        <Trash2 size={12} strokeWidth={2} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};