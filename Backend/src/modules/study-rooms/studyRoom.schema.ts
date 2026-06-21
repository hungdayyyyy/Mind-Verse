import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;

export const createStudyRoomSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    projectId: z.string().regex(objectIdRegex),
    maxParticipants: z.number().int().min(2).max(20).optional(),
  }),
});

export const updateStudyRoomSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    maxParticipants: z.number().int().min(2).max(20).optional(),
  }),
});

export const joinStudyRoomSchema = z.object({
  body: z.object({
    inviteCode: z.string().length(6),
  }),
});

export const startQuizSchema = z.object({
  body: z.object({
    quizId: z.string().regex(objectIdRegex),
    timePerQuestion: z.number().int().min(5).max(120),
  }),
});

export const listStudyRoomsQuerySchema = z.object({
  query: z.object({
    projectId: z.string().regex(objectIdRegex).optional(),
  }),
});

export type CreateStudyRoomBody = z.infer<typeof createStudyRoomSchema>['body'];
export type UpdateStudyRoomBody = z.infer<typeof updateStudyRoomSchema>['body'];
export type JoinStudyRoomBody = z.infer<typeof joinStudyRoomSchema>['body'];
export type StartQuizBody = z.infer<typeof startQuizSchema>['body'];
