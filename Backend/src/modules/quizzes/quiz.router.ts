import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import {
  createQuizSchema,
  updateQuizSchema,
  submitAttemptSchema,
  listQuizzesQuerySchema,
} from './quiz.schema';
import {
  listQuizzes,
  createQuiz,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  submitAttempt,
  getAttempts,
  getResults,
} from './quiz.controller';

const router = Router();

router.use(authenticate);

router.get('/', validate(listQuizzesQuerySchema), listQuizzes);
router.post('/', validate(createQuizSchema), createQuiz);
router.get('/:id', getQuiz);
router.patch('/:id', validate(updateQuizSchema), updateQuiz);
router.delete('/:id', deleteQuiz);
router.post('/:id/attempt', validate(submitAttemptSchema), submitAttempt);
router.get('/:id/attempts', getAttempts);
router.get('/:id/results', getResults);

export { router as quizRouter };
