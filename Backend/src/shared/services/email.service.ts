import sgMail from '@sendgrid/mail';
import { env } from '@config/index';
import { logger } from '@config/logger';

sgMail.setApiKey(env.SENDGRID_API_KEY);

interface SendTemplateEmailInput {
  to: string;
  templateId: string | undefined;
  dynamicTemplateData: Record<string, unknown>;
  /** Plain-text fallback subject/body, used if no template id is configured (e.g., local dev). */
  fallbackSubject: string;
  fallbackText: string;
}

/**
 * Sends a transactional email via a SendGrid dynamic template.
 * Failures are logged but not re-thrown by default — most callers (e.g.,
 * registration) should not fail the parent operation just because an email
 * didn't send; the caller can pass `throwOnError: true` for flows where
 * email delivery is essential (e.g., password reset).
 */
export const emailService = {
  async send(input: SendTemplateEmailInput, throwOnError = false): Promise<void> {
    try {
      if (!input.templateId) {
        logger.warn('No SendGrid template configured; sending plain-text fallback', { to: input.to });
        await sgMail.send({
          to: input.to,
          from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
          subject: input.fallbackSubject,
          text: input.fallbackText,
        });
        return;
      }

      await sgMail.send({
        to: input.to,
        from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
        templateId: input.templateId,
        dynamicTemplateData: input.dynamicTemplateData,
      });
    } catch (err) {
      logger.error('Failed to send email', { to: input.to, error: (err as Error).message });
      if (throwOnError) throw err;
    }
  },

  async sendVerificationEmail(to: string, name: string, verificationUrl: string): Promise<void> {
    await this.send({
      to,
      templateId: env.SENDGRID_TEMPLATE_EMAIL_VERIFICATION,
      dynamicTemplateData: { name, verificationUrl },
      fallbackSubject: 'Verify your LearnWave account',
      fallbackText: `Hi ${name}, please verify your email: ${verificationUrl}`,
    });
  },

  async sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void> {
    await this.send(
      {
        to,
        templateId: env.SENDGRID_TEMPLATE_PASSWORD_RESET,
        dynamicTemplateData: { name, resetUrl },
        fallbackSubject: 'Reset your LearnWave password',
        fallbackText: `Hi ${name}, reset your password here: ${resetUrl}`,
      },
      true // password reset emails must succeed or the caller should know
    );
  },

  async sendProjectInviteEmail(to: string, inviterName: string, projectName: string, inviteUrl: string): Promise<void> {
    await this.send({
      to,
      templateId: env.SENDGRID_TEMPLATE_PROJECT_INVITE,
      dynamicTemplateData: { inviterName, projectName, inviteUrl },
      fallbackSubject: `${inviterName} invited you to ${projectName} on LearnWave`,
      fallbackText: `${inviterName} invited you to collaborate on "${projectName}". Join here: ${inviteUrl}`,
    });
  },

  async sendSrsReminderEmail(to: string, name: string, dueCount: number, appUrl: string): Promise<void> {
    await this.send({
      to,
      templateId: env.SENDGRID_TEMPLATE_SRS_REMINDER,
      dynamicTemplateData: { name, dueCount, appUrl },
      fallbackSubject: `${dueCount} flashcards due for review!`,
      fallbackText: `Hi ${name}, you have ${dueCount} flashcards due for review today. Study now: ${appUrl}`,
    });
  },

  async sendShareNotificationEmail(to: string, sharerName: string, resourceTitle: string, shareUrl: string): Promise<void> {
    await this.send({
      to,
      templateId: env.SENDGRID_TEMPLATE_SHARE_NOTIFICATION,
      dynamicTemplateData: { sharerName, resourceTitle, shareUrl },
      fallbackSubject: `${sharerName} shared "${resourceTitle}" with you`,
      fallbackText: `${sharerName} shared "${resourceTitle}" with you on LearnWave: ${shareUrl}`,
    });
  },
};
