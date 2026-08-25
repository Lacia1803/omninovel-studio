import { describe, it, expect } from 'vitest';
import type { Chapter, GlossaryItem, TranslationSettings } from '../types/novel';

describe('Novel types', () => {
  it('Chapter has required fields', () => {
    const chapter: Chapter = {
      id: 'c1',
      number: 1,
      title: 'Test',
      originalContent: 'content',
      status: 'raw',
    };
    expect(chapter.id).toBe('c1');
    expect(chapter.status).toBe('raw');
  });

  it('GlossaryItem has required fields', () => {
    const item: GlossaryItem = {
      id: 'g1',
      sourceTerm: '老祖',
      targetTerm: 'Lão Tổ',
      category: 'name',
      enabled: true,
    };
    expect(item.sourceTerm).toBe('老祖');
    expect(item.enabled).toBe(true);
  });
});
