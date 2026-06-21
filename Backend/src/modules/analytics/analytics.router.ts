import { z } from 'zod';
import { Router, Request, Response } from 'express';
import { authenticate } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { analyticsService } from './analytics.service';

const objectIdRegex = /^[a-f\d]{24}$/i;

const dashboardQuerySchema = z.object({
  query: z.object({
    projectId: z.string().regex(objectIdRegex).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

const weakAreasQuerySchema = z.object({
  query: z.object({
    contentId: z.string().regex(objectIdRegex).optional(),
  }),
});

const heatmapQuerySchema = z.object({
  query: z.object({
    year: z.coerce.number().int().min(2020).max(2100).optional(),
  }),
});

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { projectId } = req.query as { projectId?: string };
  const data = await analyticsService.getDashboard(req.user!.id, projectId);
  res.json({ data });
});

export const getStreak = asyncHandler(async (req: Request, res: Response) => {
  const data = await analyticsService.getStreak(req.user!.id);
  res.json({ data });
});

export const getWeakAreas = asyncHandler(async (req: Request, res: Response) => {
  const { contentId } = req.query as { contentId?: string };
  const data = await analyticsService.getWeakAreas(req.user!.id, contentId);
  res.json({ data });
});

export const getHeatmap = asyncHandler(async (req: Request, res: Response) => {
  const { year } = req.query as { year?: string };
  const data = await analyticsService.getHeatmap(req.user!.id, year ? Number(year) : new Date().getFullYear());
  res.json({ data });
});

const router = Router();
router.use(authenticate);

router.get('/dashboard', validate(dashboardQuerySchema), getDashboard);
router.get('/streak', getStreak);
router.get('/weak-areas', validate(weakAreasQuerySchema), getWeakAreas);
router.get('/heatmap', validate(heatmapQuerySchema), getHeatmap);

export { router as analyticsRouter };
