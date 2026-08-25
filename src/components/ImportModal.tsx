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
        text: `第一章 紫霄宗老祖\n\n九天之上，云雾缭绕。紫霄宗禁地内，一道浩瀚无匹的威压骤然升起。\n李长生盘坐在万年灵玉床之上，缓缓睁开了双眼。他的眼眸之中仿佛有星辰破灭、阴阳交替的恐怖异象。\n\n"三百年了，老夫终于冲破金丹瓶颈，修成元婴道果！"\n李长生轻抚白须，嘴角微微上扬。他本是穿越者，凭借金手指系统在紫霄宗苦修数百载，如今终于成为一方巨擘。\n\n就在此时，洞府之外传来一声焦急的呼喊：\n"老祖！不好了！血魔宗宗主带领三千邪修攻打我紫霄宗山门，大阵即将破裂！"\n\n第二章 一拳轰杀\n\n紫霄宗山门前，杀气冲天。血魔宗宗主脚踏血色飞剑，眼神阴鸷地俯视着下方的紫霄宗弟子。\n"顺我者昌，逆我者亡！今日紫霄宗必被灭门！"\n\n李长生冷笑一声，一拳轰出，浩瀚的天地灵气化作一只遮天巨手，瞬间将血魔宗宗主轰成飞灰！`,
      },
      en: {
        title: 'Chronicles of Eldoria (Mẫu)',
        author: 'J.R. Fantasy',
        lang: 'en',
        text: `Chapter 1 The Awakening of Eldoria\n\nThe silver moon cast a spectral glow over the ancient ruins of Eldoria. Arthur stood at the edge of the forgotten temple, holding the glowing Sunblade in his trembling hands.\n\n"The prophecies were true," whispered Elena, her eyes wide with awe. "The Shadow Monarch has returned."\n\nArthur took a deep breath, feeling the surge of celestial energy coursing through his veins. "We must warn the High Council before the eclipse begins. There is no time to lose."\n\nChapter 2 Into the Dark Forest\n\nThe Whispering Woods were thick with dark fog. Strange creatures lurked within the shadows, watching the travelers with glowing crimson eyes.\n\n"Keep your sword drawn, Arthur," Elena cautioned, raising her staff. "These woods have consumed countless brave knights who ventured too far."`,
      },
      ja: {
        title: 'Isekai Fantasy (Mẫu)',
        author: 'Light Novel Author',
        lang: 'ja',
        text: `第1章 異世界転生と最強スキル\n\n目が覚めると、見たこともない白い空間に立っていた。\n目の前には、神々しい光を放つ美しい女神が微笑んでいる。\n\n「ようこそ、異世界へ。あなたに特別なスキルを授けましょう」\n\nこうして僕、佐藤一馬の異世界大冒険が始まった。\n\n第2章 冒険者ギルドへの登録\n\n王都のアークに到着した僕は、さっそく冒険者ギルドへと向かった。扉を開けると、強そうな冒険者たちが一斉にこちらを睨みつけてきた。`,
      },
    };

    const s = samples[key];
    const parsed = parseRawTextOrHtml(s.text);
    onImportComplete({ title: s.title, author: s.author, chapters: parsed.chapters, sourceLanguage: s.lang });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: 600 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon" style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--accent-1)' }}>
              <Upload size={16} />
            </div>
            <div>
              <div className="modal-title">Nhập Truyện</div>
              <div className="modal-subtitle">Hỗ trợ TXT · EPUB · PDF · DOCX · Dán văn bản</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          {[
            { key: 'file', icon: <FileText size={13} />, label: 'Upload File' },
            { key: 'paste', icon: <Code size={13} />, label: 'Dán văn bản' },
            { key: 'samples', icon: <Sparkles size={13} />, label: 'Truyện mẫu' },
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

        {/* Body */}
        <div className="modal-body">
          {/* Alerts */}
          {error && (
            <div className="notice notice-error">
              <AlertCircle size={14} className="notice-icon" />
              {error}
            </div>
          )}
          {success && (
            <div className="notice notice-success">
              <CheckCircle2 size={14} className="notice-icon" />
              {success}
            </div>
          )}

          {/* Options row */}
          <div className="grid-2">
            <div className="field-group">
              <label className="field-label"><Globe size={12} /> Ngôn ngữ gốc</label>
              <select className="input" value={sourceLang} onChange={e => setSourceLang(e.target.value as SourceLanguage)}>
                <option value="zh-CN">🇨🇳 Tiếng Trung (Giản thể / Phồn thể)</option>
                <option value="en">🇺🇸 Tiếng Anh</option>
                <option value="ja">🇯🇵 Tiếng Nhật</option>
                <option value="ko">🇰🇷 Tiếng Hàn</option>
                <option value="auto">🌐 Tự động nhận diện</option>
              </select>
            </div>
            <div className="field-group">
              <label className="field-label"><HelpCircle size={12} /> Regex tách chương (tuỳ chọn)</label>
              <input
                className="input input-mono"
                value={customRegex}
                onChange={e => setCustomRegex(e.target.value)}
                placeholder="Mặc định: Chương \d+ | 第N章 | Chapter N"
              />
            </div>
          </div>

          {/* FILE TAB */}
          {activeTab === 'file' && (
            <div>
              <input
                type="file"
                id="novel-file-input"
                accept=".txt,.epub,.pdf,.docx,.json,.novelproject"
                className="hidden"
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
                  {loading ? <span className="spinner" /> : <Upload size={24} />}
                </div>
                <div className="dropzone-title">
                  {loading ? 'Đang phân tích file...' : 'Kéo thả file vào đây'}
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

          {/* PASTE TAB */}
          {activeTab === 'paste' && (
            <div className="field-group">
              <label className="field-label">Dán nội dung truyện hoặc mã HTML web truyện</label>
              <textarea
                className="input input-mono"
                value={rawInput}
                onChange={e => setRawInput(e.target.value)}
                rows={10}
                style={{ resize: 'vertical', lineHeight: 1.6 }}
                placeholder="Dán nội dung vào đây..."
              />
              <button
                onClick={handlePaste}
                disabled={!rawInput.trim() || loading}
                className="btn btn-primary"
                style={{ alignSelf: 'flex-start' }}
              >
                {loading ? <><span className="spinner" /> Đang xử lý...</> : 'Nhập & Tách chương'}
              </button>
            </div>
          )}

          {/* SAMPLES TAB */}
          {activeTab === 'samples' && (
            <div className="sample-cards">
              <div className="sample-card" onClick={() => loadSample('zh')}>
                <div className="sample-card-flag" style={{ background: 'rgba(239,68,68,0.1)' }}>🇨🇳</div>
                <div className="sample-card-title">Tiên Hiệp Trung Quốc</div>
                <div className="sample-card-desc">Thử convert Vietphrase & Hán Việt ngay lập tức</div>
              </div>
              <div className="sample-card" onClick={() => loadSample('en')}>
                <div className="sample-card-flag" style={{ background: 'rgba(59,130,246,0.1)' }}>🇺🇸</div>
                <div className="sample-card-title">Fantasy Tiếng Anh</div>
                <div className="sample-card-desc">Thử tính năng dịch AI sang Tiếng Việt mượt mà</div>
              </div>
              <div className="sample-card" onClick={() => loadSample('ja')}>
                <div className="sample-card-flag" style={{ background: 'rgba(168,85,247,0.1)' }}>🇯🇵</div>
                <div className="sample-card-title">Light Novel Nhật</div>
                <div className="sample-card-desc">Isekai Light Novel — thử dịch từ Japanese</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
