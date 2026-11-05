export type DocumentKind = 'pdf' | 'docx' | 'doc' | 'txt' | 'xlsx' | 'csv';
export interface Block {
  id: string;
  reference: string;
  text: string;
  kind?: 'text' | 'coverage';
  page?: number;
  structure?: 'paragraph' | 'list' | 'table' | 'heading';
  // A split block continues its predecessor without an inserted paragraph break.
  continuation?: boolean;
  sourceOrder?: number;
  coverage?: { status: 'native' | 'ocr' | 'blank' | 'unreadable' | 'unsupported'; detail?: string };
  // A spreadsheet row whose question column already holds the question: used as-is, no AI.
  rowQuestion?: { text: string; section?: string };
}
// category is assigned by AI extraction only; local rule matching leaves it unset.
export interface Candidate { id: string; text: string; sourceReference: string; validated: false; sourceOrder?: number; category?: string; }
// Shared by repository.results() (cross-chunk dedup) and the worker (merging the
// local and AI-refinement passes), so "the same question" means one thing everywhere.
export function candidateKey(candidate: Candidate): string {
  return `${candidate.sourceReference}|${candidate.text.replace(/\s+/g, ' ').trim()}`;
}
export class ExtractionError extends Error {
  constructor(public code: string, public status = 400) { super(code); }
}
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function uuid(value: unknown): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw new ExtractionError('INVALID_ID');
  return value;
}
