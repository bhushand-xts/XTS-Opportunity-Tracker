import { getEncoding } from 'js-tiktoken';
import type { Block } from './types';
import { prepareSource, sourceMessages, sourceResponseFormat } from './compactSource';
// GPT-OSS uses the o200k token family. Leave headroom for message/schema framing.
const encoding = getEncoding('o200k_base');
// Count the actual message content, rather than JSON-escaping the content a
// second time. Special-looking strings in an untrusted document are plain text.
const countTokens = (text: string) => encoding.encode(text, [], []).length;
function messageTokens(messages: { content: string }[], responseFormat: unknown) {
  return messages.reduce((total, message) => total + countTokens(message.content), 0)
    + countTokens(JSON.stringify(responseFormat)) + 128;
}
export function inputTokens(blocks: Block[], instructions?: string | null) {
  return messageTokens(sourceMessages(prepareSource(blocks), instructions), sourceResponseFormat);
}
// Room for the AI-written questions plus their source references and reasoning.
export const completionBudget = 3000;
