import React, { useState } from 'react';
import { Download, X, BookOpen, FileText, File, Archive } from 'lucide-react';
import type { Chapter } from '../types/novel';
import { exportToEpub, exportToPdf, exportToDocx, exportToTxt } from '../services/exporters';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  title: string;
  author: string;
}

type ExportFormat = 'epub' | 'pdf' | 'docx' | 'txt' | 'novelproject';

const FORMATS: { value: ExportFormat; label: string; desc: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { value: 'epub', label: 'EPUB',   desc: 'Sẵn đọc trên Kindle, Kobo, Calibre', icon: <BookOpen size={20} />,  color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  { value: 'pdf',  label: 'PDF',    desc: 'In ấn, chia sẻ mọi thiết bị',         icon: <File size={20} />,      color: '#fb7185', bg: 'rgba(251,113,133,0.12)' },
  { value: 'docx', label: 'DOCX',   desc: 'Chỉnh sửa bằng Microsoft Word',       icon: <FileText size={20} />,  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { value: 'txt',  label: 'TXT',    desc: 'Văn bản thuần, siêu nhẹ',             icon: <FileText size={20} />,  color: '#6ee7b7', bg: 'rgba(52,211,153,0.12)' },
  { value: 'novelproject', label: '.project', desc: 'Sao lưu toàn bộ dự án dịch', icon: <Archive size={20} />, color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
];

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, chapters, title, author }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('epub');
  const [contentType, setContentType] = useState<'translated' | 'converted' | 'original'>('translated');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const chToExport = chapters.map(c => ({
    ...c,
    // Swap content based on export preference
    translatedContent:
      contentType === 'original'  ? c.originalContent :
      contentType === 'converted' ? (c.convertedContent || c.originalContent) :
      (c.translatedContent || c.convertedContent || c.originalContent),
  }));

  const doExport = async () => {
    setLoading(true); setError(null);
    try {
      switch (selectedFormat) {
        case 'epub': await exportToEpub({ title, author, chapters: chToExport }); break;
        case 'pdf':  await exportToPdf({ title, author, chapters: chToExport }); break;
        case 'docx': await exportToDocx({ title, author, chapters: chToExport }); break;
        case 'txt':  exportToTxt({ title, author, chapters: chToExport }); break;
        case 'novelproject': {
          const blob = new Blob([JSON.stringify({ title, author, chapters }, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `${title}.novelproject`; a.click();
          URL.revokeObjectURL(url);
          break;
        }
      }
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const countTranslated = chapters.filter(c => c.translatedContent).length;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: 520 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon" style={{ background: 'rgba(34,211,238,0.12)', color: 'var(--accent-cyan)' }}>
              <Download size={16} />
            </div>
            <div>
              <div className="modal-title">Xuất File</div>
              <div className="modal-subtitle">{chapters.length} chương · {countTranslated} đã dịch</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={16} /></button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="notice notice-error">
              <X size={14} className="notice-icon" /> {error}
            </div>
          )}

          {/* Format grid */}
          <div className="field-group">
            <label className="field-label">Định dạng xuất</label>
            <div className="export-grid">
              {FORMATS.map(f => (
                <div
                  key={f.value}
                  className={`export-card ${selectedFormat === f.value ? 'selected' : ''}`}
                  onClick={() => setSelectedFormat(f.value)}
                >
                  <div className="export-card-icon" style={{ background: f.bg, color: f.color }}>
                    {f.icon}
                  </div>
                  <div className="export-card-label">{f.label}</div>
                  <div className="export-card-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Content type */}
          {selectedFormat !== 'novelproject' && (
            <div className="field-group">
              <label className="field-label">Nội dung xuất</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { v: 'translated', label: '🤖 Bản dịch AI' },
                  { v: 'converted',  label: '🔤 Vietphrase' },
                  { v: 'original',   label: '📄 Bản gốc' },
                ].map(ct => (
                  <button
                    key={ct.v}
                    className={`btn ${contentType === ct.v ? 'btn-primary' : 'btn-subtle'}`}
                    style={{ flex: 1, fontSize: 12 }}
                    onClick={() => setContentType(ct.v as any)}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">Huỷ</button>
          <button onClick={doExport} disabled={loading} className="btn btn-primary">
            {loading ? <><span className="spinner" /> Đang xuất...</> : <><Download size={14} /> Xuất {selectedFormat.toUpperCase()}</>}
          </button>
        </div>
      </div>
    </div>
  );
};
