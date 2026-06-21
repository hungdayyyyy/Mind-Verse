import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;

export const createQuizSchema = z.object({
  body: z.object({
    contentItemId: z.string().regex(objectIdRegex),
    title: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    questions: z.array(
      z.object({
        type: z.enum(['mcq', 'truefalse', 'short']),
        question: z.string().min(1).max(1000),
        options: z.array(z.object({ text: z.string() })).optional(),
        correctAnswer: z.string().min(1),
        explanation: z.string().max(1000).optional(),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
        tags: z.array(z.string()).optional(),
      })
    ),
  }),
});

export const updateQuizSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(500).optional(),
    settings: z
      .object({
        timeLimit: z.number().nullable().optional(),
        timeLimitPerQuestion: z.number().nullable().optional(),
        shuffleQuestions: z.boolean().optional(),
        shuffleOptions: z.boolean().optional(),
        showExplanations: z.boolean().optional(),
        passingScore: z.number().min(0).max(100).optional(),
      })
      .optional(),
  }),
});

export const submitAttemptSchema = z.object({
  body: z.object({
    answers: z.array(
      z.object({
        questionId: z.string(),
        selectedAnswer: z.string().nullable(),
        timeTaken: z.number().min(0),
      })
    ),
    timeTaken: z.number().min(0),
    studyRoomId: z.string().regex(objectIdRegex).optional(),
  }),
});

export const listQuizzesQuerySchema = z.object({
  query: z.object({
    contentId: z.string().regex(objectIdRegex).optional(),
  }),
});

export type CreateQuizBody = z.infer<typeof createQuizSchema>['body'];
export type UpdateQuizBody = z.infer<typeof updateQuizSchema>['body'];
export type SubmitAttemptBody = z.infer<typeof submitAttemptSchema>['body'];
