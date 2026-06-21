import { stripe, stripeConfig } from '@config/stripe';
import { env } from '@config/index';
import { User } from '@modules/users/user.model';
import { NotFoundError, ValidationError } from '@shared/errors';
import { logger } from '@config/logger';
import Stripe from 'stripe';

export const billingService = {
  /**
   * Creates a Stripe Checkout session for a Free user upgrading to Pro.
   * Creates a Stripe customer first if the user doesn't have one yet.
   */
  async createCheckoutSession(userId: string, priceId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User');

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId } });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${env.FRONTEND_URL}/settings/billing?checkout=success`,
      cancel_url: `${env.FRONTEND_URL}/settings/billing?checkout=canceled`,
      metadata: { userId },
    });

    if (!session.url) throw new ValidationError({ formErrors: ['Failed to create checkout session.'], fieldErrors: {} });
    return session.url;
  },

  /** Generates a Stripe Customer Portal link for managing payment methods, invoices, and cancellation. */
  async createPortalSession(userId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user?.stripeCustomerId) {
      throw new ValidationError({ formErrors: ['No active subscription found for this account.'], fieldErrors: {} });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${env.FRONTEND_URL}/settings/billing`,
    });

    return session.url;
  },

  /**
   * Verifies and processes a Stripe webhook event. Keeps `User.plan` and
   * `subscriptionStatus` in sync with the source of truth (Stripe), so the
   * app never has to poll Stripe to know a user's current entitlement.
   */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, stripeConfig.webhookSecret);
    } catch (err) {
      logger.error('Stripe webhook signature verification failed', { error: (err as Error).message });
      throw new ValidationError({ formErrors: ['Invalid webhook signature.'], fieldErrors: {} });
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        logger.debug('Unhandled Stripe webhook event type', { type: event.type });
    }
  },

  async syncSubscription(subscription: Stripe.Subscription): Promise<void> {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const user = await User.findOne({ stripeCustomerId: customerId });
    if (!user) {
      logger.warn('Received Stripe subscription event for unknown customer', { customerId });
      return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    const isPro = priceId === stripeConfig.priceIds.proMonthly || priceId === stripeConfig.priceIds.proYearly;

    user.stripeSubscriptionId = subscription.id;
    user.subscriptionStatus = subscription.status as typeof user.subscriptionStatus;
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      user.plan = isPro ? 'pro' : user.plan; // premium plan changes are admin-driven, not Stripe price-driven, in this scaffold
    }
    await user.save();

    logger.info('Subscription synced', { userId: user._id.toString(), status: subscription.status, plan: user.plan });
  },

  /** Downgrades the user to Free once their subscription is fully canceled (end of billing period). */
  async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const user = await User.findOne({ stripeCustomerId: customerId });
    if (!user) return;

    user.plan = 'free';
    user.subscriptionStatus = 'canceled';
    await user.save();

    logger.info('Subscription canceled, user downgraded to Free', { userId: user._id.toString() });
  },

  async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) return;

    const user = await User.findOne({ stripeCustomerId: customerId });
    if (!user) return;

    user.subscriptionStatus = 'past_due';
    await user.save();

    const { notificationService } = await import('@modules/notifications/notification.service');
    await notificationService.create(
      user._id.toString(),
      'processing_failed', // reusing closest existing type; a dedicated 'billing_issue' type would be added in a fuller build
      'Payment failed',
      'We were unable to process your payment. Please update your payment method to keep your Pro features.',
      { invoiceId: invoice.id }
    );

    logger.warn('Payment failed for user', { userId: user._id.toString(), invoiceId: invoice.id });
  },
};
