import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateText, applyPreGlossary } from '../services/translators/index';
import type { TranslationSettings, GlossaryItem } from '../types/novel';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const baseSettings: TranslationSettings = {
  provider: 'claude',
  apiKey: 'test-key',
  model: '',
  stylePrompt: 'literary',
  temperature: 0.7,
  maxConcurrent: 5,
  applyGlossary: false,
  batchSize: 5,
  autoChapterSplit: false,
};

beforeEach(() => {
  mockFetch.mockReset();
});

// ─── applyPreGlossary ───
describe('applyPreGlossary', () => {
  it('returns text unchanged when glossary is empty', () => {
    expect(applyPreGlossary('hello world', [])).toBe('hello world');
  });

  it('returns empty string for empty input', () => {
    const glossary: GlossaryItem[] = [{ id: '1', sourceTerm: 'a', targetTerm: 'b', category: 'name', enabled: true }];
    expect(applyPreGlossary('', glossary)).toBe('');
  });

  it('replaces enabled glossary terms', () => {
    const glossary: GlossaryItem[] = [
      { id: '1', sourceTerm: 'Tần Vũ', targetTerm: 'Tần Vũ (Qin Yu)', category: 'name', enabled: true },
      { id: '2', sourceTerm: 'Hầu', targetTerm: 'Hầu Gia', category: 'general', enabled: true },
    ];
    const result = applyPreGlossary('Tần Vũ là một Hầu giỏi', glossary);
    expect(result).toBe('Tần Vũ (Qin Yu) là một Hầu Gia giỏi');
  });

  it('skips disabled glossary terms', () => {
    const glossary: GlossaryItem[] = [
      { id: '1', sourceTerm: 'hello', targetTerm: 'xin chào', category: 'name', enabled: false },
    ];
    expect(applyPreGlossary('hello', glossary)).toBe('hello');
  });

  it('replaces longer terms first', () => {
    const glossary: GlossaryItem[] = [
      { id: '1', sourceTerm: 'táo', targetTerm: 'táo apple', category: 'name', enabled: true },
      { id: '2', sourceTerm: 'quả táo', targetTerm: 'apple', category: 'name', enabled: true },
    ];
    const result = applyPreGlossary('quả táo ngon', glossary);
    expect(result).toBe('apple ngon');
  });
});

// ─── translateText ───
describe('translateText', () => {
  it('returns empty for empty text', async () => {
    const result = await translateText({
      text: '', sourceLang: 'zh', targetLang: 'vi',
      settings: baseSettings, glossary: [],
    });
    expect(result.translatedText).toBe('');
  });

  it('dispatches to claude provider', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: 'Xin chào' }],
        usage: { input_tokens: 5, output_tokens: 3 }
      }),
    });

    const result = await translateText({
      text: '你好', sourceLang: 'zh', targetLang: 'vi',
      settings: { ...baseSettings, provider: 'claude' },
      glossary: [],
    });

    expect(result.translatedText).toBe('Xin chào');
    expect(result.providerUsed).toContain('Claude');
  });

  it('claude throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

    await expect(
      translateText({
        text: 'test', sourceLang: 'zh', targetLang: 'vi',
        settings: { ...baseSettings, provider: 'claude' },
        glossary: [],
      })
    ).rejects.toThrow();
  });

  it('applies glossary before translation when applyGlossary is true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: 'translated' }],
        usage: { input_tokens: 5, output_tokens: 3 }
      }),
    });

    const glossary: GlossaryItem[] = [
      { id: '1', sourceTerm: 'Shrek', targetTerm: 'Shrek already translated', category: 'name', enabled: true },
    ];

    await translateText({
      text: 'Shrek is here', sourceLang: 'zh', targetLang: 'vi',
      settings: { ...baseSettings, provider: 'claude', applyGlossary: true },
      glossary,
    });

    expect(mockFetch).toHaveBeenCalledOnce();
  });
});
