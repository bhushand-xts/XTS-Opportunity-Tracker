# Recommended extraction strategy for minimum hardware

Assessment date: 14 October 2026. Recommendation only; this document does not switch the running extraction provider or resume cloud processing.

## Verified workstation

Windows, Intel Core i5-8400 (6 CPU cores), approximately 32 GB RAM, Intel UHD Graphics 630. Node and Python are available. Docker, LibreOffice, OCRmyPDF, Tesseract and Ollama were not found on PATH; the usual LibreOffice/Tesseract Windows installation paths were also absent in the preceding activation check.

## Decision

Use a CPU-only backend document extractor as the default. Parse the full document locally, identify explicit questions and response requests using document structure and deterministic rules, and return editable candidates for user review. Do not make a local LLM, GPU, Docker or hosted AI account a prerequisite for ordinary text documents.

This is the most portable fit for the cost and confidentiality constraints. It is not equivalent to universal semantic AI understanding. Difficult layouts and implicit requests require review; accuracy and runtime must be measured before production claims.

## Format support

| Format | Proposed processing | Dependencies / limits |
| --- | --- | --- |
| Text PDF | Existing PDF.js, retaining positions, line order and page references | Reconstruct columns and tables instead of concatenating all text items. |
| DOCX | Existing Mammoth semantic HTML or structured DOCX extraction | Retain paragraphs, list numbering and table rows; raw text alone loses useful structure. |
| Legacy DOC | Evaluate Node word-extractor for local body/textbox extraction | Avoid mandatory Office/LibreOffice for basic text; complex layout fidelity needs sample testing. |
| Scanned PDF | Render pages locally and perform local OCR, one bounded page at a time | Tesseract.js or installed Tesseract; bundle/cache OCR assets locally. Tesseract.js accepts images, so PDF rendering is a separate step. OCR is slower and language dependent. |

Sources: [PDF.js](https://mozilla.github.io/pdf.js/), [Mammoth](https://github.com/mwilliamson/mammoth.js), [word-extractor](https://github.com/morungos/node-word-extractor), [Tesseract.js](https://github.com/naptha/tesseract.js).

## Extraction behavior

1. Reconstruct complete paragraphs, numbered items, table rows and continuations before identifying questions. Current 800-character blocks are a transport representation, not reliable question boundaries.
2. Recognize explicit interrogatives and response prompts such as Describe, Explain and Provide. Preserve exact wording, parent/subquestion numbering, order and source references.
3. Exclude repeated page headers/footers, contents entries, document metadata and answer-only sections conservatively. Never silently discard a whole section based on a weak keyword match.
4. Return source-backed candidates. Empty, unreadable or uncertain sections must be distinguishable from successful complete extraction. Keep manual editing and normal opportunity saving authoritative.
5. Cache results by owner/access scope, document hash and extractor version. Repeated uploads reuse work; changes to rules invalidate stale caches.

## Optional AI assistance

Groq may refine ambiguous passages only when explicitly configured. Send a minimal passage plus necessary context, rather than the full RFP. Enforce per-document and daily token ceilings and bounded retries. If the allowance is exhausted or the provider fails, retain the locally extracted candidates and report that refinement was not completed; do not wait indefinitely or claim complete semantic coverage.

The default can consume zero cloud tokens. There is no defensible fixed percentage reduction or speed estimate before benchmarking representative documents. A CPU local LLM remains an optional later enhancement, not the minimum deployment requirement.

## Scope and validation

Reuse local storage, authentication, job tables, source associations, Candidate shape and the existing editable question list. Required backend changes are a local extractor, improved structural parsing, provider-dependent configuration guards, algorithm-version cache handling and job completion/review status. No workflow transition or UI redesign is needed.

Before enabling this path, test labeled examples for explicit questions, response requests, nested numbering, tables, multicolumn PDFs, blank/mixed scanned pages, repeated content, legacy DOC and duplicate uploads. Measure missing/incorrect candidates, source fidelity, CPU time, peak memory and concurrent upload behavior. Do not promise arbitrary document coverage, fixed latency or perfect extraction.
