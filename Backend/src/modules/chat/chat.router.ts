import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import { aiRateLimit } from '@middleware/rateLimit.middleware';
import { sendMessageSchema, renameSessionSchema } from './chat.schema';
import { sendMessage, listSessions, getSession, renameSession, deleteSession } from './chat.controller';

const router = Router();

router.use(authenticate);

router.post('/message', aiRateLimit, validate(sendMessageSchema), sendMessage);
router.get('/sessions', listSessions);
router.get('/sessions/:id', getSession);
router.patch('/sessions/:id', validate(renameSessionSchema), renameSession);
router.delete('/sessions/:id', deleteSession);

export { router as chatRouter };
