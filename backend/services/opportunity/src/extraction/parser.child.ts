import { readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import mammoth from 'mammoth';
import yauzl from 'yauzl';
import ExcelJS from 'exceljs';
import type { Block } from './types';
import { mammothHtmlText, splitSemanticText, wordXmlText } from './parser.semantic';
import { sheetBlocks, SheetData } from './parser.sheet';

const [filename, kind, pagesArg, charsArg, libreOffice, ocr, temporary] = process.argv.slice(2);
const maxPages = Number(pagesArg), maxChars = Number(charsArg);
const run = (command: string, args: string[], timeout = 90000) => new Promise<void>((resolve, reject) => {
  execFile(command, args, { timeout, maxBuffer: 65536, windowsHide: true }, error => error ? reject(error) : resolve());
});
interface DocxInspection { supplemental: Array<{ name: string; xml: string }>; images: boolean; unsupported: boolean; }

// Read only bounded XML parts; never unpack files or resolve document relationships.
export function validateDocx(file: string): Promise<DocxInspection> {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) return reject(new Error('Invalid Word file'));
      let size = 0, count = 0, document = false, done = false;
      const inspection: DocxInspection = { supplemental: [], images: false, unsupported: false };
      const fail = (reason: Error) => { if (done) return; done = true; zip.close(); reject(reason); };
      zip.on('error', fail);
      zip.on('entry', entry => {
        size += entry.uncompressedSize; count++;
        if (size > 50 * 1024 * 1024 || count > 3000 || entry.generalPurposeBitFlag & 1 || /vbaProject|embeddings\//i.test(entry.fileName)) {
          fail(new Error('Unsupported Word content')); return;
        }
        if (entry.fileName === 'word/document.xml') document = true;
        if (/^word\/media\//.test(entry.fileName) && !entry.fileName.endsWith('/')) inspection.images = true;
        if (!/^word\/(?:document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(entry.fileName)) { zip.readEntry(); return; }
        if (entry.uncompressedSize > 10 * 1024 * 1024) { fail(new Error('Word XML limit')); return; }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) { fail(streamError ?? new Error('Invalid Word XML')); return; }
          const data: Buffer[] = []; let bytes = 0;
          stream.on('data', chunk => {
            bytes += chunk.length;
            if (bytes > 10 * 1024 * 1024) { stream.destroy(); fail(new Error('Word XML limit')); }
            else data.push(chunk);
          });
          stream.on('error', fail);
          stream.on('end', () => {
            if (done) return;
            const xml = Buffer.concat(data).toString('utf8');
            if (/<(?:[\w.-]+:)?(?:altChunk|object|chart|oMath)\b/.test(xml)) inspection.unsupported = true;
            if (/^word\/(?:header|footer)/.test(entry.fileName)) inspection.supplemental.push({ name: entry.fileName, xml });
            zip.readEntry();
          });
        });
      });
      zip.on('end', () => {
        if (done) return;
        done = true;
        if (document) resolve(inspection); else reject(new Error('Invalid Word document'));
      });
      zip.readEntry();
    });
  });
}

// Inspect the workbook's ZIP entries before ExcelJS loads it: bounded size, no macros,
// embedded objects or encrypted parts.
export function validateXlsx(file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true }, (error, zip) => {
      if (error || !zip) return reject(new Error('Invalid Excel file'));
      let size = 0, count = 0, workbook = false, done = false;
      const fail = (reason: Error) => { if (done) return; done = true; zip.close(); reject(reason); };
      zip.on('error', fail);
      zip.on('entry', entry => {
        size += entry.uncompressedSize; count++;
        if (size > 50 * 1024 * 1024 || count > 3000 || entry.generalPurposeBitFlag & 1 || /vbaProject|embeddings\//i.test(entry.fileName)) {
          fail(new Error('Unsupported Excel content')); return;
        }
        if (entry.fileName === 'xl/workbook.xml') workbook = true;
        zip.readEntry();
      });
      zip.on('end', () => {
        if (done) return;
        done = true;
        if (workbook) resolve(); else reject(new Error('Invalid Excel workbook'));
      });
      zip.readEntry();
    });
  });
}

const MAX_SHEET_ROWS = 5000, MAX_SHEET_CELLS = 200000;
// Visible sheets and rows only, cell values as displayed text (formulas use their cached result).
async function readSheets(file: string, kind: 'xlsx' | 'csv') {
  const workbook = new ExcelJS.Workbook();
  if (kind === 'xlsx') await workbook.xlsx.readFile(file); else await workbook.csv.readFile(file);
  const sheets: SheetData[] = [], hidden: string[] = [];
  let rows = 0, cells = 0;
  for (const sheet of workbook.worksheets) {
    if (sheet.state && sheet.state !== 'visible') { hidden.push(sheet.name); continue; }
    const data: SheetData = { name: sheet.name || 'Sheet', rows: [] };
    sheet.eachRow({ includeEmpty: false }, (row, number) => {
      if (row.hidden) return;
      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, column) => {
        let text = '';
        try { text = cell.text ?? ''; } catch { text = ''; }
        values[column - 1] = text.replace(/\u0000/g, '').trim();
      });
      cells += values.length;
      if (++rows > MAX_SHEET_ROWS || cells > MAX_SHEET_CELLS) throw new Error('Spreadsheet limit');
      data.rows.push({ number, cells: Array.from(values, value => value ?? '') });
    });
    sheets.push(data);
  }
  return { sheets, hidden };
}

export function pdfNativeText(items: any[]): string {
  let text = '', lastY: number | undefined, lastEnd: number | undefined, lastHeight = 12;
  for (const item of items) {
    if (typeof item.str !== 'string') continue;
    const transform = item.transform;
    const y = Number(transform?.[5]), x = Number(transform?.[4]);
    const height = Math.abs(Number(item.height)) || lastHeight;
    if (text && Number.isFinite(y) && lastY !== undefined) {
      const vertical = Math.abs(y - lastY);
      if (vertical > Math.max(height, lastHeight) * 0.5) {
        if (!text.endsWith('\n')) text += '\n';
        if (vertical > Math.max(height, lastHeight) * 1.65 && !text.endsWith('\n\n')) text += '\n';
      } else if (item.str && !/\s$/.test(text) && lastEnd !== undefined && Number.isFinite(x)) {
        const gap = x - lastEnd;
        if (gap > height * 1.25) text += '\t';
        else if (gap > height * 0.08) text += ' ';
      }
    }
    text += item.str;
    if (item.hasEOL && !text.endsWith('\n')) text += '\n';
    if (Number.isFinite(y)) lastY = y;
    if (Number.isFinite(x)) lastEnd = x + (Number(item.width) || 0);
    lastHeight = height;
  }
  return text;
}

async function main() {
  const blocks: Block[] = [];
  let total = 0;
  function add(text: string, reference: string, options: Partial<Block> = {}) {
    text = text.replace(/\u0000/g, '').trim();
    if (!text) return;
    const order = total;
    total += text.length + 1;
    if (total > maxChars) throw new Error('Text limit exceeded');
    let offset = 0;
    for (const [index, segment] of splitSemanticText(text).entries()) {
      blocks.push({ ...options, id: `b${blocks.length + 1}`, reference, text: segment, sourceOrder: order + offset,
        ...(index ? { continuation: true } : {}) });
      offset += segment.length;
    }
  }
  function coverage(reference: string, status: NonNullable<Block['coverage']>['status'], detail?: string, page?: number) {
    blocks.push({ id: `c${blocks.length + 1}`, kind: 'coverage', text: '', reference, ...(page ? { page } : {}), coverage: { status, ...(detail ? { detail } : {}) } });
  }
  const temp = temporary;
  let pdfjs: any;
  async function pdfLibrary() {
    if (!pdfjs) {
      // Preserve native ESM loading in the CommonJS service build.
      const load = new Function('specifier', 'return import(specifier)') as (s: string) => Promise<any>;
      pdfjs = await load('pdfjs-dist/legacy/build/pdf.mjs');
    }
    return pdfjs;
  }
  interface PageText { text: string; raster: boolean; graphics: boolean; }
  async function pages(file: string): Promise<PageText[]> {
    const library = await pdfLibrary();
    const task = library.getDocument({ data: new Uint8Array(await readFile(file)), isEvalSupported: false, useSystemFonts: false, verbosity: 0 });
    const pdf = await task.promise;
    try {
      if (pdf.numPages > maxPages) throw new Error('Page limit');
      const values: PageText[] = [];
      const imageOps = new Set(['paintImageMaskXObject', 'paintImageMaskXObjectGroup', 'paintImageXObject', 'paintInlineImageXObject', 'paintInlineImageXObjectGroup', 'paintImageXObjectRepeat', 'paintImageMaskXObjectRepeat'].map(name => library.OPS[name]));
      const graphicOps = new Set(['constructPath', 'shadingFill', 'paintFormXObjectBegin'].map(name => library.OPS[name]));
      let chars = 0;
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        try {
          const content = await page.getTextContent(), operators = await page.getOperatorList();
          const text = pdfNativeText(content.items);
          chars += text.length;
          if (chars > maxChars) throw new Error('Text limit exceeded');
          values.push({ text, raster: operators.fnArray.some((op: number) => imageOps.has(op)), graphics: operators.fnArray.some((op: number) => graphicOps.has(op)) });
        } finally { page.cleanup(); }
      }
      return values;
    } finally { await task.destroy(); }
  }
  async function convertToPdf(source: string) {
    const profile = path.join(temp, 'profile');
    await mkdir(path.join(profile, 'user'), { recursive: true });
    await writeFile(path.join(profile, 'user', 'registrymodifications.xcu'), `<?xml version="1.0"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item><item oor:path="/org.openoffice.Office.Writer/Content/Update"><prop oor:name="Link" oor:op="fuse"><value>2</value></prop></item></oor:items>`);
    await run(libreOffice, [`-env:UserInstallation=${pathToFileURL(profile).href}`, '--headless', '--convert-to', 'pdf', '--outdir', temp, source]);
    return path.join(temp, `${path.basename(source, path.extname(source))}.pdf`);
  }
  async function addPdf(source: string) {
    const original = await pages(source);
    const needsOcr = original.flatMap((page, index) => page.raster || (!page.text.trim() && page.graphics) ? [index + 1] : []);
    let values = original, ocrFailed = false;
    if (needsOcr.length) {
      const output = path.join(temp, 'ocr.pdf');
      try {
        // --skip-text misses scanned questions on pages containing native headings.
        // Redo masks native text and recognises image text on those same pages.
        await run(ocr, ['--redo-ocr', '--pages', needsOcr.join(','), '--output-type', 'pdf', '--optimize', '0', '--max-image-mpixels', '40', '--tesseract-timeout', '60', source, output]);
        values = await pages(output);
        if (values.length !== original.length) throw new Error('OCR page count changed');
      } catch { values = original; ocrFailed = true; }
    }
    for (const [index, value] of values.entries()) {
      const page = index + 1, reference = `Page ${page}`;
      const needsRecognition = needsOcr.includes(page);
      if (value.text.trim()) {
        for (const paragraph of value.text.split(/\n[ \t]*\n/)) add(paragraph, reference, { page, structure: paragraph.includes('\t') ? 'table' : 'paragraph' });
      }
      if (needsRecognition && ocrFailed) coverage(reference, 'unreadable', 'OCR_UNAVAILABLE_OR_FAILED', page);
      else if (needsRecognition && !value.text.trim()) coverage(reference, 'unreadable', 'OCR_NO_READABLE_TEXT', page);
      else coverage(reference, needsRecognition ? 'ocr' : value.text.trim() ? 'native' : 'blank', undefined, page);
    }
  }
  try {
    if (kind === 'pdf' || kind === 'doc') {
      await addPdf(kind === 'doc' ? await convertToPdf(filename) : filename);
    } else if (kind === 'xlsx' || kind === 'csv') {
      if (kind === 'xlsx') await validateXlsx(filename);
      const { sheets, hidden } = await readSheets(filename, kind);
      for (const block of sheetBlocks(sheets)) add(block.text, block.reference, { structure: block.structure, ...(block.rowQuestion ? { rowQuestion: block.rowQuestion } : {}) });
      for (const sheet of sheets) coverage(`Sheet "${sheet.name}"`, sheet.rows.length ? 'native' : 'blank');
      for (const name of hidden) coverage(`Sheet "${name}"`, 'unsupported', 'HIDDEN_SHEET_SKIPPED');
    } else if (kind === 'docx') {
      const inspection = await validateDocx(filename);
      let imageCount = 0;
      const result = await mammoth.convertToHtml({ path: filename }, {
        externalFileAccess: false,
        includeEmbeddedStyleMap: false,
        convertImage: mammoth.images.imgElement(async () => { imageCount++; return { src: 'about:blank' }; }),
      });
      if (result.messages.some(message => message.type === 'error')) throw new Error('Word parsing failed');
      const semantic = mammothHtmlText(result.value);
      for (const [index, value] of semantic.entries()) add(value.text, `Paragraph/table block ${index + 1}`, { structure: value.structure });
      for (const part of inspection.supplemental) {
        const text = wordXmlText(part.xml);
        for (const paragraph of text.split(/\n[ \t]*\n/)) add(paragraph, /^word\/header/.test(part.name) ? 'Word header' : 'Word footer', { structure: 'paragraph' });
      }
      // Mammoth deliberately omits image pixels and some advanced Word objects.
      // Preserve accessible text and make the gap visible instead of claiming full coverage.
      if (inspection.images || imageCount) coverage('Word embedded images', 'unsupported', 'WORD_IMAGES_REQUIRE_PDF_OCR');
      if (inspection.unsupported || result.messages.some(message => /unrecogni[sz]ed element|unsupported|could not read/i.test(message.message))) coverage('Word document', 'unsupported', 'WORD_UNSUPPORTED_CONTENT');
      if (!blocks.length) coverage('Word document', 'blank');
      else if (!blocks.some(block => block.kind === 'coverage')) coverage('Word document', 'native');
    } else {
      const data = await readFile(filename);
      if (data.includes(0)) throw new Error('Binary text file');
      const text = new TextDecoder('utf-8', { fatal: true }).decode(data);
      for (const paragraph of text.split(/\n[ \t]*\n/)) add(paragraph, 'Text document', { structure: 'paragraph' });
      coverage('Text document', text.trim() ? 'native' : 'blank');
    }
    process.stdout.write(JSON.stringify(blocks));
  } finally { await rm(temp, { recursive: true, force: true }); }
}
main().catch(() => { process.exitCode = 1; });
