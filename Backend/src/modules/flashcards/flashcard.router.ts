import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import {
  createFlashcardSchema,
  updateFlashcardSchema,
  reviewFlashcardSchema,
  listFlashcardsQuerySchema,
  dueFlashcardsQuerySchema,
} from './flashcard.schema';
import {
  listFlashcards,
  createFlashcard,
  getFlashcard,
  updateFlashcard,
  deleteFlashcard,
  getDueFlashcards,
  reviewFlashcard,
} from './flashcard.controller';

const router = Router();

router.use(authenticate);

// IMPORTANT: /due must be registered before /:id, or Express will treat "due" as an :id param.
router.get('/due', validate(dueFlashcardsQuerySchema), getDueFlashcards);

router.get('/', validate(listFlashcardsQuerySchema), listFlashcards);
router.post('/', validate(createFlashcardSchema), createFlashcard);
router.get('/:id', getFlashcard);
router.patch('/:id', validate(updateFlashcardSchema), updateFlashcard);
router.delete('/:id', deleteFlashcard);
router.post('/:id/review', validate(reviewFlashcardSchema), reviewFlashcard);

export { router as flashcardRouter };
