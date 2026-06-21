import { Router } from 'express';
import { authenticate } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import { updateUserSchema } from './user.schema';
import { getMe, updateMe, getMyStats, deleteMe } from './user.controller';

const router = Router();

router.use(authenticate);

router.get('/me', getMe);
router.patch('/me', validate(updateUserSchema), updateMe);
router.get('/me/stats', getMyStats);
router.delete('/me', deleteMe);

export { router as userRouter };
