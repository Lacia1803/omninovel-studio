import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import type { Chapter, NovelProject, SourceLanguage } from '../../types/novel';
import { splitNovelChapters } from '../dictionaries/vietphrase';

// Cấu hình pdf.js worker URL cho client browser
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedNovelData {
  title: string;
  author: string;
  description?: string;
  coverImage?: string;
  detectedLanguage: SourceLanguage;
  chapters: Chapter[];
}

/**
 * Tự động phát hiện định dạng file và gọi Parser phù hợp
 */
export async function parseNovelFile(file: File, customChapterRegex?: string): Promise<ParsedNovelData> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.txt')) {
    return await parseTxtFile(file, customChapterRegex);
  } else if (fileName.endsWith('.epub')) {
    return await parseEpubFile(file);
  } else if (fileName.endsWith('.pdf')) {
    return await parsePdfFile(file);
  } else if (fileName.endsWith('.docx')) {
    return await parseDocxFile(file);
  } else if (fileName.endsWith('.json') || fileName.endsWith('.novelproject')) {
    return await parseProjectJsonFile(file);
  } else {
    // Default fallback to text parsing
    return await parseTxtFile(file, customChapterRegex);
  }
}

/**
 * Parse file TXT với tự động nhận diện Mã Hóa (UTF-8, GBK, Big5, Shift-JIS)
 */
export async function parseTxtFile(file: File, customChapterRegex?: string): Promise<ParsedNovelData> {
  const buffer = await file.arrayBuffer();
  let text = '';

  // Thử giải mã UTF-8 trước
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    text = decoder.decode(buffer);
  } catch {
    // Nếu lỗi UTF-8, thử mã hóa Tiếng Trung GBK / GB2312
    try {
      const decoder = new TextDecoder('gbk');
      text = decoder.decode(buffer);
    } catch {
      // Fallback
      const decoder = new TextDecoder('utf-8');
      text = decoder.decode(buffer);
    }
  }

  const title = file.name.replace(/\.[^/.]+$/, '');
  const detectedLang = detectLanguageFromText(text);

  // Phân chia chương
  const rawChapters = splitNovelChapters(text, customChapterRegex);
  const chapters: Chapter[] = rawChapters.map((c, idx) => ({
    id: `chap_${Date.now()}_${idx}`,
    number: c.number,
    title: c.title,
    originalContent: c.content,
    status: 'raw',
    wordCount: c.content.length
  }));

  return {
    title: title,
    author: 'Khuyết danh',
    detectedLanguage: detectedLang,
    chapters: chapters
  };
}

/**
 * Parse file EPUB (Giải mã zip, đọc file container.xml, content.opf và trích xuất các chương)
 */
export async function parseEpubFile(file: File): Promise<ParsedNovelData> {
  const zip = await JSZip.loadAsync(file);
  let title = file.name.replace(/\.epub$/i, '');
  let author = 'Khuyết danh';
  let coverImage: string | undefined = undefined;

  // 1. Đọc container.xml để tìm opf path
  const containerFile = zip.file('META-INF/container.xml');
  let opfPath = '';
  if (containerFile) {
    const containerXml = await containerFile.async('text');
    const match = containerXml.match(/full-path="([^"]+)"/);
    if (match) opfPath = match[1];
  }

  let htmlFiles: { path: string; title: string }[] = [];

  if (opfPath && zip.file(opfPath)) {
    const opfContent = await zip.file(opfPath)!.async('text');
    const parser = new DOMParser();
    const doc = parser.parseFromString(opfContent, 'application/xml');

    const titleEl = doc.querySelector('title');
    if (titleEl) title = titleEl.textContent || title;

    const creatorEl = doc.querySelector('creator');
    if (creatorEl) author = creatorEl.textContent || author;

    // Tìm spine items
    const manifestItems = Array.from(doc.querySelectorAll('manifest > item'));
    const idToHref: Record<string, string> = {};
    manifestItems.forEach(item => {
      const id = item.getAttribute('id');
      const href = item.getAttribute('href');
      if (id && href) idToHref[id] = href;
    });

    const spineItems = Array.from(doc.querySelectorAll('spine > itemref'));
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);

    spineItems.forEach((itemref, index) => {
      const idref = itemref.getAttribute('idref');
      if (idref && idToHref[idref]) {
        const fullPath = opfDir + idToHref[idref];
        htmlFiles.push({
          path: fullPath,
          title: `Chương ${index + 1}`
        });
      }
    });
  }

  // Fallback nếu không parse được opf: lấy tất cả file html trong zip
  if (htmlFiles.length === 0) {
    zip.forEach((relativePath) => {
      if (relativePath.endsWith('.html') || relativePath.endsWith('.xhtml')) {
        htmlFiles.push({ path: relativePath, title: relativePath });
      }
    });
  }

  const chapters: Chapter[] = [];
  let fullText = '';

  for (let i = 0; i < htmlFiles.length; i++) {
    const item = htmlFiles[i];
    const fileInZip = zip.file(item.path);
    if (fileInZip) {
      const htmlContent = await fileInZip.async('text');
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // Tìm tiêu đề chương từ <h1-3> hoặc <title>
      const hTag = doc.querySelector('h1, h2, h3, title');
      const chapterTitle = hTag?.textContent?.trim() || `Chương ${i + 1}`;

      // Bóc tách nội dung chữ
      const paragraphs = Array.from(doc.querySelectorAll('p, div'))
        .map(el => el.textContent?.trim())
        .filter(t => t && t.length > 0);

      const content = paragraphs.join('\n\n');
      if (content.length > 20) {
        fullText += content + '\n';
        chapters.push({
          id: `epub_chap_${Date.now()}_${i}`,
          number: chapters.length + 1,
          title: chapterTitle,
          originalContent: content,
          status: 'raw',
          wordCount: content.length
        });
      }
    }
  }

  const detectedLang = detectLanguageFromText(fullText.substring(0, 1000));

  return {
    title,
    author,
    coverImage,
    detectedLanguage: detectedLang,
    chapters: chapters.length > 0 ? chapters : [{
      id: `epub_${Date.now()}`,
      number: 1,
      title: title,
      originalContent: fullText,
      status: 'raw'
    }]
  };
}

/**
 * Parse file PDF bằng pdf.js
 */
export async function parsePdfFile(file: File): Promise<ParsedNovelData> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageStrings = textContent.items.map((item: any) => item.str);
    fullText += pageStrings.join(' ') + '\n\n';
  }

  const title = file.name.replace(/\.pdf$/i, '');
  const rawChapters = splitNovelChapters(fullText);

  return {
    title,
    author: 'Khuyết danh',
    detectedLanguage: detectLanguageFromText(fullText.substring(0, 500)),
    chapters: rawChapters.map((c, idx) => ({
      id: `pdf_chap_${Date.now()}_${idx}`,
      number: c.number,
      title: c.title,
      originalContent: c.content,
      status: 'raw',
      wordCount: c.content.length
    }))
  };
}

/**
 * Parse file Word DOCX (Bóc tách document.xml từ ZIP)
 */
export async function parseDocxFile(file: File): Promise<ParsedNovelData> {
  const zip = await JSZip.loadAsync(file);
  const docFile = zip.file('word/document.xml');
  let fullText = '';

  if (docFile) {
    const xmlText = await docFile.async('text');
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    
    // Tìm các thẻ đoạn văn <w:p>
    const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
    const lines = paragraphs.map(p => {
      const texts = Array.from(p.getElementsByTagName('w:t')).map(t => t.textContent || '');
      return texts.join('');
    }).filter(line => line.trim().length > 0);

    fullText = lines.join('\n\n');
  }

  const title = file.name.replace(/\.docx$/i, '');
  const rawChapters = splitNovelChapters(fullText);

  return {
    title,
    author: 'Khuyết danh',
    detectedLanguage: detectLanguageFromText(fullText.substring(0, 500)),
    chapters: rawChapters.map((c, idx) => ({
      id: `docx_chap_${Date.now()}_${idx}`,
      number: c.number,
      title: c.title,
      originalContent: c.content,
      status: 'raw',
      wordCount: c.content.length
    }))
  };
}

/**
 * Parse file Dự Án OmniNovel (.novelproject hoặc JSON)
 */
export async function parseProjectJsonFile(file: File): Promise<ParsedNovelData> {
  const text = await file.text();
  const project: NovelProject = JSON.parse(text);
  
  return {
    title: project.title || 'Dự án Truyện',
    author: project.author || 'Khuyết danh',
    description: project.description,
    coverImage: project.coverImage,
    detectedLanguage: project.sourceLanguage || 'auto',
    chapters: project.chapters || []
  };
}

/**
 * Parse văn bản thô / Web HTML đã paste
 */
export function parseRawTextOrHtml(rawInput: string): ParsedNovelData {
  let cleanedText = rawInput;

  // Nếu input chứa HTML tags
  if (/<[a-z][\s\S]*>/i.test(rawInput)) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawInput, 'text/html');
    const paragraphs = Array.from(doc.querySelectorAll('p, div, article'))
      .map(el => el.textContent?.trim())
      .filter(t => t && t.length > 0);
    
    cleanedText = paragraphs.join('\n\n') || doc.body.textContent || rawInput;
  }

  const rawChapters = splitNovelChapters(cleanedText);
  const detectedLang = detectLanguageFromText(cleanedText.substring(0, 500));

  return {
    title: 'Truyện Nhập Trực Tiếp',
    author: 'Khuyết danh',
    detectedLanguage: detectedLang,
    chapters: rawChapters.map((c, idx) => ({
      id: `raw_${Date.now()}_${idx}`,
      number: c.number,
      title: c.title,
      originalContent: c.content,
      status: 'raw',
      wordCount: c.content.length
    }))
  };
}

/**
 * Tự động phát hiện Ngôn ngữ gốc (Trung, Nhật, Hàn, Anh) từ mẫu văn bản
 */
export function detectLanguageFromText(text: string): SourceLanguage {
  if (!text) return 'zh-CN';

  // Chinese chars
  const zhMatch = text.match(/[\u4e00-\u9fa5]/g);
  if (zhMatch && zhMatch.length > text.length * 0.1) {
    return 'zh-CN';
  }

  // Japanese chars (Hiragana / Katakana)
  const jaMatch = text.match(/[\u3040-\u30ff]/g);
  if (jaMatch && jaMatch.length > 5) {
    return 'ja';
  }

  // Korean chars (Hangul)
  const koMatch = text.match(/[\uac00-\ud7af]/g);
  if (koMatch && koMatch.length > 5) {
    return 'ko';
  }

  return 'en';
}
