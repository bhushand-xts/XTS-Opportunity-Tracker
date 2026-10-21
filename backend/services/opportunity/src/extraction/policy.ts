import type { Block } from './types';

// Bump when parsing/coverage or model output representation changes.
export const EXTRACTOR_VERSION = 'questions-v14-question-label-stripped';
// Jobs extracted with user instructions store "<version>:<instructions hash>" so
// cached results are only reused for the same prompt.
export const promptVersion = (hash?: string | null) => hash ? `${EXTRACTOR_VERSION}:${hash}` : EXTRACTOR_VERSION;
export function instructionsHashOf(version: string | null | undefined): string | null {
  const [base, hash] = (version ?? '').split(':');
  return base === EXTRACTOR_VERSION && hash ? hash : null;
}
export interface CoverageRecord { page?: number; reference: string; status: string; detail?: string; }
export function analyzeCoverage(blocks: Block[]) {
  const coverage: CoverageRecord[] = [];
  const warnings: string[] = [];
  for (const block of blocks) {
    if (block.kind !== 'coverage' || !block.coverage) continue;
    coverage.push({ page: block.page, reference: block.reference, ...block.coverage });
    if (['unreadable','unsupported'].includes(block.coverage.status)) {
      warnings.push(`${block.reference}: ${block.coverage.detail || 'Some source content could not be read.'}`);
    }
  }
  return { coverage, warnings: [...new Set(warnings)], text: blocks.filter(block => block.kind !== 'coverage' && block.text.trim()) };
}
export function splitForRetry(blocks: Block[]): Block[][] | null {
  if (blocks.length > 1) {
    const middle = Math.ceil(blocks.length / 2);
    const rightStart = blocks.length > 2 ? middle - 1 : middle;
    return [blocks.slice(0,middle),blocks.slice(rightStart)];
  }
  const block = blocks[0];
  if (!block || block.text.length < 160) return null;
  const middle = Math.floor(block.text.length / 2);
  let position = block.text.lastIndexOf('\n',middle);
  if (position < middle / 2) position = block.text.lastIndexOf(' ',middle);
  if (position < middle / 2) position = middle;
  // Never split a UTF-16 surrogate pair.
  if (position > 0 && /[\uD800-\uDBFF]/.test(block.text[position-1])) position--;
  const sourceOrder = block.sourceOrder ?? Number(block.id.match(/\d+/)?.[0] || 0);
  return [
    [{ ...block, id:`${block.id}.l`, text:block.text.slice(0,position), sourceOrder }],
    [{ ...block, id:`${block.id}.r`, text:block.text.slice(position), sourceOrder:sourceOrder+0.00001, continuation:true }],
  ];
}
