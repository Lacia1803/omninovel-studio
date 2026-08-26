import type { GlossaryItem, TranslationSettings } from '../../types/novel';

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
 * Tạo System Prompt chuẩn dịch thuật tiểu thuyết / truyện chữ
 */
function buildNovelSystemPrompt(settings: TranslationSettings, glossary: GlossaryItem[] = []): string {
  let styleInstruction = '';
  switch (settings.stylePrompt) {
    case 'literary':
      styleInstruction = 'Dịch mượt mà, văn phong tiểu thuyết Tiếng Việt bay bổng, tự nhiên, thoát nghĩa nhưng giữ nguyên nội dung gốc.';
      break;
    case 'wuxia':
      styleInstruction = 'Dịch theo phong cách Tiên hiệp/Kiếm hiệp/Ngôn tình cổ đại. Sử dụng từ Hán Việt sang trọng, chuẩn xưng hô (huynh, đệ, tỷ, muội, sư tôn, lão tổ...).';
      break;
    case 'literal':
      styleInstruction = 'Dịch sát nghĩa từng câu, giữ nguyên cấu trúc câu để đối chiếu học thuật.';
      break;
    case 'custom':
      styleInstruction = settings.customPrompt || 'Dịch sang Tiếng Việt mượt mà, chuẩn văn phong truyện chữ.';
      break;
    default:
      styleInstruction = 'Dịch mượt mà, văn phong tiểu thuyết Tiếng Việt chuẩn.';
  }

  let glossaryInstruction = '';
  const activeGlossary = glossary.filter(g => g.enabled);
  if (settings.applyGlossary && activeGlossary.length > 0) {
    const list = activeGlossary.map(g => `- "${g.sourceTerm}" -> "${g.targetTerm}"`).join('\n');
    glossaryInstruction = `\nBẮT BUỘC tuân thủ bảng thuật ngữ/tên nhân vật sau:\n${list}\n`;
  }

  return `Bạn là một dịch giả tiểu thuyết chuyên nghiệp. Nhiệm vụ của bạn là dịch đoạn văn bản truyện sau đây sang Tiếng Việt.
- Yêu cầu phong cách: ${styleInstruction}
- Giữ nguyên định dạng các đoạn văn, xuống dòng, dấu câu.
- Không tự ý thêm bớt các tình tiết hoặc lời bình luận cá nhân.
${glossaryInstruction}
Chỉ trả về duy nhất nội dung văn bản đã dịch.`;
}

/**
 * Trình dịch chính hỗ trợ đa Nguồn (Multi-provider Engine)
 */
export async function translateText(req: TranslateRequest): Promise<TranslateResponse> {
  const { text, sourceLang, targetLang, settings, glossary = [] } = req;

  if (!text || !text.trim()) {
    return { translatedText: '', providerUsed: settings.provider };
  }

  // 1. Áp dụng Glossary trước nếu bật
  const processedText = settings.applyGlossary ? applyPreGlossary(text, glossary) : text;

  try {
    switch (settings.provider) {
      case 'free_google':
        return await translateFreeGoogle(processedText, sourceLang, targetLang);
      
      case 'free_mymemory':
        return await translateFreeMyMemory(processedText, sourceLang, targetLang);

      case 'gemini':
        return await translateGemini(processedText, settings, glossary);

      case 'openai':
        return await translateOpenAI(processedText, settings, glossary);

      case 'deepseek':
        return await translateDeepSeek(processedText, settings, glossary);

      case 'claude':
        return await translateClaude(processedText, settings, glossary);

      case 'mistral':
        return await translateMistral(processedText, settings, glossary);

      case 'cohere':
        return await translateCohere(processedText, settings, glossary);

      case 'groq':
        return await translateGroq(processedText, settings, glossary);

      case 'ollama':
        return await translateOllama(processedText, settings, glossary);

      default:
        // Fallback sang Free Google
        return await translateFreeGoogle(processedText, sourceLang, targetLang);
    }
  } catch (error: any) {
    console.warn(`Translation with ${settings.provider} failed:`, error);
    // Fallback sang Free Google nếu API Key lỗi hoặc bị giới hạn
    if (settings.provider !== 'free_google') {
      console.log('Falling back to Free Google Translator...');
      return await translateFreeGoogle(processedText, sourceLang, targetLang);
    }
    throw error;
  }
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
 * Google Gemini API Adapter (gemini-2.0-flash / gemini-1.5-pro)
 */
async function translateGemini(text: string, settings: TranslationSettings, glossary: GlossaryItem[]): Promise<TranslateResponse> {
  if (!settings.apiKey) {
    throw new Error('Vui lòng nhập API Key cho Google Gemini trong cài đặt.');
  }

  const model = settings.model || 'gemini-2.0-flash';
  const systemPrompt = buildNovelSystemPrompt(settings, glossary);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;
  
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: systemPrompt + '\n\nVăn bản cần dịch:\n' + text }
        ]
      }
    ],
    generationConfig: {
      temperature: settings.temperature || 0.3,
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gemini API Error: ${res.status}`);
  }

  const data = await res.json();
  const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || text;

  return {
    translatedText: translatedText.trim(),
    providerUsed: `Gemini (${model})`,
    tokenCount: data.usageMetadata?.totalTokenCount
  };
}

/**
 * OpenAI API Adapter (GPT-4o / GPT-4o-mini)
 */
async function translateOpenAI(text: string, settings: TranslationSettings, glossary: GlossaryItem[]): Promise<TranslateResponse> {
  if (!settings.apiKey) {
    throw new Error('Vui lòng nhập API Key OpenAI trong cài đặt.');
  }

  const endpoint = settings.customEndpoint || 'https://api.openai.com/v1/chat/completions';
  const model = settings.model || 'gpt-4o-mini';
  const systemPrompt = buildNovelSystemPrompt(settings, glossary);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: settings.temperature || 0.3
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `OpenAI API Error: ${res.status}`);
  }

  const data = await res.json();
  const translatedText = data.choices?.[0]?.message?.content || text;

  return {
    translatedText: translatedText.trim(),
    providerUsed: `OpenAI (${model})`,
    tokenCount: data.usage?.total_tokens
  };
}

/**
 * DeepSeek API Adapter (deepseek-chat / deepseek-reasoner)
 */
async function translateDeepSeek(text: string, settings: TranslationSettings, glossary: GlossaryItem[]): Promise<TranslateResponse> {
  if (!settings.apiKey) {
    throw new Error('Vui lòng nhập API Key DeepSeek trong cài đặt.');
  }

  const model = settings.model || 'deepseek-chat';
  const systemPrompt = buildNovelSystemPrompt(settings, glossary);

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: settings.temperature || 0.3
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `DeepSeek API Error: ${res.status}`);
  }

  const data = await res.json();
  const translatedText = data.choices?.[0]?.message?.content || text;

  return {
    translatedText: translatedText.trim(),
    providerUsed: `DeepSeek (${model})`
  };
}

/**
 * Ollama Local LLM Adapter
 */
async function translateOllama(text: string, settings: TranslationSettings, glossary: GlossaryItem[]): Promise<TranslateResponse> {
  const endpoint = settings.customEndpoint || 'http://localhost:11434/api/generate';
  const model = settings.model || 'qwen2.5';
  const systemPrompt = buildNovelSystemPrompt(settings, glossary);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      system: systemPrompt,
      prompt: text,
      stream: false
    })
  });

  if (!res.ok) {
    throw new Error(`Ollama Local API Error: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    translatedText: (data.response || text).trim(),
    providerUsed: `Ollama (${model})`
  };
}

/**
 *******************************************************************************************
 * NEW PROVIDER ADAPTERS
 *******************************************************************************************
 */

/** Claude 3 Adapter (Anthropic Messages API) */
async function translateClaude(text: string, settings: TranslationSettings, glossary: GlossaryItem[]): Promise<TranslateResponse> {
  if (!settings.apiKey) {
    throw new Error('Vui lòng nhập API Key cho Anthropic Claude trong cài đặt.');
  }

  const model = settings.model || 'claude-3-5-sonnet-20240620';
  const systemPrompt = buildNovelSystemPrompt(settings, glossary);
  
  const endpoint = settings.customEndpoint || 'https://api.anthropic.com/v1/messages';
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: text }],
      temperature: settings.temperature || 0.3
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Claude API Error: ${res.status}`);
  }

  const data = await res.json();
  const translatedText = data.content?.[0]?.text || text;
  const tokenCount = data.usage?.input_tokens + data.usage?.output_tokens;

  return {
    translatedText: translatedText.trim(),
    providerUsed: `Claude (${model})`,
    tokenCount: tokenCount
  };
}

/** Mistral Adapter (OpenAI-compatible) */
async function translateMistral(text: string, settings: TranslationSettings, glossary: GlossaryItem[]): Promise<TranslateResponse> {
  if (!settings.apiKey) {
    throw new Error('Vui lòng nhập API Key cho Mistral AI trong cài đặt.');
  }

  const endpoint = settings.customEndpoint || 'https://api.mistral.ai/v1/chat/completions';
  const model = settings.model || 'mistral-large-latest';
  const systemPrompt = buildNovelSystemPrompt(settings, glossary);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: settings.temperature || 0.3
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Mistral API Error: ${res.status}`);
  }

  const data = await res.json();
  const translatedText = data.choices?.[0]?.message?.content || text;
  const tokenCount = data.usage?.total_tokens;

  return {
    translatedText: translatedText.trim(),
    providerUsed: `Mistral (${model})`,
    tokenCount: tokenCount
  };
}

/** Cohere Adapter (Command API) */
async function translateCohere(text: string, settings: TranslationSettings, glossary: GlossaryItem[]): Promise<TranslateResponse> {
  if (!settings.apiKey) {
    throw new Error('Vui lòng nhập API Key cho Cohere trong cài đặt.');
  }

  const model = settings.model || 'command-r-plus';
  const systemPrompt = buildNovelSystemPrompt(settings, glossary);
  
  const endpoint = settings.customEndpoint || 'https://api.cohere.ai/v1/chat';
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: model,
      message: text,
      preamble: systemPrompt,
      temperature: settings.temperature || 0.3
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Cohere API Error: ${res.status}`);
  }

  const data = await res.json();
  const translatedText = data.text || text;
  const tokenCount = data.meta?.billed_units?.input_tokens + data.meta?.billed_units?.output_tokens;

  return {
    translatedText: translatedText.trim(),
    providerUsed: `Cohere (${model})`,
    tokenCount: tokenCount
  };
}

/** Groq Adapter (OpenAI-compatible, Ultra-fast) */
async function translateGroq(text: string, settings: TranslationSettings, glossary: GlossaryItem[]): Promise<TranslateResponse> {
  if (!settings.apiKey) {
    throw new Error('Vui lòng nhập API Key cho Groq trong cài đặt.');
  }

  const endpoint = settings.customEndpoint || 'https://api.groq.com/openai/v1/chat/completions';
  const model = settings.model || 'llama3-8b-8192';
  const systemPrompt = buildNovelSystemPrompt(settings, glossary);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: settings.temperature || 0.3
    })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Groq API Error: ${res.status}`);
  }

  const data = await res.json();
  const translatedText = data.choices?.[0]?.message?.content || text;
  const tokenCount = data.usage?.total_tokens;

  return {
    translatedText: translatedText.trim(),
    providerUsed: `Groq (${model})`,
    tokenCount: tokenCount
  };
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
