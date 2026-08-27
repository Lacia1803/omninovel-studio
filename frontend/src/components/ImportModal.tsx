import React, { useState } from 'react';
import { Upload, FileText, Sparkles, X, Globe, Code, HelpCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { SourceLanguage } from '../types/novel';
import { parseNovelFile, parseRawTextOrHtml } from '../services/parsers';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (data: {
    title: string; author: string; chapters: any[];
    sourceLanguage: SourceLanguage;
  }) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImportComplete }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'paste' | 'samples'>('file');
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [sourceLang, setSourceLang] = useState<SourceLanguage>('zh-CN');
  const [customRegex, setCustomRegex] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      const parsed = await parseNovelFile(file, customRegex || undefined);
      setSuccess(`Đã nhập thành công: ${parsed.chapters.length} chương`);
      setTimeout(() => {
        onImportComplete({ title: parsed.title, author: parsed.author, chapters: parsed.chapters, sourceLanguage: parsed.detectedLanguage || sourceLang });
        onClose();
      }, 800);
    } catch (err: any) {
      setError(`Lỗi khi đọc file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = () => {
    if (!rawInput.trim()) return;
    setLoading(true);
    try {
      const parsed = parseRawTextOrHtml(rawInput);
      onImportComplete({ title: parsed.title, author: parsed.author, chapters: parsed.chapters, sourceLanguage: parsed.detectedLanguage || sourceLang });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (key: 'zh' | 'en' | 'ja') => {
    const samples: Record<string, { title: string; author: string; lang: SourceLanguage; text: string }> = {
      zh: {
        title: 'Thái Thượng Tiên Đế (Mẫu)',
        author: 'Tiêu Diêu Khách',
        lang: 'zh-CN',
        text: `第一章 紫霄宗老祖\n\n九天之上，云雾缭绕。紫霄宗禁地内，一道浩瀚无匹的威压骤然升起。\n李长生盘坐在万年灵玉床之上，缓缓睁开了双眼。\n\n"三百年了，老夫终于冲破金丹瓶颈，修成元婴道果！"\n李长生轻抚白须，嘴角微微上扬。`,
      },
      en: {
        title: 'Chronicles of Eldoria (Sample)',
        author: 'J.R. Fantasy',
        lang: 'en',
        text: `Chapter 1 The Awakening of Eldoria\n\nThe silver moon cast a spectral glow over the ancient ruins of Eldoria. Arthur stood at the edge of the forgotten temple, holding the glowing Sunblade in his trembling hands.\n\n"The prophecies were true," whispered Elena, her eyes wide with awe.`,
      },
      ja: {
        title: '異世界転生 (サンプル)',
        author: 'Light Novel Author',
        lang: 'ja',
        text: `第1章 異世界転生と最強スキル\n\n目が覚めると、見たこともない白い空間に立っていた。\n目の前には、神々しい光を放つ美しい女神が微笑んでいる。`,
      },
    };

    const s = samples[key];
    const parsed = parseRawTextOrHtml(s.text);
    onImportComplete({ title: s.title, author: s.author, chapters: parsed.chapters, sourceLanguage: s.lang });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon">
              <Upload size={16} strokeWidth={2} />
            </div>
            <div>
              <div className="modal-title">Import Manuscript</div>
              <div className="modal-subtitle">TXT · EPUB · PDF · DOCX · Paste HTML — Hỗ trợ mọi định dạng</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="modal-tabs">
          {[
            { key: 'file', icon: <FileText size={12} strokeWidth={2} />, label: 'Upload File' },
            { key: 'paste', icon: <Code size={12} strokeWidth={2} />, label: 'Paste Text' },
            { key: 'samples', icon: <Sparkles size={12} strokeWidth={2} />, label: 'Samples' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`modal-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {error && (
            <div className="notice notice-error">
              <AlertCircle size={14} className="notice-icon" strokeWidth={2} />
              {error}
            </div>
          )}
          {success && (
            <div className="notice notice-success">
              <CheckCircle2 size={14} className="notice-icon" strokeWidth={2} />
              {success}
            </div>
          )}

          <div className="grid-2">
            <div className="field-group">
              <label className="field-label"><Globe size={11} strokeWidth={2} /> Ngôn ngữ gốc</label>
              <select className="input input-boxed" value={sourceLang} onChange={e => setSourceLang(e.target.value as SourceLanguage)}>
                <option value="zh-CN">🇨🇳 Tiếng Trung (Giản/Phồn thể)</option>
                <option value="en">🇺🇸 English</option>
                <option value="ja">🇯🇵 Tiếng Nhật</option>
                <option value="ko">🇰🇷 Tiếng Hàn</option>
                <option value="auto">🌐 Auto-detect</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label"><HelpCircle size={11} strokeWidth={2} /> Chapter Regex (optional)</label>
              <input
                className="input input-boxed input-mono"
                value={customRegex}
                onChange={e => setCustomRegex(e.target.value)}
                placeholder="Mặc định: Chương \d+ | 第N章 | Chapter N"
              />
            </div>
          </div>

          {activeTab === 'file' && (
            <div>
              <input
                type="file"
                id="novel-file-input"
                accept=".txt,.epub,.pdf,.docx,.json,.novelproject"
                style={{ display: 'none' }}
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <div
                className={`dropzone ${dragOver ? 'dragging' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setDragOver(false);
                  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
                }}
                onClick={() => document.getElementById('novel-file-input')?.click()}
              >
                <div className="dropzone-icon">
                  {loading ? <span className="spinner" /> : <Upload size={26} strokeWidth={1.5} />}
                </div>
                <div className="dropzone-title">
                  {loading ? 'Đang phân tích file…' : 'Kéo thả file vào đây'}
                </div>
                <div className="dropzone-hint">hoặc click để chọn từ máy tính</div>
                <div className="format-pills">
                  {['.TXT', '.EPUB', '.PDF', '.DOCX', '.novelproject'].map(f => (
                    <span key={f} className="format-pill">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="field-group">
              <label className="field-label">Dán nội dung truyện hoặc mã HTML</label>
              <textarea
                className="input input-boxed input-mono"
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                rows={10}
                style={{ resize: 'vertical', lineHeight: 1.7, minHeight: 200 }}
                placeholder="Dán nội dung vào đây..."
              />
              <button
                onClick={handlePaste}
                disabled={!rawInput.trim() || loading}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start' }}
              >
                {loading ? <><span className="spinner" /> Đang xử lý…</> : 'Import & Tách chương'}
              </button>
            </div>
          )}

          {activeTab === 'samples' && (
            <div className="sample-cards">
              <div className="sample-card" onClick={() => loadSample('zh')}>
                <div className="sample-card-flag" style={{ color: 'var(--accent-vermilion)' }}>中</div>
                <div className="sample-card-title">Tiên Hiệp Trung Quốc</div>
                <div className="sample-card-desc">Thử convert Vietphrase & Hán Việt ngay</div>
              </div>
              <div className="sample-card" onClick={() => loadSample('en')}>
                <div className="sample-card-flag" style={{ color: 'var(--accent-indigo)' }}>EN</div>
                <div className="sample-card-title">Fantasy · English</div>
                <div className="sample-card-desc">Thử dịch AI sang Tiếng Việt mượt mà</div>
              </div>
              <div className="sample-card" onClick={() => loadSample('ja')}>
                <div className="sample-card-flag" style={{ color: 'var(--accent-gold)' }}>日</div>
                <div className="sample-card-title">Light Novel · Nhật</div>
                <div className="sample-card-desc">Isekai Light Novel — dịch từ Japanese</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};