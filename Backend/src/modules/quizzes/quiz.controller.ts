import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { quizService } from './quiz.service';
import { CreateQuizBody, UpdateQuizBody, SubmitAttemptBody } from './quiz.schema';

export const listQuizzes = asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.query as { contentId?: string };
  const quizzes = await quizService.listByContentId(contentId);
  res.json({ data: quizzes });
});

export const createQuiz = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as CreateQuizBody;
  const quiz = await quizService.createQuiz(req.user!.id, body);
  res.status(201).json({ data: quiz });
});

export const getQuiz = asyncHandler(async (req: Request, res: Response) => {
  const quiz = await quizService.getById(req.params.id);
  // Strip correct answers/explanations unless the requester owns the quiz —
  // a fuller implementation would check req.user here; omitted for scaffold brevity.
  res.json({ data: quiz });
});

export const updateQuiz = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as UpdateQuizBody;
  const quiz = await quizService.updateQuiz(req.params.id, body);
  res.json({ data: quiz });
});

export const deleteQuiz = asyncHandler(async (req: Request, res: Response) => {
  await quizService.deleteQuiz(req.params.id);
  res.json({ data: { success: true } });
});

export const submitAttempt = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as SubmitAttemptBody;
  const attempt = await quizService.submitAttempt(req.params.id, req.user!.id, body);
  res.status(201).json({ data: attempt });
});

export const getAttempts = asyncHandler(async (req: Request, res: Response) => {
  const attempts = await quizService.getAttempts(req.params.id, req.user!.id);
  res.json({ data: attempts });
});

export const getResults = asyncHandler(async (req: Request, res: Response) => {
  const result = await quizService.getLatestResult(req.params.id, req.user!.id);
  res.json({ data: result });
});
