import { Request, Response } from 'express';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { studyRoomService } from './studyRoom.service';
import {
  CreateStudyRoomBody,
  UpdateStudyRoomBody,
  JoinStudyRoomBody,
  StartQuizBody,
} from './studyRoom.schema';

export const listStudyRooms = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.query as { projectId?: string };
  const rooms = await studyRoomService.listByProject(projectId);
  res.json({ data: rooms });
});

export const createStudyRoom = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as CreateStudyRoomBody;
  const room = await studyRoomService.createRoom(req.user!.id, req.user!.name, body);
  res.status(201).json({ data: room });
});

export const getStudyRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await studyRoomService.getById(req.params.id);
  res.json({ data: room });
});

export const updateStudyRoom = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as UpdateStudyRoomBody;
  const room = await studyRoomService.updateRoom(req.params.id, req.user!.id, body);
  res.json({ data: room });
});

export const deleteStudyRoom = asyncHandler(async (req: Request, res: Response) => {
  await studyRoomService.deleteRoom(req.params.id, req.user!.id);
  res.json({ data: { success: true } });
});

export const joinStudyRoom = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as JoinStudyRoomBody;
  const room = await studyRoomService.joinRoom(body.inviteCode, req.user!.id, req.user!.name);
  res.json({ data: room });
});

export const leaveStudyRoom = asyncHandler(async (req: Request, res: Response) => {
  const room = await studyRoomService.leaveRoom(req.params.id, req.user!.id);
  res.json({ data: room });
});

export const startQuizInRoom = asyncHandler(async (req: Request, res: Response) => {
  const body = req.validated!.body as StartQuizBody;
  await studyRoomService.startQuiz(req.params.id, req.user!.id, body.quizId);
  res.json({ data: { started: true } });
});

export const kickParticipant = asyncHandler(async (req: Request, res: Response) => {
  await studyRoomService.kickParticipant(req.params.id, req.user!.id, req.params.userId);
  res.json({ data: { success: true } });
});
