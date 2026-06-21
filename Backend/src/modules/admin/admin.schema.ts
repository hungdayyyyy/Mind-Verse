import { z } from 'zod';

const objectIdRegex = /^[a-f\d]{24}$/i;

export const listUsersQuerySchema = z.object({
  query: z.object({
    search: z.string().max(200).optional(),
    plan: z.enum(['free', 'pro', 'premium']).optional(),
    systemRole: z.enum(['user', 'support', 'admin', 'super_admin']).optional(),
    accountStatus: z.enum(['active', 'suspended', 'banned']).optional(),
    cursor: z.string().regex(objectIdRegex).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const changePlanSchema = z.object({
  body: z.object({
    plan: z.enum(['free', 'pro', 'premium']),
    reason: z.string().max(500).optional(),
  }),
});

export const changeSystemRoleSchema = z.object({
  body: z.object({
    systemRole: z.enum(['user', 'support', 'admin', 'super_admin']),
    reason: z.string().max(500).optional(),
  }),
});

export const suspendUserSchema = z.object({
  body: z.object({
    reason: z.string().min(1).max(500),
    durationDays: z.number().int().positive().optional(), // omit for indefinite suspension
  }),
});

export const banUserSchema = z.object({
  body: z.object({
    reason: z.string().min(1).max(500),
  }),
});

export const adminAuditLogQuerySchema = z.object({
  query: z.object({
    targetUserId: z.string().regex(objectIdRegex).optional(),
    actorId: z.string().regex(objectIdRegex).optional(),
    action: z.string().optional(),
    cursor: z.string().regex(objectIdRegex).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>['query'];
export type ChangePlanBody = z.infer<typeof changePlanSchema>['body'];
export type ChangeSystemRoleBody = z.infer<typeof changeSystemRoleSchema>['body'];
export type SuspendUserBody = z.infer<typeof suspendUserSchema>['body'];
export type BanUserBody = z.infer<typeof banUserSchema>['body'];
