import type { Block } from './types';

// These are source boundaries, not a filter: every character remains in one segment.
export function splitSemanticText(text: string, maximum = 6000): string[] {
  if (!Number.isInteger(maximum) || maximum < 2) throw new Error('Invalid text bound');
  const result: string[] = [];
  while (text.length > maximum) {
    const prefix = text.slice(0, maximum + 1);
    let end = 0;
    for (const pattern of [/\n\s*\n/g, /\n/g, /[.!?]["')\]]*\s+/g, /\s+/g]) {
      for (const match of prefix.matchAll(pattern)) {
        const boundary = match.index! + match[0].length;
        if (boundary >= maximum / 2 && boundary <= maximum) end = boundary;
      }
      if (end) break;
    }
    if (!end) end = maximum;
    // Never cut a UTF-16 surrogate pair in half.
    if (/[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    result.push(text.slice(0, end));
    text = text.slice(end);
  }
  if (text) result.push(text);
  return result;
}

export function decodeMarkupText(value: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, name: string) => {
    if (!name.startsWith('#')) return named[name.toLowerCase()] ?? entity;
    const point = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
    return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '\ufffd';
  });
}

export interface SemanticText { text: string; structure: NonNullable<Block['structure']>; }

// Only interpret Mammoth-generated HTML as text. Never render HTML, load URLs, or
// execute attributes from the uploaded document. Table cells stay in their row.
export function mammothHtmlText(html: string): SemanticText[] {
  const result: SemanticText[] = [];
  const lists: Array<{ ordered: boolean; next: number }> = [];
  let text = '', structure: SemanticText['structure'] = 'paragraph', tableDepth = 0, rowOpen = false;
  const flush = () => {
    const value = text.replace(/\u0000/g, '').trim();
    if (value) result.push({ text: value, structure });
    text = ''; structure = 'paragraph';
  };
  for (const token of html.match(/<[^>]*>|[^<]+/g) ?? []) {
    if (!token.startsWith('<')) { text += decodeMarkupText(token); continue; }
    const found = /^<\s*(\/?)\s*([a-z][a-z0-9]*)\b/i.exec(token);
    if (!found) continue;
    const close = !!found[1], tag = found[2].toLowerCase();
    if (tag === 'table') { if (!close) { if (!tableDepth) flush(); tableDepth++; } else tableDepth--; continue; }
    if (tag === 'tr') {
      if (!close) { if (rowOpen && text) text += '\n'; else flush(); structure = 'table'; rowOpen = true; }
      else if (tableDepth <= 1) { flush(); rowOpen = false; }
      continue;
    }
    if (tag === 'td' || tag === 'th') { if (close && text && !text.endsWith('\t')) text += '\t'; continue; }
    if (tag === 'ol' || tag === 'ul') {
      if (!rowOpen) flush();
      if (close) lists.pop();
      else lists.push({ ordered: tag === 'ol', next: Math.max(1, Number(/\bstart=["']?(\d+)/i.exec(token)?.[1] || 1)) });
      continue;
    }
    if (tag === 'li') {
      if (!close) {
        if (rowOpen) { if (text && !text.endsWith('\t')) text += '\n'; }
        else flush();
        const list = lists[lists.length - 1];
        if (!rowOpen) structure = 'list';
        text += list?.ordered ? `${list.next++}. ` : '• ';
      } else if (!rowOpen) flush();
      continue;
    }
    if (/^(p|h[1-6]|blockquote)$/.test(tag)) {
      if (rowOpen) { if (close && text && !/[\n\t]$/.test(text)) text += '\n'; }
      else if (lists.length && structure === 'list') { if (close && text && !text.endsWith('\n')) text += '\n'; }
      else { flush(); if (!close && tag.startsWith('h')) structure = 'heading'; }
      continue;
    }
    if (tag === 'br') text += '\n';
    if (tag === 'img' && !close) {
      const alt = /\balt=(?:"([^"]*)"|'([^']*)')/i.exec(token);
      if (alt) text += ` ${decodeMarkupText(alt[1] ?? alt[2])} `;
    }
  }
  flush();
  return result;
}

// Header/footer text is not included in Mammoth's main HTML. The ZIP has already
// passed resource checks; only Word text nodes and paragraph/cell breaks are read.
export function wordXmlText(xml: string): string {
  const pieces: string[] = [];
  for (const match of xml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t\s*>|<w:(tab|br)\b[^>]*\/?>|<\/w:(p|tc)\s*>/g)) {
    if (match[1] !== undefined) pieces.push(decodeMarkupText(match[1]));
    else pieces.push(match[2] === 'tab' || match[3] === 'tc' ? '\t' : '\n');
  }
  return pieces.join('');
}
