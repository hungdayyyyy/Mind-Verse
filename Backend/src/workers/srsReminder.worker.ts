import { Worker, Job, Queue } from 'bullmq';
import { redisConnection } from '@config/redis';
import { logger } from '@config/logger';
import { QUEUE_NAMES, JOB_NAMES } from '@shared/constants/queues';
import { User } from '@modules/users/user.model';
import { Flashcard } from '@modules/flashcards/flashcard.model';
import { notificationService } from '@modules/notifications/notification.service';
import { emailService } from '@shared/services/email.service';
import { env } from '@config/index';

/**
 * UC-020: Daily sweep that finds users with `srsReminders` enabled who have
 * flashcards due today and haven't studied yet, creating an in-app
 * notification and (if enabled) sending a digest email. Scheduled via
 * BullMQ's repeatable jobs (see scheduleSrsReminderSweep below), not a
 * separate OS-level cron — keeps scheduling colocated with the rest of the
 * job infrastructure and visible in the same monitoring dashboard.
 */
export const srsReminderWorker = new Worker(
  QUEUE_NAMES.NOTIFICATIONS,
  async (job: Job) => {
    if (job.name !== JOB_NAMES.SRS_REMINDER_SWEEP) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const candidates = await User.find({
      'settings.notifications.srsReminders': true,
      deletedAt: null,
      accountStatus: 'active',
      $or: [{ 'stats.lastStudyDate': { $lt: today } }, { 'stats.lastStudyDate': null }],
    }).select('_id name email settings.timezone');

    let notified = 0;
    for (const user of candidates) {
      const dueCount = await Flashcard.countDocuments({ ownerId: user._id, 'srsData.dueDate': { $lte: new Date() } });
      if (dueCount === 0) continue;

      await notificationService.create(
        user._id.toString(),
        'srs_reminder',
        `${dueCount} flashcard${dueCount === 1 ? '' : 's'} due for review!`,
        'Keep your streak going! Review your flashcards today.',
        { dueCount }
      );

      const freshUser = await User.findById(user._id).select('settings.notifications.emailNotifications email name');
      if (freshUser?.settings.notifications.emailNotifications) {
        await emailService.sendSrsReminderEmail(freshUser.email, freshUser.name, dueCount, env.FRONTEND_URL);
      }

      notified += 1;
    }

    logger.info('SRS reminder sweep completed', { candidateCount: candidates.length, notified });
  },
  { connection: redisConnection, concurrency: 1 }
);

srsReminderWorker.on('failed', (job, err) => {
  logger.error('SrsReminderSweepJob failed', { jobId: job?.id, error: err.message });
});

/**
 * Registers the recurring SRS sweep as a BullMQ repeatable job, running
 * daily at 08:00 UTC. Call once at worker-server startup (see
 * worker-server.ts). Per-user local-timezone delivery (FR-075 mentions "8am
 * in the user's timezone") would require either per-timezone job instances
 * or a finer-grained hourly sweep that filters by timezone offset — noted
 * here as a refinement for a full production rollout.
 */
export async function scheduleSrsReminderSweep(): Promise<void> {
  const queue = new Queue(QUEUE_NAMES.NOTIFICATIONS, { connection: redisConnection });
  await queue.add(
    JOB_NAMES.SRS_REMINDER_SWEEP,
    {},
    {
      repeat: { pattern: '0 8 * * *' }, // 08:00 UTC daily
      jobId: 'srs-reminder-sweep-daily', // stable id prevents duplicate schedules on restart
    }
  );
  logger.info('SRS reminder sweep scheduled (daily at 08:00 UTC)');
}
