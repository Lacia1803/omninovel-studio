import React, { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, ChevronLeft, ChevronRight, X,
  Sun, Moon, Coffee, Leaf, Volume2, VolumeX, Minus, Plus, BookOpen
} from 'lucide-react';
import type { Chapter } from '../types/novel';

interface ReaderModeProps {
  chapters: Chapter[];
  initialChapterId: string | null;
  onClose: () => void;
}

type ReaderTheme = 'dark' | 'light' | 'sepia' | 'forest';

const THEMES: { value: ReaderTheme; label: string; icon: React.ReactNode; textColor: string }[] = [
  { value: 'dark',   label: 'Đêm',  icon: <Moon   size={13} />, textColor: '#e8ecf4' },
  { value: 'light',  label: 'Sáng', icon: <Sun    size={13} />, textColor: '#1a1a2e' },
  { value: 'sepia',  label: 'Sepia', icon: <Coffee size={13} />, textColor: '#3d2b1f' },
  { value: 'forest', label: 'Rừng', icon: <Leaf   size={13} />, textColor: '#d4edcc' },
];

const THEME_BG: Record<ReaderTheme, string> = {
  dark:   '#0f1117',
  light:  '#fafafa',
  sepia:  '#f5ead2',
  forest: '#0d1f0d',
};

const FONTS = [
  { value: 'var(--font-serif)', label: 'Serif (Merriweather)' },
  { value: 'var(--font-ui)',    label: 'Sans-serif (Inter)' },
  { value: 'var(--font-mono)', label: 'Monospace' },
];

export const ReaderMode: React.FC<ReaderModeProps> = ({ chapters, initialChapterId, onClose }) => {
  const [chapterId, setChapterId] = useState(initialChapterId ?? chapters[0]?.id ?? '');
  const [theme, setTheme] = useState<ReaderTheme>('dark');
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState(FONTS[0].value);
  const [lineHeight, setLineHeight] = useState(1.9);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const panelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const chapter = chapters.find(c => c.id === chapterId);
  const chapterIdx = chapters.findIndex(c => c.id === chapterId);
  const hasPrev = chapterIdx > 0;
  const hasNext = chapterIdx < chapters.length - 1;

  const displayText = chapter
    ? (chapter.translatedContent || chapter.convertedContent || chapter.originalContent)
    : '';

  const paragraphs = displayText.split(/\n+/).filter(p => p.trim());

  // Auto-hide panel
  const showPanelTemporarily = () => {
    setShowPanel(true);
    if (panelTimeout.current) clearTimeout(panelTimeout.current);
    panelTimeout.current = setTimeout(() => setShowPanel(false), 3500);
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowPanel(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  const goChapter = (id: string) => {
    setChapterId(id);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const utt = new SpeechSynthesisUtterance(displayText);
      utt.lang = 'vi-VN';
      utt.rate = 0.95;
      utt.onend = () => setIsSpeaking(false);
      speechSynthesis.speak(utt);
      setIsSpeaking(true);
    }
  };

  const themeInfo = THEMES.find(t => t.value === theme)!;

  return (
    <div
      className="reader-overlay"
      style={{ background: THEME_BG[theme] }}
      data-reader-theme={theme}
      onMouseMove={showPanelTemporarily}
    >
      {/* Top Bar */}
      <div
        className="reader-topbar"
        style={{
          color: themeInfo.textColor,
          opacity: showPanel ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showPanel ? 'auto' : 'none',
        }}
      >
        {/* Left: Close + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: themeInfo.textColor,
              borderRadius: 8,
              padding: '6px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
            }}
          >
            <X size={13} /> Đóng
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.6 }}>
            <BookOpen size={14} />
            <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
              {chapter?.title}
            </span>
          </div>
        </div>

        {/* Center: Chapter navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => hasPrev && goChapter(chapters[chapterIdx - 1].id)}
            disabled={!hasPrev}
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: themeInfo.textColor, borderRadius: 7, padding: '5px 8px', cursor: 'pointer', opacity: hasPrev ? 1 : 0.3 }}
          >
            <ChevronLeft size={14} />
          </button>
          <select
            value={chapterId}
            onChange={e => goChapter(e.target.value)}
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: themeInfo.textColor, borderRadius: 7, padding: '5px 10px', fontSize: 12, fontFamily: 'var(--font-ui)', cursor: 'pointer', maxWidth: 200 }}
          >
            {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button
            onClick={() => hasNext && goChapter(chapters[chapterIdx + 1].id)}
            disabled={!hasNext}
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: themeInfo.textColor, borderRadius: 7, padding: '5px 8px', cursor: 'pointer', opacity: hasNext ? 1 : 0.3 }}
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Right: Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Theme switcher */}
          <div style={{ display: 'flex', gap: 4 }}>
            {THEMES.map(t => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                title={t.label}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: THEME_BG[t.value],
                  border: `2px solid ${theme === t.value ? themeInfo.textColor : 'rgba(255,255,255,0.2)'}`,
                  cursor: 'pointer',
                  transition: 'transform 0.15s',
                  transform: theme === t.value ? 'scale(1.2)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          {/* Font size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 7, padding: '3px 6px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button onClick={() => setFontSize(s => Math.max(12, s - 1))} style={{ background: 'none', border: 'none', color: themeInfo.textColor, cursor: 'pointer', padding: 2 }}>
              <Minus size={12} />
            </button>
            <span style={{ fontSize: 12, color: themeInfo.textColor, minWidth: 22, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{fontSize}</span>
            <button onClick={() => setFontSize(s => Math.min(26, s + 1))} style={{ background: 'none', border: 'none', color: themeInfo.textColor, cursor: 'pointer', padding: 2 }}>
              <Plus size={12} />
            </button>
          </div>

          {/* TTS */}
          <button
            onClick={toggleSpeech}
            style={{
              background: isSpeaking ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.07)',
              border: `1px solid ${isSpeaking ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: isSpeaking ? '#a78bfa' : themeInfo.textColor,
              borderRadius: 7,
              padding: '5px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* Reading Content */}
      <div className="reader-content" ref={contentRef} onClick={showPanelTemporarily}>
        <div className="reader-content-inner">
          <h2
            className="reader-chapter-heading"
            style={{ fontSize: fontSize + 8, color: themeInfo.textColor, fontFamily }}
          >
            {chapter?.title}
          </h2>

          {paragraphs.map((para, idx) => (
            <p
              key={idx}
              className="reader-paragraph"
              style={{
                fontSize,
                fontFamily,
                lineHeight,
                color: themeInfo.textColor,
                opacity: 0.88,
              }}
            >
              {para}
            </p>
          ))}

          {/* Bottom navigation */}
          <div className="reader-nav">
            <button
              onClick={() => hasPrev && goChapter(chapters[chapterIdx - 1].id)}
              disabled={!hasPrev}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: themeInfo.textColor,
                borderRadius: 10,
                padding: '10px 20px',
                cursor: hasPrev ? 'pointer' : 'not-allowed',
                opacity: hasPrev ? 1 : 0.3,
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ChevronLeft size={16} /> Chương trước
            </button>

            <span style={{ fontSize: 12, color: themeInfo.textColor, opacity: 0.5 }}>
              {chapterIdx + 1} / {chapters.length}
            </span>

            <button
              onClick={() => hasNext && goChapter(chapters[chapterIdx + 1].id)}
              disabled={!hasNext}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: themeInfo.textColor,
                borderRadius: 10,
                padding: '10px 20px',
                cursor: hasNext ? 'pointer' : 'not-allowed',
                opacity: hasNext ? 1 : 0.3,
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Chương sau <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
