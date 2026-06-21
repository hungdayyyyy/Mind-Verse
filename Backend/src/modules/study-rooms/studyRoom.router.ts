import { Router } from 'express';
import { authenticate, requirePlan } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import {
  createStudyRoomSchema,
  updateStudyRoomSchema,
  joinStudyRoomSchema,
  startQuizSchema,
  listStudyRoomsQuerySchema,
} from './studyRoom.schema';
import {
  listStudyRooms,
  createStudyRoom,
  getStudyRoom,
  updateStudyRoom,
  deleteStudyRoom,
  joinStudyRoom,
  leaveStudyRoom,
  startQuizInRoom,
  kickParticipant,
} from './studyRoom.controller';

const router = Router();

router.use(authenticate);

router.get('/', validate(listStudyRoomsQuerySchema), listStudyRooms);
// Hosting a Study Room is a Pro feature (FR-064); joining/participating is open to any plan.
router.post('/', requirePlan('pro'), validate(createStudyRoomSchema), createStudyRoom);
router.get('/:id', getStudyRoom);
router.patch('/:id', requirePlan('pro'), validate(updateStudyRoomSchema), updateStudyRoom);
router.delete('/:id', requirePlan('pro'), deleteStudyRoom);
router.post('/join', validate(joinStudyRoomSchema), joinStudyRoom);
router.post('/:id/leave', leaveStudyRoom);
router.post('/:id/start-quiz', requirePlan('pro'), validate(startQuizSchema), startQuizInRoom);
router.post('/:id/kick/:userId', requirePlan('pro'), kickParticipant);

export { router as studyRoomRouter };
