import { Worker, Job } from 'bullmq';
import { redisConnection } from '@config/redis';
import { env } from '@config/index';
import { logger } from '@config/logger';
import { openai, openaiModels } from '@config/openai';
import { QUEUE_NAMES, JOB_NAMES } from '@shared/constants/queues';
import { SOCKET_EVENTS } from '@shared/constants/events';
import { emitToUser } from '@config/socket';
import { ContentItem } from '@modules/content/content.model';
import { Notes } from '@modules/notes/notes.model';
import { quizService } from '@modules/quizzes/quiz.service';
import { QuizQuestion } from '@modules/quizzes/quiz.model';
import { GenerateQuizJobData } from './queue';

const SYSTEM_PROMPT = `You are a quiz generation expert. Given study notes, generate exactly:
- 5 multiple-choice questions (4 options each, exactly one correct)
- 3 true/false questions
- 2 short-answer questions

Each question needs: the question text, correct answer, a brief explanation, a difficulty (easy/medium/hard), and 1-3 topic tags
that describe the specific concept being tested (used later for weak-area analysis — be specific, e.g. "backpropagation" not "neural networks").

Return ONLY a JSON object of shape:
{ "questions": [{
  "type": "mcq" | "truefalse" | "short",
  "question": "string",
  "options": [{ "text": "string" }],   // only for type "mcq", exactly 4 options
  "correctAnswer": "string",           // for mcq: the exact text of the correct option; for truefalse: "true" or "false"; for short: the expected answer
  "explanation": "string",
  "difficulty": "easy" | "medium" | "hard",
  "tags": ["string"]
}] }`;

/**
 * Processes GenerateQuizJob: reads structured notes, prompts GPT-4o for a
 * 5 MCQ + 3 true/false + 2 short-answer mix (UC-007 Stage 2c), and saves
 * the resulting Quiz document. Falls back to a reduced question count for
 * very short content rather than forcing the model to invent filler
 * questions not grounded in the material.
 */
export const quizWorker = new Worker<GenerateQuizJobData>(
  QUEUE_NAMES.CONTENT_PROCESSING,
  async (job: Job<GenerateQuizJobData>) => {
    if (job.name !== JOB_NAMES.GENERATE_QUIZ) return;

    const { contentItemId, userId } = job.data;
    await ContentItem.updateOne({ _id: contentItemId }, { 'processingJobs.quiz': 'processing' });

    try {
      const [notes, contentItem] = await Promise.all([
        Notes.findOne({ contentItemId }),
        ContentItem.findById(contentItemId),
      ]);

      if (!notes || !contentItem) {
        throw new Error('Notes or content item not found; cannot generate quiz');
      }

      const notesText = notes.blocks.map((b) => b.content).join('\n');
      const questions = await generateQuizQuestions(notesText);

      await quizService.createFromAI(contentItemId, userId, `${contentItem.title} Quiz`, questions);
      await ContentItem.updateOne({ _id: contentItemId }, { 'processingJobs.quiz': 'completed' });

      emitToUser(userId, SOCKET_EVENTS.PROCESSING_UPDATE, { contentId: contentItemId, stage: 'quiz', status: 'completed' });
      logger.info('Quiz generated', { contentItemId, questionCount: questions.length });

      const { maybeFinalizeProcessingStatus } = await import('./embeddings.worker');
      await maybeFinalizeProcessingStatus(contentItemId, userId);
    } catch (err) {
      await ContentItem.updateOne({ _id: contentItemId }, { 'processingJobs.quiz': 'failed' });
      emitToUser(userId, SOCKET_EVENTS.PROCESSING_ERROR, { contentId: contentItemId, stage: 'quiz' });
      logger.error('Quiz generation failed', { contentItemId, error: (err as Error).message });
      throw err;
    }
  },
  { connection: redisConnection, concurrency: env.QUEUE_CONCURRENCY }
);

quizWorker.on('failed', async (job, err) => {
  logger.error('GenerateQuizJob failed after all retries', { jobId: job?.id, error: err.message });
  if (job?.data) {
    const { maybeFinalizeProcessingStatus } = await import('./embeddings.worker');
    await maybeFinalizeProcessingStatus(job.data.contentItemId, job.data.userId);
  }
});

interface RawQuestion {
  type: string;
  question: string;
  options?: Array<{ text: string }>;
  correctAnswer: string;
  explanation?: string;
  difficulty?: string;
  tags?: string[];
}

async function generateQuizQuestions(notesText: string): Promise<Array<Omit<QuizQuestion, 'id'>>> {
  const completion = await openai.chat.completions.create({
    model: openaiModels.chat,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: notesText.slice(0, 20000) },
    ],
    temperature: 0.4,
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '{"questions":[]}';

  let parsed: { questions?: RawQuestion[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    logger.warn('Failed to parse GPT-4o quiz response as JSON');
    return [];
  }

  const validTypes = ['mcq', 'truefalse', 'short'];
  const validDifficulties = ['easy', 'medium', 'hard'];

  return (parsed.questions ?? [])
    .filter((q) => q.question && q.correctAnswer && validTypes.includes(q.type))
    .map((q) => ({
      type: q.type as 'mcq' | 'truefalse' | 'short',
      question: q.question,
      options: (q.options ?? []).map((o, i) => ({ id: `opt-${i}`, text: o.text })),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ?? '',
      difficulty: (validDifficulties.includes(q.difficulty ?? '') ? q.difficulty : 'medium') as 'easy' | 'medium' | 'hard',
      tags: q.tags ?? [],
      points: 1,
    }));
}
