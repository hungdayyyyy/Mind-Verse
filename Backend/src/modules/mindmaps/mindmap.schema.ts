import { z } from 'zod';

export const mindMapNodeSchema = z.object({
  id: z.string(),
  label: z.string().max(200),
  type: z.enum(['root', 'branch', 'leaf']),
  x: z.number(),
  y: z.number(),
  style: z.object({ backgroundColor: z.string().optional(), fontSize: z.number().optional() }).optional(),
  metadata: z
    .object({ contentTimestamp: z.number().nullable().optional(), pageRef: z.number().nullable().optional() })
    .optional(),
});

export const mindMapEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  type: z.enum(['default', 'straight', 'step']).optional(),
});

export const updateMindMapSchema = z.object({
  body: z.object({
    nodes: z.array(mindMapNodeSchema),
    edges: z.array(mindMapEdgeSchema),
  }),
});

export type UpdateMindMapBody = z.infer<typeof updateMindMapSchema>['body'];
