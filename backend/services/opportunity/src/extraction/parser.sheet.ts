import type { Block } from './types';

export interface SheetRow { number: number; cells: string[]; }
export interface SheetData { name: string; rows: SheetRow[]; }
export type SheetBlock = Pick<Block, 'text' | 'reference' | 'structure' | 'rowQuestion'>;

const QUESTION_HEADER = /\b(questions?|requirements?|descriptions?|criteria|quer(?:y|ies))\b/i;
const SECTION_HEADER = /\b(sections?|categor(?:y|ies)|areas?|modules?|domains?|topics?|groups?)\b/i;
const RESPONSE_HEADER = /\b(responses?|answers?|comments?|remarks?|complian(?:ce|t)|vendor)\b/i;
// "Question ID"/"Question No."/"Question #" names the question without holding its text.
const ID_HEADER = /\b(id|no\.?|number|#|code|ref(?:erence)?)\b/i;

// The header row is the first of the opening rows naming a question/requirement column.
function findHeader(rows: SheetRow[]) {
  for (const row of rows.slice(0, 10)) {
    if (row.cells.filter(Boolean).length < 2) continue;
    const questionMatches = row.cells.map((cell, index) => ({ cell, index })).filter(({ cell }) => QUESTION_HEADER.test(cell));
    // "Vendor response to requirement" is an answer column; "Question ID"/"Question No." is an
    // identifier column — neither holds the question text itself. Falls back to the older, looser
    // rule (response-only) and then the first match, so a sheet with no ID-like column behaves
    // exactly as before.
    const question = questionMatches.find(({ cell }) => !RESPONSE_HEADER.test(cell) && !ID_HEADER.test(cell))
      ?? questionMatches.find(({ cell }) => !RESPONSE_HEADER.test(cell)) ?? questionMatches[0];
    if (!question) continue;
    const section = row.cells.findIndex((cell, index) => index !== question.index && SECTION_HEADER.test(cell));
    return { row: row.number, question: question.index, section: section >= 0 ? section : undefined };
  }
  return null;
}
// A short single-cell row without a question mark reads as a section heading.
const isHeading = (filled: string[]) => filled.length === 1 && filled[0].length <= 80 && !filled[0].trim().endsWith('?');

// Sheets with a recognisable question column become one direct question per row (no AI).
// Other sheets become tab-separated table rows that the AI reads like any document table.
export function sheetBlocks(sheets: SheetData[]): SheetBlock[] {
  const blocks: SheetBlock[] = [];
  for (const sheet of sheets) {
    const reference = (row: number) => `Sheet "${sheet.name}", row ${row}`;
    const header = findHeader(sheet.rows);
    if (!header) {
      for (const row of sheet.rows) {
        const text = row.cells.join('\t').trim();
        if (text) blocks.push({ text, reference: reference(row.number), structure: 'table' });
      }
      continue;
    }
    let heading: string | undefined;
    for (const row of sheet.rows) {
      if (row.number <= header.row) continue;
      const filled = row.cells.map(cell => cell.trim()).filter(Boolean);
      if (!filled.length) continue;
      const text = (row.cells[header.question] ?? '').trim();
      // A row with no question text names the band of questions that follow — even when a
      // Section column was also detected, since some sheets state the section as its own
      // banner row and leave every data row's own section cell blank.
      if (!text) { if (isHeading(filled)) heading = filled[0]; continue; }
      const ownSection = header.section !== undefined ? row.cells[header.section]?.trim() : undefined;
      const section = ownSection || heading || undefined;
      blocks.push({ text, reference: reference(row.number), structure: 'table', rowQuestion: { text, ...(section ? { section } : {}) } });
    }
  }
  return blocks;
}
