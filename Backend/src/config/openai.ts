import OpenAI from 'openai';
import { env } from './index';

/**
 * Shared OpenAI client. Used for:
 *  - Whisper transcription (audio.transcriptions.create)
 *  - GPT-4o generation (chat.completions.create) for notes/flashcards/quizzes/RAG
 *  - text-embedding-3-small (embeddings.create) for RAG vector search
 */
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  organization: env.OPENAI_ORG_ID,
  maxRetries: env.OPENAI_MAX_RETRIES,
  timeout: env.OPENAI_REQUEST_TIMEOUT_MS,
});

export const openaiModels = {
  whisper: env.OPENAI_WHISPER_MODEL,
  chat: env.OPENAI_CHAT_MODEL,
  embedding: env.OPENAI_EMBEDDING_MODEL,
} as const;
