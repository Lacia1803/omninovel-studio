import React, { useState } from 'react';
import { Download, X, FileText, FileType, File, BookOpen, Database, Sparkles } from 'lucide-react';
import type { NovelProject } from '../types/novel';
import { exportToTxt, exportToEpub, exportToPdf, exportToDocx, exportProjectFile } from '../services/exporters';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: NovelProject;
}

type ExportFormat = 'txt' | 'epub' | 'pdf' | 'docx' | 'json';

const FORMATS: { id: ExportFormat; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  { id: 'txt',  label: 'TXT',  icon: <FileText size={18} strokeWidth={1.5} />,   color: 'var(--col-ink-3)',  desc: 'Văn bản thuần, đọc mọi nơi' },
  { id: 'epub', label: 'EPUB', icon: <BookOpen size={18} strokeWidth={1.5} />,  color: 'var(--accent-jade)', desc: 'Sách điện tử, Kindle, Apple Books' },
  { id: 'pdf',  label: 'PDF',  icon: <FileType size={18} strokeWidth={1.5} />,  color: 'var(--accent-vermilion)', desc: 'Định dạng chuẩn, in ấn' },
  { id: 'docx', label: 'DOCX', icon: <File size={18} strokeWidth={1.5} />,     color: 'var(--accent-indigo)', desc: 'Microsoft Word' },
  { id: 'json', label: 'JSON', icon: <Database size={18} strokeWidth={1.5} />, color: 'var(--accent-gold)', desc: 'Backup project, import lại sau' },
];

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, project }) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('epub');
  const [contentType, setContentType] = useState<'translated' | 'converted' | 'original'>('translated');
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      switch (selectedFormat) {
        case 'txt':  await exportToTxt(project, contentType); break;
        case 'epub': await exportToEpub(project, contentType); break;
        case 'pdf':  await exportToPdf(project, contentType); break;
        case 'docx': await exportToDocx(project, contentType); break;
        case 'json': exportProjectFile(project); break;
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon">
              <Download size={16} strokeWidth={2} />
            </div>
            <div>
              <div className="modal-title">Export</div>
              <div className="modal-subtitle">{project.title} · {project.chapters.length} chương</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={15} strokeWidth={2} /></button>
        </div>

        <div className="modal-body">
          {/* Content source */}
          <div className="field-group">
            <label className="field-label"><Sparkles size={11} strokeWidth={2} /> Xuất nội dung</label>
            <select
              className="input input-boxed"
              value={contentType}
              onChange={e => setContentType(e.target.value as any)}
              disabled={selectedFormat === 'json'}
            >
              <option value="translated">Bản dịch AI</option>
              <option value="converted">Bản Convert Vietphrase</option>
              <option value="original">Bản gốc</option>
            </select>
          </div>

          {/* Format grid */}
          <div className="field-group">
            <label className="field-label"><File size={11} strokeWidth={2} /> Định dạng xuất</label>
            <div className="export-grid">
              {FORMATS.map(f => (
                <div
                  key={f.id}
                  className={`export-card ${selectedFormat === f.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFormat(f.id)}
                >
                  <div className="export-card-icon" style={{ color: f.color }}>{f.icon}</div>
                  <div className="export-card-label">{f.label}</div>
                  <div className="export-card-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="notice notice-info">
            <span style={{ fontSize: 12 }}>File sẽ được tải về máy của bạn. EPUB hỗ trợ đọc trên mọi thiết bị đọc sách.</span>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-ghost">Đóng</button>
          <button onClick={handleExport} className="btn btn-primary" disabled={exporting}>
            {exporting ? (
              <><span className="spinner" /> Đang xuất…</>
            ) : (
              <><Download size={13} strokeWidth={2} /> Xuất file {selectedFormat.toUpperCase()}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};