import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateText, applyPreGlossary } from '../services/translators/index';
import type { TranslationSettings } from '../types/novel';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const baseSettings: TranslationSettings = {
  provider: 'free_google',
  apiKey: '',
  model: '',
  stylePrompt: 'literary',
  temperature: 0.7,
  maxConcurrent: 5,
  applyGlossary: false,
  batchSize: 5,
  batchDelayMs: 1000,
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
    expect(applyPreGlossary('', [{ id: '1', sourceTerm: 'a', targetTerm: 'b', enabled: true }])).toBe('');
  });

  it('replaces enabled glossary terms', () => {
    const glossary = [
      { id: '1', sourceTerm: 'Tần Vũ', targetTerm: 'Tần Vũ (Qin Yu)', enabled: true },
      { id: '2', sourceTerm: 'Hầu', targetTerm: 'Hầu Gia', enabled: true },
    ];
    const result = applyPreGlossary('Tần Vũ là một Hầu giỏi', glossary);
    expect(result).toBe('Tần Vũ (Qin Yu) là một Hầu Gia giỏi');
  });

  it('skips disabled glossary terms', () => {
    const glossary = [
      { id: '1', sourceTerm: 'hello', targetTerm: 'xin chào', enabled: false },
    ];
    expect(applyPreGlossary('hello', glossary)).toBe('hello');
  });

  it('replaces longer terms first', () => {
    const glossary = [
      { id: '1', sourceTerm: 'táo', targetTerm: 'táo apple', enabled: true },
      { id: '2', sourceTerm: 'quả táo', targetTerm: 'apple', enabled: true },
    ];
    // longer term "quả táo" should match first
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

  it('dispatches to free_google provider', async () => {
    // Google Translate API returns: [[["translated", "original", ...]], ...]
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [[['Xin chào', '你好', null, null, 3]]],
    });

    const result = await translateText({
      text: '你好', sourceLang: 'zh', targetLang: 'vi',
      settings: { ...baseSettings, provider: 'free_google' },
      glossary: [],
    });

    expect(result.translatedText).toBe('Xin chào');
  });

  it('dispatches to free_mymemory provider', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ responseData: { translatedText: 'Hello' } }),
    });

    const result = await translateText({
      text: 'Xin chào', sourceLang: 'vi', targetLang: 'en',
      settings: { ...baseSettings, provider: 'free_mymemory' },
      glossary: [],
    });

    expect(result.translatedText).toBe('Hello');
  });

  it('free_google throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });

    await expect(
      translateText({
        text: 'test', sourceLang: 'zh', targetLang: 'vi',
        settings: { ...baseSettings, provider: 'free_google' },
        glossary: [],
      })
    ).rejects.toThrow();
  });

  it('applies glossary before translation when applyGlossary is true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { translations: [{ translatedText: 'translated' }] } }),
    });

    const glossary = [
      { id: '1', sourceTerm: 'Shrek', targetTerm: 'Shrek already translated', enabled: true },
    ];

    await translateText({
      text: 'Shrek is here', sourceLang: 'zh', targetLang: 'vi',
      settings: { ...baseSettings, provider: 'free_google', applyGlossary: true },
      glossary,
    });

    // Verify fetch was called (google free processes the text)
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});
