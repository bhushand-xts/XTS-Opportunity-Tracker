import type { Block, Candidate } from './types';
import { prepareSource, buildCandidate, SourceUnit } from './compactSource';

// A leading numbered/lettered/bulleted item marker, e.g. "3.2 ", "2. ", "a) ", "• ".
// A multi-level number (3.2, 3.2.1) needs no trailing punctuation; a single
// level (1, a) does, so a bare word or year at a sentence start doesn't match.
const NUMBERING = /^\s*(?:\d+(?:\.\d+)+\.?|\d+[.)]|[a-zA-Z][.)]|[•\-*▪])\s+/;
// Response-request openers unambiguous enough to start a question anywhere in a
// paragraph, including mid-sentence. "State" is deliberately excluded: it's as
// often a proper noun ("State of Illinois") as a verb, and that collision is
// common enough in RFPs to not be worth the false positives.
const STRONG_VERB = /^(describe|explain|provide|detail|outline|summarize|summarise|confirm|specify|attach|identify|demonstrate)\b/i;
// Openers that are too often a continuation of a prior, unmatched sentence
// ("...This should include X") or ordinary prose ("Submit one copy") to trust
// mid-paragraph. Only count them at the very start of a block or a numbered
// item, where a genuine request is far more likely to begin.
const WEAK_VERB = /^(include|submit|indicate|list)\b/i;
const INTERROGATIVE = /[?]["'”’)\]]*$/;

function startsQuestion(unit: SourceUnit): boolean {
  const text = unit.text.trim();
  if (!text) return false;
  if (INTERROGATIVE.test(text)) return true;
  const stripped = text.replace(NUMBERING, '');
  if (STRONG_VERB.test(stripped)) return true;
  if (WEAK_VERB.test(stripped)) return unit.start === 0 || NUMBERING.test(text);
  return false;
}
// A block split purely to fit a request-size budget continues its predecessor
// with no real paragraph break, independent of document-order adjacency.
function continuesSpan(current: SourceUnit, next: SourceUnit): boolean {
  return next.blockIndex === current.blockIndex || next.block.continuation === true;
}
function startsNewItem(unit: SourceUnit): boolean {
  return NUMBERING.test(unit.text) || unit.block.structure === 'heading';
}

export interface LocalMatch { candidates: Candidate[]; coveredBlockIds: Set<string>; }

// Deterministic, zero-token question identification: explicit interrogatives and
// response-request imperatives (Describe/Explain/Provide/...), grown to include
// their own wrapped continuation text. Conservative by design — it only grows a
// span within what was originally one block/paragraph, never across distinct
// paragraphs, trading recall for never inventing or merging unrelated content.
// Table rows whose response column is a blank cell to fill in are not detected
// in this version; flag during benchmarking whether that gap matters in practice.
export function matchLocal(blocks: Block[]): LocalMatch {
  const source = prepareSource(blocks);
  const candidates: Candidate[] = [];
  const coveredBlockIds = new Set<string>();
  let index = 0;
  while (index < source.units.length) {
    if (!startsQuestion(source.units[index])) { index++; continue; }
    let end = index;
    while (end + 1 < source.units.length) {
      const next = source.units[end + 1];
      if (!continuesSpan(source.units[end], next)) break;
      if (next.block.kind === 'coverage' || startsNewItem(next)) break;
      end++;
    }
    const span = source.units.slice(index, end + 1);
    const candidate = buildCandidate(span);
    if (candidate) { candidates.push(candidate); span.forEach(unit => coveredBlockIds.add(unit.block.id)); }
    index = end + 1;
  }
  return { candidates, coveredBlockIds };
}

// Keyword rules for spreadsheet rows taken directly (no AI): checked in this order,
// against the row's section first and then the question itself.
const CATEGORY_RULES: [string, RegExp][] = [
  ['Pricing & Commercial', /\b(pric(?:e|es|ing)|costs?|fees?|commercial|payments?|invoic\w*|budget|rates?|licen[cs]\w*)\b/i],
  ['Security & Compliance', /\b(security|secure|complian\w*|privacy|gdpr|iso|soc ?2|audit\w*|encrypt\w*|accessib\w*|wcag|regulat\w*)\b/i],
  ['Technical', /\b(technical|technolog\w*|platform|hosting|infrastructure|integrat\w*|apis?|architecture|software|systems?|data|migration|functional\w*|interfaces?|cloud|servers?|network\w*)\b/i],
  ['Team', /\b(teams?|staff\w*|personnel|resources|resumes?|cvs?|roles?)\b/i],
  ['References', /\b(references?|clients?|customers?|case stud\w*)\b/i],
  ['Approach & Delivery', /\b(approach|methodolog\w*|plans?|schedule|timeline|implementation|delivery|training|support|project management|milestones?)\b/i],
  ['Company & Qualifications', /\b(company|organi[sz]ation|vendors?|experience|qualifications?|years|financial|profile|background|certifi\w*)\b/i],
];
export function categoryFor(section: string | undefined, question: string): string {
  for (const text of [section, question]) {
    if (!text) continue;
    const match = CATEGORY_RULES.find(([, pattern]) => pattern.test(text));
    if (match) return match[0];
  }
  return 'Other';
}

// Spreadsheet rows whose question column already holds the question: same id, reference and
// ordering scheme as every other candidate, categorised by keyword rules.
export function directQuestions(blocks: Block[]): Candidate[] {
  return blocks.flatMap(block => {
    if (!block.rowQuestion) return [];
    const candidate = buildCandidate(prepareSource([block]).units, block.rowQuestion.text);
    return candidate ? [{ ...candidate, category: categoryFor(block.rowQuestion.section, block.rowQuestion.text) }] : [];
  });
}

// One section's questions: spreadsheet question rows directly, everything else through the
// AI (when given) or the local rules. A section of only question rows makes no AI call.
export async function sectionCandidates(blocks: Block[], aiExtract?: (blocks: Block[]) => Promise<Candidate[]>): Promise<Candidate[]> {
  const rest = blocks.filter(block => !block.rowQuestion);
  const found = rest.some(block => block.kind !== 'coverage' && block.text.trim())
    ? aiExtract ? await aiExtract(rest) : matchLocal(rest).candidates
    : [];
  return [...directQuestions(blocks), ...found].sort((a, b) => (a.sourceOrder ?? 0) - (b.sourceOrder ?? 0));
}
