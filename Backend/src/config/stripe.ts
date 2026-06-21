import Stripe from 'stripe';
import { env } from './index';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
  typescript: true,
});

export const stripeConfig = {
  webhookSecret: env.STRIPE_WEBHOOK_SECRET,
  priceIds: {
    proMonthly: env.STRIPE_PRICE_ID_PRO_MONTHLY,
    proYearly: env.STRIPE_PRICE_ID_PRO_YEARLY,
  },
} as const;
