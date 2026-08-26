import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import type { NovelProject } from '../../types/novel';

/**
 * Utility trigger file download in browser
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export TXT File (Bản dịch hoặc Bản Convert)
 */
export function exportToTxt(project: NovelProject, contentType: 'translated' | 'converted' | 'original' = 'translated') {
  let content = `=====================================\n`;
  content += `${project.title}\n`;
  content += `Tác giả: ${project.author}\n`;
  content += `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}\n`;
  content += `=====================================\n\n`;

  project.chapters.forEach(chap => {
    content += `\n\n-------------------------------------\n`;
    content += `${chap.title}\n`;
    content += `-------------------------------------\n\n`;

    const bodyText = (contentType === 'translated' ? chap.translatedContent : 
                     contentType === 'converted' ? chap.convertedContent : 
                     chap.originalContent) || chap.originalContent;
    
    content += bodyText + '\n';
  });

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${sanitizeFilename(project.title)}_${contentType}.txt`);
}

/**
 * Export EPUB Book (Chuẩn EPUB 2.0/3.0 đóng gói bằng JSZip)
 */
export async function exportToEpub(project: NovelProject, contentType: 'translated' | 'converted' | 'original' = 'translated') {
  const zip = new JSZip();

  // 1. mimetype
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  zip.folder('META-INF')?.file('container.xml', `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const oebps = zip.folder('OEBPS');
  if (!oebps) return;

  // CSS Stylesheet
  oebps.file('style.css', `
    body { font-family: sans-serif; line-height: 1.6; padding: 1em; color: #1a1a1a; }
    h1 { text-align: center; color: #2c3e50; margin-bottom: 0.5em; }
    h2 { text-align: center; color: #34495e; border-bottom: 2px solid #ecf0f1; padding-bottom: 0.3em; margin-top: 1.5em; }
    p { text-indent: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; text-align: justify; }
    .author { text-align: center; font-style: italic; color: #7f8c8d; margin-bottom: 2em; }
  `);

  // Title Page (Cover / Info)
  oebps.file('title.xhtml', `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(project.title)}</title>
  <link rel="stylesheet" href="style.css" type="text/css"/>
</head>
<body>
  <h1>${escapeXml(project.title)}</h1>
  <div class="author">Tác giả: ${escapeXml(project.author)}</div>
  <p style="text-indent:0; text-align:center;">Dịch & Đóng gói bởi OmniNovel Studio</p>
</body>
</html>`);

  // Chapter Files & Manifest Items
  let manifestItems = `<item id="style" href="style.css" media-type="text/css"/>\n`;
  manifestItems += `<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>\n`;

  let spineItems = `<itemref idref="title"/>\n`;
  let tocNcxItems = `<navPoint id="title" playOrder="1"><navLabel><text>Trang Tiêu Đề</text></navLabel><content src="title.xhtml"/></navPoint>\n`;

  project.chapters.forEach((chap, idx) => {
    const chapId = `chap_${idx + 1}`;
    const chapFileName = `${chapId}.xhtml`;

    const bodyText = (contentType === 'translated' ? chap.translatedContent : 
                     contentType === 'converted' ? chap.convertedContent : 
                     chap.originalContent) || chap.originalContent;

    const paragraphsHtml = bodyText
      .split('\n')
      .filter(p => p.trim())
      .map(p => `<p>${escapeXml(p.trim())}</p>`)
      .join('\n');

    const chapXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(chap.title)}</title>
  <link rel="stylesheet" href="style.css" type="text/css"/>
</head>
<body>
  <h2>${escapeXml(chap.title)}</h2>
  ${paragraphsHtml}
</body>
</html>`;

    oebps.file(chapFileName, chapXhtml);
    manifestItems += `<item id="${chapId}" href="${chapFileName}" media-type="application/xhtml+xml"/>\n`;
    spineItems += `<itemref idref="${chapId}"/>\n`;
    tocNcxItems += `<navPoint id="${chapId}" playOrder="${idx + 2}"><navLabel><text>${escapeXml(chap.title)}</text></navLabel><content src="${chapFileName}"/></navPoint>\n`;
  });

  // content.opf
  const contentOpf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeXml(project.title)}</dc:title>
    <dc:creator>${escapeXml(project.author)}</dc:creator>
    <dc:language>vi</dc:language>
    <dc:identifier id="BookId">urn:uuid:${project.id}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifestItems}
  </manifest>
  <spine toc="ncx">
    ${spineItems}
  </spine>
</package>`;

  oebps.file('content.opf', contentOpf);

  // toc.ncx
  const tocNcx = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${project.id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(project.title)}</text></docTitle>
  <navMap>
    ${tocNcxItems}
  </navMap>
</ncx>`;

  oebps.file('toc.ncx', tocNcx);

  const zipBlob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  downloadBlob(zipBlob, `${sanitizeFilename(project.title)}_${contentType}.epub`);
}

/**
 * Export PDF Document (Sử dụng jsPDF với định dạng chuyên nghiệp)
 */
export async function exportToPdf(project: NovelProject, contentType: 'translated' | 'converted' | 'original' = 'translated') {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxLineWidth = pageWidth - margin * 2;
  let cursorY = 30;

  // Title page
  doc.setFontSize(22);
  doc.text(project.title, pageWidth / 2, cursorY, { align: 'center' });
  
  cursorY += 12;
  doc.setFontSize(14);
  doc.text(`Tác giả: ${project.author}`, pageWidth / 2, cursorY, { align: 'center' });

  cursorY += 20;
  doc.setFontSize(10);
  doc.text('Xuất file bởi OmniNovel Studio', pageWidth / 2, cursorY, { align: 'center' });

  doc.addPage();
  cursorY = 20;

  project.chapters.forEach((chap) => {
    if (cursorY > 250) {
      doc.addPage();
      cursorY = 20;
    }

    // Chapter Header
    doc.setFontSize(16);
    doc.text(chap.title, margin, cursorY);
    cursorY += 10;

    const bodyText = (contentType === 'translated' ? chap.translatedContent : 
                     contentType === 'converted' ? chap.convertedContent : 
                     chap.originalContent) || chap.originalContent;

    const paragraphs = bodyText.split('\n').filter(p => p.trim());
    doc.setFontSize(11);

    paragraphs.forEach(p => {
      const splitLines = doc.splitTextToSize(p, maxLineWidth);
      
      if (cursorY + splitLines.length * 6 > 270) {
        doc.addPage();
        cursorY = 20;
      }

      doc.text(splitLines, margin, cursorY);
      cursorY += splitLines.length * 6 + 3;
    });

    cursorY += 10;
  });

  doc.save(`${sanitizeFilename(project.title)}_${contentType}.pdf`);
}

/**
 * Export DOCX File (Microsoft Word)
 */
export async function exportToDocx(project: NovelProject, contentType: 'translated' | 'converted' | 'original' = 'translated') {
  const docParagraphs: Paragraph[] = [
    new Paragraph({
      text: project.title,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      text: `Tác giả: ${project.author}`,
      // heading: HeadingLevel.SUBTITLE,
    }),
  ];

  project.chapters.forEach(chap => {
    docParagraphs.push(
      new Paragraph({
        text: chap.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      })
    );

    const bodyText = (contentType === 'translated' ? chap.translatedContent : 
                     contentType === 'converted' ? chap.convertedContent : 
                     chap.originalContent) || chap.originalContent;

    const paragraphs = bodyText.split('\n').filter(p => p.trim());
    paragraphs.forEach(p => {
      docParagraphs.push(
        new Paragraph({
          children: [new TextRun({ text: p, size: 24 })],
          spacing: { after: 120 }
        })
      );
    });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: docParagraphs,
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${sanitizeFilename(project.title)}_${contentType}.docx`);
}

/**
 * Export Markdown File
 */
export function exportToMarkdown(project: NovelProject, contentType: 'translated' | 'converted' | 'original' = 'translated') {
  let md = `# ${project.title}\n\n`;
  md += `**Tác giả:** ${project.author}\n\n`;
  md += `---\n\n`;

  project.chapters.forEach(chap => {
    md += `## ${chap.title}\n\n`;

    const bodyText = (contentType === 'translated' ? chap.translatedContent :
                     contentType === 'converted' ? chap.convertedContent :
                     chap.originalContent) || chap.originalContent;

    md += bodyText.split('\n').filter(p => p.trim()).join('\n\n') + '\n\n';
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `${sanitizeFilename(project.title)}_${contentType}.md`);
}

/**
 * Export Project File (`.novelproject` backup)
 */
export function exportProjectFile(project: NovelProject) {
  const jsonStr = JSON.stringify(project, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  downloadBlob(blob, `${sanitizeFilename(project.title)}.novelproject`);
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s_-]/gi, '_');
}
