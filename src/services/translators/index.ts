import type { GlossaryItem, TranslationSettings } from '../../types/novel';
import { api } from '../api';

export interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  settings: TranslationSettings;
  glossary?: GlossaryItem[];
}

export interface TranslateResponse {
  translatedText: string;
  providerUsed: string;
  tokenCount?: number;
}

/**
 * Xử lý thay thế Glossary (Từ điển nhân vật / thuật ngữ) trước khi gửi tới AI
 */
export function applyPreGlossary(text: string, glossary: GlossaryItem[] = []): string {
  if (!text || glossary.length === 0) return text;
  let result = text;
  const activeItems = glossary.filter(g => g.enabled && g.sourceTerm && g.targetTerm);

  // Sắp xếp thuật ngữ dài trước
  activeItems.sort((a, b) => b.sourceTerm.length - a.sourceTerm.length);

  for (const item of activeItems) {
    result = result.split(item.sourceTerm).join(item.targetTerm);
  }
  return result;
}

/**
 * Utility: Split large text into smaller chunks at paragraph boundaries */
function splitTextIntoChunks(text: string, maxChunkLength: number): string[] {
  if (text.length <= maxChunkLength) return [text];

  const paragraphs = text.split(/\n+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const p of paragraphs) {
    if ((currentChunk + '\n' + p).length > maxChunkLength) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = p;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n' + p : p;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

/**
 * Free Google Translate Endpoint (Client-side, Instant, No API Key needed)
 */
async function translateFreeGoogle(text: string, src: string, tgt: string): Promise<TranslateResponse> {
  // Chia nhỏ thành các đoạn văn nếu quá dài (Google Free limit ~2000 chars per query)
  const chunks = splitTextIntoChunks(text, 1800);
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${src === 'auto' ? 'auto' : src}&tl=${tgt}&dt=t&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google Free API Error: ${res.statusText}`);
    const data = await res.json();

    // Google returns nested array: [[["translated", "original", ...]], ...]
    let chunkResult = '';
    if (data && data[0]) {
      for (const item of data[0]) {
        if (item && item[0]) {
          chunkResult += item[0];
        }
      }
    }
    translatedChunks.push(chunkResult || chunk);
  }

  return {
    translatedText: translatedChunks.join('\n'),
    providerUsed: 'Google Translate (Free)'
  };
}

/**
 * Free MyMemory Translate Endpoint
 */
async function translateFreeMyMemory(text: string, src: string, tgt: string): Promise<TranslateResponse> {
  const chunks = splitTextIntoChunks(text, 500);
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    const langpair = `${src === 'auto' ? 'zh' : src}|${tgt}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${langpair}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.responseData) {
      translatedChunks.push(data.responseData.translatedText);
    } else {
      translatedChunks.push(chunk);
    }
  }

  return {
    translatedText: translatedChunks.join('\n'),
    providerUsed: 'MyMemory (Free)'
  };
}

/**
 * Trình dịch chính hỗ trợ đa Nguồn (Multi-provider Engine)
 * Free providers (Google, MyMemory) run client-side.
 * Paid providers route through backend proxy to keep API keys server-side.
 */
export async function translateText(req: TranslateRequest): Promise<TranslateResponse> {
  const { text, sourceLang, targetLang, settings, glossary = [] } = req;

  if (!text || !text.trim()) {
    return { translatedText: '', providerUsed: settings.provider };
  }

  // 1. Áp dụng Glossary trước nếu bật
  const processedText = settings.applyGlossary ? applyPreGlossary(text, glossary) : text;

  // Free providers run entirely client-side without API key
  if (settings.provider === 'free_google') {
    return await translateFreeGoogle(processedText, sourceLang, targetLang);
  }
  if (settings.provider === 'free_mymemory') {
    return await translateFreeMyMemory(processedText, sourceLang, targetLang);
  }

  // Paid / AI providers: route through backend API proxy to keep API keys secure
  try {
    const res = await api.translate({
      text: processedText,
      source_lang: sourceLang,
      target_lang: targetLang,
      provider: settings.provider,
      api_key: settings.apiKey,
      custom_endpoint: settings.customEndpoint,
      model: settings.model,
      style_prompt: settings.stylePrompt,
      temperature: settings.temperature,
      apply_glossary: settings.applyGlossary,
      glossary: glossary.map(g => ({ source_term: g.sourceTerm, target_term: g.targetTerm, enabled: g.enabled })),
    });

    return {
      translatedText: res.translated_text,
      providerUsed: res.provider_used,
      tokenCount: res.token_count,
    };
  } catch (error: any) {
    console.warn(`Translation with ${settings.provider} via backend failed:`, error);
    console.log('Falling back to Free Google Translator...');
    return await translateFreeGoogle(processedText, sourceLang, targetLang);
  }
}
