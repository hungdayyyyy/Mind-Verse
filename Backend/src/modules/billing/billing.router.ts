import { z } from 'zod';
import { Router, Request, Response } from 'express';
import { authenticate } from '@middleware/auth.middleware';
import { validate } from '@middleware/validate.middleware';
import { asyncHandler } from '@shared/utils/asyncHandler';
import { billingService } from './billing.service';

const checkoutSchema = z.object({
  body: z.object({ priceId: z.string().min(1) }),
});

export const createCheckout = asyncHandler(async (req: Request, res: Response) => {
  const { priceId } = req.validated!.body as { priceId: string };
  const checkoutUrl = await billingService.createCheckoutSession(req.user!.id, priceId);
  res.json({ data: { checkoutUrl } });
});

export const createPortalSession = asyncHandler(async (req: Request, res: Response) => {
  const portalUrl = await billingService.createPortalSession(req.user!.id);
  res.json({ data: { portalUrl } });
});

/**
 * Stripe webhook receiver. Requires the raw request body (not JSON-parsed)
 * for signature verification — see app.ts, where this route is mounted
 * with `express.raw()` BEFORE the global `express.json()` middleware.
 */
export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  await billingService.handleWebhook(req.body as Buffer, signature);
  res.json({ received: true });
});

const router = Router();

router.post('/checkout', authenticate, validate(checkoutSchema), createCheckout);
router.post('/portal', authenticate, createPortalSession);
// Note: webhook route is NOT registered here — it's mounted separately in
// app.ts ahead of the JSON body parser, since Stripe requires the raw body.

export { router as billingRouter };
