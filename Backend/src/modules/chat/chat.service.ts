import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import { ChatSession, ChatSessionDocument, ChatMessage } from './chat.model';
import { NotFoundError } from '@shared/errors';
import { retrievalService, RetrievedChunk } from './rag/retrieval.service';
import { openai, openaiModels } from '@config/openai';
import { logger } from '@config/logger';

const SYSTEM_PROMPT =
  'You are a tutor helping a student learn from their own study materials. Answer the question using ONLY the ' +
  'context provided below. If the answer is not contained in the context, say "I couldn\'t find relevant ' +
  'information in this content. Could you rephrase your question?" Do not use outside knowledge. Keep answers ' +
  'concise and pedagogical.';

const HISTORY_WINDOW = 10; // last N messages included in the prompt for conversational context

export const chatService = {
  async getSession(sessionId: string, userId: string): Promise<ChatSessionDocument> {
    const session = await ChatSession.findOne({ _id: sessionId, userId });
    if (!session) throw new NotFoundError('Chat session');
    return session;
  },

  async listSessions(userId: string): Promise<Array<{ id: string; title: string; contentItemId: string | null; updatedAt: Date }>> {
    const sessions = await ChatSession.find({ userId }).sort({ updatedAt: -1 }).select('title contentItemId updatedAt');
    return sessions.map((s) => ({
      id: s._id.toString(),
      title: s.title,
      contentItemId: s.contentItemId?.toString() ?? null,
      updatedAt: s.updatedAt,
    }));
  },

  async renameSession(sessionId: string, userId: string, title: string): Promise<ChatSessionDocument> {
    const session = await this.getSession(sessionId, userId);
    session.title = title;
    await session.save();
    return session;
  },

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    await ChatSession.deleteOne({ _id: sessionId, userId });
  },

  /**
   * UC-013: Core RAG chat flow.
   *   1. Find-or-create the chat session.
   *   2. Retrieve top-K relevant chunks (scoped to one content item, or
   *      across the user's whole library for the Global AI Tutor — FR-057).
   *   3. Build the GPT-4o prompt: system + context + recent history + query.
   *   4. Stream the response via Server-Sent Events to `res`.
   *   5. Persist both the user message and the final assistant message.
   *
   * @param res - The Express response, used to stream SSE chunks directly.
   *   Callers (the controller) must set the appropriate SSE headers before
   *   invoking this method.
   */
  async sendMessageStreaming(
    userId: string,
    input: { message: string; sessionId?: string; contentItemId?: string },
    res: Response
  ): Promise<void> {
    let session: ChatSessionDocument;
    if (input.sessionId) {
      session = await this.getSession(input.sessionId, userId);
    } else {
      session = await ChatSession.create({
        userId,
        contentItemId: input.contentItemId ?? null,
        title: input.message.slice(0, 50),
      });
    }

    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: input.message,
      sources: [],
      tokenCount: null,
      createdAt: new Date(),
    };
    session.messages.push(userMessage);

    const chunks = await retrievalService.retrieveRelevantChunks(input.message, {
      contentItemId: input.contentItemId,
      ownerId: userId,
    });
    const contextString = retrievalService.buildContextString(chunks);

    const recentHistory = session.messages
      .slice(-(HISTORY_WINDOW + 1), -1) // exclude the message we just pushed
      .map((m) => ({ role: m.role, content: m.content }));

    const completionStream = await openai.chat.completions.create({
      model: openaiModels.chat,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `Context:\n${contextString}` },
        ...recentHistory,
        { role: 'user', content: input.message },
      ],
      temperature: 0.3,
    });

    let fullResponse = '';
    try {
      for await (const part of completionStream) {
        const delta = part.choices[0]?.delta?.content ?? '';
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      }
    } catch (err) {
      logger.error('GPT-4o streaming error', { error: (err as Error).message, sessionId: session._id.toString() });
      res.write(`data: ${JSON.stringify({ error: 'Response interrupted. Please try again.' })}\n\n`);
    }

    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: fullResponse,
      sources: chunks.map((c: RetrievedChunk) => ({
        contentItemId: c.contentItemId as unknown as ChatMessage['sources'][number]['contentItemId'],
        excerpt: c.chunkText.slice(0, 280),
        relevanceScore: c.relevanceScore,
        timestamp: c.startTime,
        pageNumber: c.pageNumber,
      })),
      tokenCount: Math.ceil(fullResponse.length / 4),
      createdAt: new Date(),
    };
    session.messages.push(assistantMessage);
    session.totalTokens += (userMessage.tokenCount ?? Math.ceil(input.message.length / 4)) + (assistantMessage.tokenCount ?? 0);
    await session.save();

    res.write(
      `data: ${JSON.stringify({
        done: true,
        sessionId: session._id.toString(),
        message: { id: assistantMessage.id, role: 'assistant', content: fullResponse, sources: assistantMessage.sources },
      })}\n\n`
    );
    res.end();
  },
};
