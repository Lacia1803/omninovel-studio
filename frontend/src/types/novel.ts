export type SourceLanguage = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko' | 'auto';
export type TargetLanguage = 'vi' | 'en' | 'zh-CN';

export type ChapterStatus = 'raw' | 'converting' | 'converted' | 'translating' | 'translated' | 'error';

export interface Chapter {
  id: string;
  number: number;
  title: string;
  originalContent: string;
  convertedContent?: string; // Vietphrase / Hán Việt / Cleaned
  translatedContent?: string; // AI Translated
  status: ChapterStatus;
  notes?: string;
  wordCount?: number;
}

export type GlossaryCategory = 'name' | 'location' | 'technique' | 'item' | 'general';

export interface GlossaryItem {
  id: string;
  sourceTerm: string;
  targetTerm: string;
  category: GlossaryCategory;
  note?: string;
  enabled: boolean;
}

export type TranslationProvider =
  | 'gemini'
  | 'openai'
  | 'deepseek'
  | 'claude'
  | 'groq'
  | 'vietphrase_only';

export interface TranslationSettings {
  provider: TranslationProvider;
  apiKey: string;
  customEndpoint?: string;
  model: string;
  stylePrompt: 'literary' | 'literal' | 'vietphrase' | 'wuxia' | 'custom';
  customPrompt?: string;
  temperature: number;
  maxConcurrent: number;
  batchSize: number;
  applyGlossary: boolean;
  autoChapterSplit: boolean;
  customChapterRegex?: string;
}

export type ReaderTheme = 'light' | 'dark' | 'sepia' | 'emerald' | 'cyberpunk' | 'nord';
export type ViewMode = 'parallel_dual' | 'single_translated' | 'single_converted' | 'single_original' | 'interleaved' | 'parallel_converted_translated';

export interface ReaderSettings {
  theme: ReaderTheme;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  viewMode: ViewMode;
  ttsRate: number;
  ttsVoice: string;
  autoScrollSpeed: number;
}

export interface NovelProject {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverImage?: string;
  sourceLanguage: SourceLanguage;
  targetLanguage: TargetLanguage;
  chapters: Chapter[];
  glossary: GlossaryItem[];
  settings: TranslationSettings;
  createdAt: number;
  updatedAt: number;
}
