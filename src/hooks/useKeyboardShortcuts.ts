import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onImport: () => void;
  onExport: () => void;
  onGlossary: () => void;
  onSettings: () => void;
  onToggleTheme: () => void;
  onBatch: () => void;
  chapterCount: number;
}

/**
 * Global keyboard shortcuts for modal opening and theme toggle.
 */
export function useKeyboardShortcuts({
  onImport, onExport, onGlossary, onSettings, onToggleTheme, onBatch, chapterCount
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'i' && !e.shiftKey) { e.preventDefault(); onImport(); }
      else if (key === 'e' && !e.shiftKey) { e.preventDefault(); if (chapterCount > 0) onExport(); }
      else if (key === 'g') { e.preventDefault(); onGlossary(); }
      else if (key === ',') { e.preventDefault(); onSettings(); }
      else if (key === '/') { e.preventDefault(); onToggleTheme(); }
      else if (key === 'b' && e.shiftKey) { e.preventDefault(); if (chapterCount > 0) onBatch(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [chapterCount, onImport, onExport, onGlossary, onSettings, onToggleTheme, onBatch]);
}
