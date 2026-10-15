import type { PreparedQuestion, SourceDocument } from './opportunity';
export interface QuestionExtractionAccepted { document: SourceDocument; jobId: string; }
export interface QuestionExtractionStatus {
  id: string; state: 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'PARTIAL';
  completed: number; total: number; error: string | null; questions: PreparedQuestion[];
  stage?: 'PARSING' | 'EXTRACTING' | 'RATE_LIMITED' | 'RETRYING' | 'COMPLETE' | 'FAILED' | 'PARTIAL';
  retryAfterSeconds?: number; coveredPages?: number; totalPages?: number;
  warnings?: string[]; deadlineAt?: string;
}
