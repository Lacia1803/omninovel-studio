// Engine dịch Vietphrase & Hán Việt tối ưu hóa trên Client (Longest Match Replacement)

export interface DictEntry {
  zh: string;
  vi: string;
}

// Từ điển Hán Việt thông dụng (Single characters)
const HAN_VIET_DICT: Record<string, string> = {
  '天': 'thiên', '地': 'địa', '玄': 'huyền', '黄': 'hoàng', '宇': 'vũ', '宙': 'trụ', '洪': 'hồng', '荒': 'hoang',
  '日': 'nhật', '月': 'nguyệt', '盈': 'doanh', '昃': 'trắc', '辰': 'thần', '宿': 'túc', '列': 'liệt', '张': 'trương',
  '寒': 'hàn', '来': 'lai', '暑': 'thử', '往': 'vãng', '秋': 'thu', '收': 'thu', '冬': 'đông', '藏': 'tàng',
  '剑': 'kiếm', '道': 'đạo', '神': 'thần', '魔': 'ma', '仙': 'tiên', '佛': 'phật', '帝': 'đế', '尊': 'tôn',
  '王': 'vương', '圣': 'thánh', '皇': 'hoàng', '主': 'chủ', '宗': 'tông', '门': 'môn', '派': 'phái', '殿': 'điện',
  '龙': 'long', '凤': 'phượng', '虎': 'hổ', '雀': 'tước', '玄': 'huyền', '武': 'vũ', '麒': 'kỳ', '麟': 'lân',
  '阴': 'âm', '阳': 'dương', '五': 'ngũ', '行': 'hành', '金': 'kim', '木': 'mộc', '水': 'thủy', '火': 'hỏa', '土': 'thổ',
  '乾': 'can', '坤': 'khôn', '太': 'thái', '极': 'cực', '无': 'vô', '有': 'hữu', '生': 'sinh', '死': 'tử',
  '破': 'phá', '灭': 'diệt', '斩': 'trảm', '杀': 'sát', '战': 'chiến', '修': 'tu', '炼': 'luyện', '化': 'hóa',
  '大': 'đại', '小': 'tiểu', '高': 'cao', '深': 'thâm', '强': 'cường', '弱': 'nhược', '真': 'chân', '假': 'giả',
  '人': 'nhân', '妖': 'yêu', '兽': 'thú', '灵': 'linh', '魂': 'hồn', '魄': 'phách', '血': 'huyết', '骨': 'cốt',
  '一': 'nhất', '二': 'nhị', '三': 'tam', '四': 'tứ', '五': 'ngũ', '六': 'lục', '七': 'thất', '八': 'bát', '九': 'cửu', '十': 'thập',
  '百': 'bách', '千': 'thiên', '万': 'vạn', '亿': 'ức', '劫': 'kiếp', '年': 'niên', '月': 'nguyệt', '日': 'nhật',
  '风': 'phong', '云': 'vân', '雷': 'lôi', '电': 'điện', '霜': 'sương', '雪': 'tuyết', '雨': 'vũ', '雾': 'mộc',
  '山': 'sơn', '河': 'hà', '海': 'hải', '江': 'giang', '湖': 'hồ', '林': 'lâm', '谷': 'cốc', '峰': 'phong',
  '城': 'thành', '国': 'quốc', '界': 'giới', '域': 'vực', '洲': 'châu', '宫': 'cung', '阁': 'gác', '楼': 'lâu',
  '长': 'trưởng', '老': 'lão', '师': 'sư', '徒': 'đồ', '兄': 'huynh', '弟': 'đệ', '姐': 'tỷ', '妹': 'muội',
  '父': 'phụ', '母': 'mẫu', '子': 'tử', '女': 'nữ', '家': 'gia', '族': 'tộc', '少': 'thiếu', '爷': 'gia',
  '飞': 'phi', '升': 'thăng', '渡': 'độ', '丹': 'đan', '器': 'khí', '符': 'phù', '阵': 'trận', '宝': 'bảo',
};

// Từ điển Vietphrase phổ biến (Tu tiên, Ngôn tình, Kiếm hiệp, Hiện đại)
const DEFAULT_VIETPHRASE_DICT: Record<string, string> = {
  // Xưng hô / Nhân vật
  '老祖': 'Lão tổ', '宗主': 'Tông chủ', '门主': 'Môn chủ', '长老': 'Trưởng lão', '掌门': 'Chưởng môn',
  '师兄': 'sư huynh', '师弟': 'sư đệ', '师姐': 'sư tỷ', '师妹': 'sư muội', '师尊': 'sư tôn', '师父': 'sư phụ',
  '徒弟': 'đồ đệ', '弟子': 'đệ tử', '前辈': 'tiền bối', '晚辈': 'vãn bối', '道友': 'đạo hữu',
  '公子': 'công tử', '小姐': 'tiểu thư', '少爷': 'thiếu gia', '丫鬟': 'nha hoàn', '前辈': 'tiền bối',
  '主角': 'chủ giác', '金手指': 'kim thủ chỉ (bàn tay vàng)', '系统': 'hệ thống', '穿越': 'xuyên qua',
  '重生': 'trọng sinh', '逆袭': 'nghịch tập', '金丹': 'Kim Đan', '元婴': 'Nguyên Anh', '化神': 'Hóa Thần',
  '炼气': 'Luyện Khí', '筑基': 'Trúc Cơ', '合体': 'Hợp Thể', '大乘': 'Đại Thừa', '渡劫': 'Độ Kiếp',
  '真仙': 'Chân Tiên', '金仙': 'Kim Tiên', '仙帝': 'Tiên Đế', '神帝': 'Thần Đế', '魔尊': 'Ma Tôn',

  // Vật phẩm / Kỹ năng
  '储物袋': 'túi trữ vật', '储物戒': 'nhẫn trữ vật', '法宝': 'pháp bảo', '灵宝': 'linh bảo', '飞剑': 'phi kiếm',
  '功法': 'công pháp', '神通': 'thần thông', '秘术': 'bí thuật', '丹药': 'đan dược', '灵石': 'linh thạch',
  '灵脉': 'linh mạch', '阵法': 'trận pháp', '符箓': 'phù lục', '妖兽': 'yêu thú', '灵兽': 'linh thú',

  // Cụm từ thường gặp
  '不可思议': 'không thể tin được', '莫名其妙': 'mơ hồ kỳ妙', '千方百计': 'trăm phương ngàn kế',
  '匪夷所思': 'không thể tưởng tượng', '如获至宝': 'như có được bảo vật', '大惊失色': 'đại kinh thất sắc',
  '冷笑一声': 'hừ lạnh một tiếng', '倒吸一口凉气': 'hít một hơi khí lạnh', '嘴角上扬': 'khóe miệng hếch lên',
  '神色平静': 'thần sắc bình tĩnh', '一拳轰出': 'một quyền oanh ra', '身形一闪': 'thân hình lóe lên',
  '狂暴': 'cuồng bạo', '恐怖': 'khủng bố', '浩瀚': 'hạo hãn', '威压': 'uy áp', '天地灵气': 'thiên địa linh khí',

  // Ngữ khí & Hành động
  '而且': 'hơn nữa', '但是': 'nhưng mà', '因为': 'bởi vì', '所以': 'cho nên', '如果': 'nếu như',
  '虽然': 'tuy rằng', '已经': 'đã', '突然': 'đột nhiên', '竟然': 'rốt cuộc / lại', '居然': 'lại có thể',
  '瞬间': 'thuấn gian (trong chớp mắt)', '刹那': 'sát na', '眨眼间': 'trong chớp mắt', '当下': 'ngay lúc này',
  '如此': 'như thế', '这时': 'lúc này', '突然之间': 'đột nhiên giữa chừng', '可以说': 'có thể nói',
};

export interface ConvertOptions {
  mode: 'vietphrase' | 'hanviet' | 'mixed';
  customGlossary?: Record<string, string>;
  normalizeParagraphs?: boolean;
  cleanWatermarks?: boolean;
}

// Sắp xếp các cụm từ theo độ dài giảm dần để ưu tiên Longest Match
function buildSortedKeys(dict: Record<string, string>): string[] {
  return Object.keys(dict).sort((a, b) => b.length - a.length);
}

/**
 * Chuyển đổi văn bản Tiếng Trung sang Vietphrase hoặc Hán Việt
 */
export function convertVietphrase(text: string, options: ConvertOptions): string {
  if (!text) return '';

  let result = text;

  // 1. Làm sạch watermark / quảng cáo nếu bật
  if (options.cleanWatermarks) {
    result = cleanWatermarkLines(result);
  }

  // 2. Chuẩn hóa đoạn văn nếu bật
  if (options.normalizeParagraphs) {
    result = normalizeParagraphFormatting(result);
  }

  // 3. Ưu tiên thay thế Custom Glossary trước
  if (options.customGlossary && Object.keys(options.customGlossary).length > 0) {
    const customKeys = buildSortedKeys(options.customGlossary);
    for (const key of customKeys) {
      const val = options.customGlossary[key];
      if (key && val) {
        result = result.split(key).join(val);
      }
    }
  }

  // 4. Nếu chế độ Hán Việt nguyên bản
  if (options.mode === 'hanviet') {
    return convertToHanVietOnly(result);
  }

  // 5. Chế độ Vietphrase (Longest Match)
  const combinedDict = { ...DEFAULT_VIETPHRASE_DICT };
  const sortedPhraseKeys = buildSortedKeys(combinedDict);

  // Áp dụng Vietphrase cho từng đoạn
  const lines = result.split('\n');
  const convertedLines = lines.map(line => {
    if (!line.trim()) return line;

    let processedLine = line;
    // Longest phrase replacement
    for (const phrase of sortedPhraseKeys) {
      if (processedLine.includes(phrase)) {
        processedLine = processedLine.split(phrase).join(` ${combinedDict[phrase]} `);
      }
    }

    // Với các ký tự Hán chưa được dịch (còn lại), chuyển sang Hán Việt
    let finalWords: string[] = [];
    let currentCharBuffer = '';

    for (let i = 0; i < processedLine.length; i++) {
      const char = processedLine[i];
      // Nếu là chữ Hán (nằm trong dải Unicode chữ Hán)
      if (isChineseChar(char)) {
        const hanVietWord = HAN_VIET_DICT[char] || char;
        finalWords.push(hanVietWord);
      } else {
        finalWords.push(char);
      }
    }

    // Làm sạch khoảng trắng dư thừa
    return finalWords.join('')
      .replace(/\s+/g, ' ')
      .replace(/\s+([,.?!;:])/g, '$1')
      .trim();
  });

  return convertedLines.join('\n');
}

/**
 * Chuyển toàn bộ ký tự Hán sang phiên âm Hán Việt từng từ một
 */
export function convertToHanVietOnly(text: string): string {
  let output = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (isChineseChar(char)) {
      output += (HAN_VIET_DICT[char] || char) + ' ';
    } else {
      output += char;
    }
  }
  return output.replace(/\s+/g, ' ').trim();
}

/**
 * Kiểm tra ký tự Unicode có phải chữ Hán không (CJK Unified Ideographs)
 */
export function isChineseChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4dbf) || // CJK Extension A
    (code >= 0x20000 && code <= 0x2a6df) // CJK Extension B
  );
}

/**
 * Tự động phân chia chương bằng Regex thông minh
 */
export function splitNovelChapters(text: string, customPattern?: string) {
  if (!text) return [];

  // Common patterns for chapters in Chinese, English, Vietnamese
  const defaultRegex = customPattern 
    ? new RegExp(customPattern, 'i')
    : /(?:^|\n)\s*(?:第[\d一二三四五六七八九十百千万]+章|Chương\s+\d+|Chapter\s+\d+|Hồi\s+\d+|Tiết\s+\d+|[\d]+[\.\s]+[^\n]+)/i;

  const lines = text.split('\n');
  const chapters: { number: number; title: string; content: string }[] = [];

  let currentTitle = 'Chương Mở Đầu';
  let currentLines: string[] = [];
  let chapterIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeader = defaultRegex.test(line.trim());

    if (isHeader && (currentLines.length > 0 || chapterIndex === 1)) {
      if (currentLines.length > 0) {
        chapters.push({
          number: chapterIndex++,
          title: currentTitle,
          content: currentLines.join('\n').trim()
        });
        currentLines = [];
      }
      currentTitle = line.trim();
    } else {
      currentLines.push(line);
    }
  }

  // Push final chapter
  if (currentLines.length > 0) {
    chapters.push({
      number: chapterIndex,
      title: currentTitle,
      content: currentLines.join('\n').trim()
    });
  }

  return chapters.length > 0 ? chapters : [{
    number: 1,
    title: 'Chương 1',
    content: text.trim()
  }];
}

/**
 * Xóa dòng quảng cáo, watermark web truyện
 */
export function cleanWatermarkLines(text: string): string {
  const watermarkPatterns = [
    /https?:\/\/\S+/gi,
    /www\.\S+/gi,
    /biquge/gi,
    /69shu/gi,
    /faloo/gi,
    /qidian/gi,
    /uukanshu/gi,
    /truyenfull/gi,
    /metruyencv/gi,
    /tangthuvien/gi,
    /xianxia/gi,
    /看书/g,
    /首发/g,
    /请收藏/g,
    /手机用户请/g
  ];

  let cleaned = text;
  for (const pattern of watermarkPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned;
}

/**
 * Chuẩn hóa cách xuống dòng đoạn văn
 */
export function normalizeParagraphFormatting(text: string): string {
  return text
    .split(/\r?\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .join('\n\n');
}
