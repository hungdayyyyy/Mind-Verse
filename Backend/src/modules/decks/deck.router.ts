import { Request, Response, Router } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { authenticate, authenticateOptional } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import { checkProjectAccess } from '@middleware/rbac.middleware';
import { deckService } from './deck.service';
import {
  createDeckSchema,
  updateDeckSchema,
  shareDeckSchema,
  forkDeckSchema,
  listDecksQuerySchema,
  CreateDeckBody,
  UpdateDeckBody,
  ShareDeckBody,
  ForkDeckBody,
} from './deck.schema';

export const listDecks = asyncHandler(async (req: Request, res: Response) => {
  const { projectId, contentId } = req.query as { projectId?: string; contentId?: string };
  const decks = await deckService.listByFilter(projectId, contentId);
  res.json({ data: decks });
});

export const createDeck = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as CreateDeckBody;
  const deck = await deckService.createDeck(req.user!.id, body);
  res.status(201).json({ data: deck });
});

export const getDeck = asyncHandler(async (req: Request, res: Response) => {
  const deck = await deckService.getById(req.params.id);
  res.json({ data: deck });
});

export const updateDeck = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as UpdateDeckBody;
  const deck = await deckService.updateDeck(req.params.id, body);
  res.json({ data: deck });
});

export const deleteDeck = asyncHandler(async (req: Request, res: Response) => {
  await deckService.deleteDeck(req.params.id);
  res.json({ data: { success: true } });
});

export const shareDeck = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as ShareDeckBody;
  const result = await deckService.createShareLink(req.params.id, req.user!.id, body);
  res.status(201).json({ data: result });
});

export const forkDeck = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as ForkDeckBody;
  const deck = await deckService.forkDeck(req.params.id, req.user!.id, body.targetProjectId);
  res.status(201).json({ data: deck });
});

const router = Router();

async function resolveProjectIdFromDeckParam(req: Request): Promise<string> {
  const deck = await deckService.getById(req.params.id);
  return deck.projectId.toString();
}

router.get('/', authenticate, validate(listDecksQuerySchema), listDecks);
router.post('/', authenticate, validate(createDeckSchema), checkProjectAccess('editor', async (req) => req.body.projectId as string), createDeck);
router.get('/:id', authenticateOptional, getDeck);
router.patch('/:id', authenticate, validate(updateDeckSchema), checkProjectAccess('editor', resolveProjectIdFromDeckParam), updateDeck);
router.delete('/:id', authenticate, checkProjectAccess('owner', resolveProjectIdFromDeckParam), deleteDeck);
router.post('/:id/share', authenticate, validate(shareDeckSchema), checkProjectAccess('editor', resolveProjectIdFromDeckParam), shareDeck);
router.post('/:id/fork', authenticate, validate(forkDeckSchema), forkDeck); // any plan may fork; target project ownership implied by user

export { router as deckRouter };
