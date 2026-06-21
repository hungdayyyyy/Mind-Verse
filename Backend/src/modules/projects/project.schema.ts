import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    icon: z.string().max(10).optional(),
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    icon: z.string().max(10).optional(),
  }),
});

export const addMemberSchema = z.object({
  body: z.object({
    email: z.string().email(),
    role: z.enum(['editor', 'viewer']),
  }),
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(['editor', 'viewer']),
  }),
});

export const shareProjectSchema = z.object({
  body: z.object({
    permissions: z.enum(['view', 'fork']),
    expiresAt: z.string().datetime().nullable().optional(),
  }),
});

export const listProjectsQuerySchema = z.object({
  query: z.object({
    cursor: z.string().regex(objectIdRegex).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export type CreateProjectBody = z.infer<typeof createProjectSchema>['body'];
export type UpdateProjectBody = z.infer<typeof updateProjectSchema>['body'];
export type AddMemberBody = z.infer<typeof addMemberSchema>['body'];
export type UpdateMemberRoleBody = z.infer<typeof updateMemberRoleSchema>['body'];
export type ShareProjectBody = z.infer<typeof shareProjectSchema>['body'];
