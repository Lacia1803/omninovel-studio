import React, { useState } from 'react';
import { Play, X, SquareX, Sparkles, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import type { Chapter, TranslationSettings } from '../types/novel';

interface BatchTranslatorProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  settings: TranslationSettings;
  onStartBatch: (chapterIds: string[], mode: 'vietphrase' | 'ai') => void;
  isProcessing: boolean;
  progress: { current: number; total: number; activeTitle: string };
}

export const BatchTranslator: React.FC<BatchTranslatorProps> = ({
  isOpen, onClose, chapters, settings, onStartBatch, isProcessing, progress
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleId = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(selectedIds.length === chapters.length ? [] : chapters.map(c => c.id));

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon" style={{ background: 'var(--accent-gold-bg)', color: 'var(--accent-gold)' }}>
              <Sparkles size={16} strokeWidth={2} />
            </div>
            <div>
              <div className="modal-title">Batch Translation</div>
              <div className="modal-subtitle">Tự động dịch nhiều chương với {settings.provider}</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={15} strokeWidth={2} /></button>
        </div>

        <div className="modal-body">
          {(isProcessing || progress.current > 0) && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--col-ink-2)' }}>
                  {isProcessing ? `Đang dịch ${progress.current}/${progress.total}…` : `Hoàn thành: ${progress.current}/${progress.total}`}
                </span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent-vermilion)' }}>
                  {Math.round((progress.total > 0 ? progress.current / progress.total : 0) * 100)}%
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-bar" style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="field-label">Chọn chương ({selectedIds.length}/{chapters.length})</label>
              <button onClick={toggleAll} className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}>
                {selectedIds.length === chapters.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            <div style={{
              border: '1px solid var(--col-paper-edge)',
              overflow: 'hidden',
              maxHeight: 280,
              overflowY: 'auto',
            }}>
              {chapters.map((chap, idx) => (
                <div
                  key={chap.id}
                  onClick={() => !isProcessing && toggleId(chap.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderBottom: idx < chapters.length - 1 ? '1px solid var(--col-paper-edge)' : 'none',
                    background: selectedIds.includes(chap.id) ? 'var(--accent-vermilion-bg)' : 'transparent',
                    cursor: isProcessing ? 'default' : 'pointer',
                    transition: 'background 0.1s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(chap.id)}
                    onChange={() => {}}
                    disabled={isProcessing}
                    style={{ accentColor: 'var(--accent-vermilion)', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--col-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chap.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--col-ink-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {chap.originalContent.length.toLocaleString()} chars · {chap.status}
                    </div>
                  </div>
                  {chap.status === 'translated' && <CheckCircle2 size={14} color="var(--accent-jade)" strokeWidth={2} />}
                  {chap.status === 'converted' && <CheckCircle2 size={14} color="var(--accent-indigo)" strokeWidth={2} />}
                  {chap.status === 'translating' && <span className="spinner" />}
                  {chap.status === 'error' && <AlertCircle size={14} color="var(--accent-vermilion)" strokeWidth={2} />}
                </div>
              ))}
            </div>
          </div>

          <div className="notice notice-info" style={{ gap: 8 }}>
            <Clock size={13} className="notice-icon" strokeWidth={2} />
            <span style={{ fontSize: 12 }}>Dịch hàng loạt xử lý tuần tự từng chương. Đừng đóng tab trong quá trình dịch.</span>
          </div>
        </div>

        <div className="modal-footer">
          {!isProcessing ? (
            <>
              <button onClick={onClose} className="btn btn-ghost">Đóng</button>
              <button
                onClick={() => onStartBatch(selectedIds, 'ai')}
                disabled={selectedIds.length === 0}
                className="btn btn-primary"
              >
                <Play size={14} strokeWidth={2} /> Bắt đầu dịch {selectedIds.length > 0 ? `(${selectedIds.length} chương)` : ''}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="btn btn-ghost" disabled>
              <SquareX size={14} strokeWidth={2} /> Đang xử lý…
            </button>
          )}
        </div>
      </div>
    </div>
  );
};