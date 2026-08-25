import React, { useState } from 'react';
import { Settings, Key, Sparkles, X, ShieldCheck, ChevronRight } from 'lucide-react';
import type { TranslationProvider, TranslationSettings } from '../types/novel';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TranslationSettings;
  onUpdateSettings: (updated: TranslationSettings) => void;
}

const PROVIDERS: { value: TranslationProvider; label: string; tag: string; needsKey: boolean; color: string }[] = [
  { value: 'free_google',  label: 'Google Translate', tag: 'Free · Tức thì', needsKey: false, color: '#4285f4' },
  { value: 'free_mymemory', label: 'MyMemory Translate', tag: 'Free', needsKey: false, color: '#34a853' },
  { value: 'gemini',       label: 'Google Gemini AI',  tag: 'Khuyên dùng · Nhanh', needsKey: true,  color: '#8b5cf6' },
  { value: 'openai',       label: 'OpenAI GPT-4o',     tag: 'Chất lượng cao', needsKey: true,  color: '#10a37f' },
  { value: 'deepseek',     label: 'DeepSeek',          tag: 'Tốt cho tiểu thuyết', needsKey: true,  color: '#1a6bff' },
  { value: 'ollama',       label: 'Ollama Local LLM',  tag: 'Offline · Riêng tư', needsKey: false, color: '#f59e0b' },
];

const MODELS: Record<string, { value: string; label: string }[]> = {
  gemini:  [
    { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash (Siêu nhanh, Free tier)' },
    { value: 'gemini-1.5-pro',   label: 'gemini-1.5-pro (Chất lượng cao)' },
    { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash' },
  ],
  openai:  [
    { value: 'gpt-4o-mini', label: 'gpt-4o-mini (Rẻ, Nhanh)' },
    { value: 'gpt-4o',      label: 'gpt-4o (Tốt nhất)' },
  ],
  deepseek:[
    { value: 'deepseek-chat',     label: 'deepseek-chat (DeepSeek V3)' },
    { value: 'deepseek-reasoner', label: 'deepseek-reasoner (DeepSeek R1)' },
  ],
};

const STYLES = [
  { value: 'literary', label: '📜 Văn học mượt mà', desc: 'Bay bổng, tự nhiên, chuẩn tiểu thuyết Việt' },
  { value: 'wuxia',    label: '⚔️ Tiên hiệp / Kiếm hiệp', desc: 'Dùng Hán Việt, chuẩn xưng hô cổ đại' },
  { value: 'literal',  label: '🔍 Sát nghĩa', desc: 'Giữ nguyên cấu trúc câu để đối chiếu' },
  { value: 'custom',   label: '✏️ Tuỳ chỉnh', desc: 'Tự viết System Prompt cho AI' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  const currentProvider = PROVIDERS.find(p => p.value === settings.provider)!;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: 560 }}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon" style={{ background: 'rgba(139,92,246,0.15)', color: 'var(--accent-1)' }}>
              <Settings size={16} />
            </div>
            <div>
              <div className="modal-title">Cài đặt Dịch thuật</div>
              <div className="modal-subtitle">API Provider · Model · Văn phong</div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Free notice */}
          <div className="notice notice-success">
            <ShieldCheck size={14} className="notice-icon" />
            <span>Mặc định dùng <strong>Google Translate Free</strong> — không cần API key, dịch ngay lập tức. Thêm API key để dịch mượt mà hơn bằng AI.</span>
          </div>

          {/* Provider Selection */}
          <div className="settings-section">
            <div className="settings-section-header">
              <Sparkles size={12} /> Trình dịch
            </div>
            {PROVIDERS.map(p => (
              <div
                key={p.value}
                className="settings-row"
                style={{ cursor: 'pointer', background: settings.provider === p.value ? 'rgba(139,92,246,0.06)' : undefined }}
                onClick={() => {
                  const defaultModel = MODELS[p.value]?.[0]?.value || '';
                  onUpdateSettings({ ...settings, provider: p.value, model: defaultModel });
                }}
              >
                <div className="settings-row-label">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                    <h5 style={{ fontSize: 13 }}>{p.label}</h5>
                    {!p.needsKey && (
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'rgba(52,211,153,0.12)', color: 'var(--accent-emerald)', border: '1px solid rgba(52,211,153,0.2)', fontWeight: 600 }}>FREE</span>
                    )}
                  </div>
                  <p>{p.tag}</p>
                </div>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${settings.provider === p.value ? 'var(--accent-1)' : 'var(--col-border-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {settings.provider === p.value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-1)' }} />}
                </div>
              </div>
            ))}
          </div>

          {/* Model Selection */}
          {MODELS[settings.provider] && (
            <div className="field-group">
              <label className="field-label">Model AI</label>
              <select className="input input-mono" value={settings.model} onChange={e => onUpdateSettings({ ...settings, model: e.target.value })}>
                {MODELS[settings.provider].map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* API Key */}
          {currentProvider?.needsKey && (
            <div className="field-group">
              <label className="field-label"><Key size={12} /> API Key ({settings.provider})</label>
              <input
                type="password"
                className="input input-mono"
                value={settings.apiKey}
                onChange={e => onUpdateSettings({ ...settings, apiKey: e.target.value })}
                placeholder={`Nhập API Key của ${settings.provider}...`}
              />
              <p className="field-hint">API Key được lưu cục bộ trong trình duyệt, không gửi lên máy chủ nào.</p>
            </div>
          )}

          {/* Custom Endpoint */}
          {(settings.provider === 'ollama' || settings.provider === 'openai') && (
            <div className="field-group">
              <label className="field-label">Custom Endpoint</label>
              <input
                className="input input-mono"
                value={settings.customEndpoint || ''}
                onChange={e => onUpdateSettings({ ...settings, customEndpoint: e.target.value })}
                placeholder={settings.provider === 'ollama' ? 'http://localhost:11434/api/generate' : 'https://api.openai.com/v1/chat/completions'}
              />
            </div>
          )}

          {/* Style */}
          <div className="settings-section">
            <div className="settings-section-header">
              <Sparkles size={12} /> Văn phong dịch thuật
            </div>
            {STYLES.map(s => (
              <div
                key={s.value}
                className="settings-row"
                style={{ cursor: 'pointer', background: settings.stylePrompt === s.value ? 'rgba(139,92,246,0.06)' : undefined }}
                onClick={() => onUpdateSettings({ ...settings, stylePrompt: s.value as any })}
              >
                <div className="settings-row-label">
                  <h5>{s.label}</h5>
                  <p>{s.desc}</p>
                </div>
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${settings.stylePrompt === s.value ? 'var(--accent-1)' : 'var(--col-border-strong)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {settings.stylePrompt === s.value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-1)' }} />}
                </div>
              </div>
            ))}
          </div>

          {settings.stylePrompt === 'custom' && (
            <div className="field-group">
              <label className="field-label">System Prompt tuỳ chỉnh</label>
              <textarea
                className="input"
                rows={4}
                value={settings.customPrompt || ''}
                onChange={e => onUpdateSettings({ ...settings, customPrompt: e.target.value })}
                placeholder="Bạn là một dịch giả chuyên nghiệp..."
                style={{ resize: 'vertical' }}
              />
            </div>
          )}

          {/* Glossary toggle */}
          <div className="settings-section">
            <div className="settings-section-header">Tuỳ chọn</div>
            <div className="settings-row">
              <div className="settings-row-label">
                <h5>Áp dụng Từ điển (Glossary) khi dịch</h5>
                <p>Tự động thay thế tên nhân vật và thuật ngữ trước khi gửi cho AI</p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.applyGlossary}
                  onChange={e => onUpdateSettings({ ...settings, applyGlossary: e.target.checked })}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary">
            Lưu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
