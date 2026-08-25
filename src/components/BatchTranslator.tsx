import React, { useState, useCallback } from 'react';
import { Play, Pause, X, SquareX, Sparkles, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import type { Chapter, TranslationSettings } from '../types/novel';
import { translateText } from '../services/translators';

interface BatchTranslatorProps {
  isOpen: boolean;
  onClose: () => void;
  chapters: Chapter[];
  settings: TranslationSettings;
  onUpdateChapter: (chapter: Chapter) => void;
}

export const BatchTranslator: React.FC<BatchTranslatorProps> = ({
  isOpen, onClose, chapters, settings, onUpdateChapter
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [logs, setLogs] = useState<{ id: string; title: string; status: 'ok' | 'error'; msg: string }[]>([]);
  const abortRef = React.useRef(false);

  const toggleId = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAll = () => setSelectedIds(selectedIds.length === chapters.length ? [] : chapters.map(c => c.id));

  const startBatch = async () => {
    if (selectedIds.length === 0) return;
    setRunning(true); abortRef.current = false; setCompleted(0); setLogs([]);

    const toProcess = chapters.filter(c => selectedIds.includes(c.id));
    for (const chap of toProcess) {
      if (abortRef.current) break;
      try {
        const translated = await translateText(chap.originalContent, { settings, targetLang: 'vi' });
        onUpdateChapter({ ...chap, translatedContent: translated, status: 'translated' });
        setLogs(prev => [...prev, { id: chap.id, title: chap.title, status: 'ok', msg: 'Dịch thành công' }]);
      } catch (e: any) {
        onUpdateChapter({ ...chap, status: 'error' });
        setLogs(prev => [...prev, { id: chap.id, title: chap.title, status: 'error', msg: e.message }]);
      }
      setCompleted(prev => prev + 1);
    }

    setRunning(false);
  };

  const stopBatch = () => { abortRef.current = true; };

  if (!isOpen) return null;

  const progress = selectedIds.length > 0 ? (completed / selectedIds.length) * 100 : 0;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon" style={{ background: 'rgba(52,211,153,0.12)', color: 'var(--accent-emerald)' }}>
              <Sparkles size={16} />
            </div>
            <div>
              <div className="modal-title">Dịch Hàng Loạt</div>
              <div className="modal-subtitle">Tự động dịch nhiều chương với {settings.provider}</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Progress bar */}
          {(running || completed > 0) && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {running ? `Đang dịch ${completed + 1}/${selectedIds.length}…` : `Hoàn thành: ${completed}/${selectedIds.length}`}
                </span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent-1)' }}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Chapter list */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="field-label">Chọn chương ({selectedIds.length}/{chapters.length})</label>
              <button onClick={toggleAll} className="btn btn-ghost" style={{ fontSize: 11, padding: '3px 8px' }}>
                {selectedIds.length === chapters.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            <div style={{
              border: '1px solid var(--col-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              maxHeight: 280,
              overflowY: 'auto',
            }}>
              {chapters.map((chap, idx) => {
                const log = logs.find(l => l.id === chap.id);
                return (
                  <div
                    key={chap.id}
                    onClick={() => !running && toggleId(chap.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderBottom: idx < chapters.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: selectedIds.includes(chap.id) ? 'rgba(139,92,246,0.06)' : 'transparent',
                      cursor: running ? 'default' : 'pointer',
                      transition: 'background 0.1s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(chap.id)}
                      onChange={() => {}}
                      disabled={running}
                      style={{ accentColor: 'var(--accent-1)', flexShrink: 0, cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chap.title}
                      </div>
                      {log && (
                        <div style={{ fontSize: 11, color: log.status === 'ok' ? 'var(--accent-emerald)' : 'var(--accent-rose)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {log.status === 'ok' ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />} {log.msg}
                        </div>
                      )}
                    </div>
                    {/* Status indicator */}
                    {chap.status === 'translated' && !log && <CheckCircle2 size={14} color="var(--accent-emerald)" />}
                    {chap.status === 'translating' && <span className="spinner" style={{ borderTopColor: 'var(--accent-1)' }} />}
                    {chap.status === 'error' && !log && <AlertCircle size={14} color="var(--accent-rose)" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Logs (recent errors) */}
          {logs.filter(l => l.status === 'error').length > 0 && (
            <div className="notice notice-error">
              <AlertCircle size={14} className="notice-icon" />
              <div>
                <strong>Một số chương gặp lỗi:</strong>
                <ul style={{ marginTop: 4, paddingLeft: 16 }}>
                  {logs.filter(l => l.status === 'error').map(l => (
                    <li key={l.id} style={{ fontSize: 12 }}>{l.title}: {l.msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Notice */}
          <div className="notice notice-info" style={{ gap: 8 }}>
            <Clock size={13} className="notice-icon" />
            <span style={{ fontSize: 12 }}>Dịch hàng loạt xử lý tuần tự từng chương. Đừng đóng tab trong quá trình dịch.</span>
          </div>
        </div>

        <div className="modal-footer">
          {!running ? (
            <>
              <button onClick={onClose} className="btn btn-ghost">Đóng</button>
              <button
                onClick={startBatch}
                disabled={selectedIds.length === 0}
                className="btn btn-primary"
              >
                <Play size={14} /> Bắt đầu dịch {selectedIds.length > 0 ? `(${selectedIds.length} chương)` : ''}
              </button>
            </>
          ) : (
            <button onClick={stopBatch} className="btn btn-danger">
              <SquareX size={14} /> Dừng lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
