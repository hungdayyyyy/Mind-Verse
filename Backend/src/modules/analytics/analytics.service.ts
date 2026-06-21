import { StudySession } from './studySession.model';
import { Flashcard } from '@modules/flashcards/flashcard.model';
import { QuizAttempt } from '@modules/quizzes/quizAttempt.model';
import { ContentItem } from '@modules/content/content.model';
import { User } from '@modules/users/user.model';
import { logger } from '@config/logger';

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const analyticsService = {
  /**
   * UC-018: aggregates the full analytics dashboard payload — overview
   * cards, mastery breakdown, weekly study time, and due-this-week forecast.
   */
  async getDashboard(userId: string, projectId?: string): Promise<{
    streak: number;
    longestStreak: number;
    totalStudyTime: number;
    contentProcessed: number;
    averageQuizScore: number | null;
    masteryByContent: Array<{ contentItemId: string; title: string; masteryScore: number }>;
    weeklyStudyTime: Array<{ week: string; minutes: number }>;
    dueThisWeek: Array<{ date: string; count: number }>;
  }> {
    const user = await User.findById(userId).select('stats');
    const contentFilter: Record<string, unknown> = { ownerId: userId, deletedAt: null, processingStatus: 'completed' };
    if (projectId) contentFilter.projectId = projectId;

    const [contentProcessed, attempts, masteryContent, weeklyTime, dueThisWeek] = await Promise.all([
      ContentItem.countDocuments(contentFilter),
      QuizAttempt.find({ userId }).select('score'),
      ContentItem.find(contentFilter).select('title masteryScore').limit(20).sort({ masteryScore: 1 }),
      this.getWeeklyStudyTime(userId, 4),
      this.getDueForecast(userId, 7),
    ]);

    const averageQuizScore = attempts.length > 0 ? Math.round((attempts.reduce((s, a) => s + a.score, 0) / attempts.length) * 10) / 10 : null;

    return {
      streak: user?.stats.streak ?? 0,
      longestStreak: user?.stats.longestStreak ?? 0,
      totalStudyTime: user?.stats.totalStudyTime ?? 0,
      contentProcessed,
      averageQuizScore,
      masteryByContent: masteryContent.map((c) => ({
        contentItemId: c._id.toString(),
        title: c.title,
        masteryScore: c.masteryScore,
      })),
      weeklyStudyTime: weeklyTime,
      dueThisWeek,
    };
  },

  async getStreak(userId: string): Promise<{ current: number; longest: number; lastStudyDate: string | null }> {
    const user = await User.findById(userId).select('stats');
    return {
      current: user?.stats.streak ?? 0,
      longest: user?.stats.longestStreak ?? 0,
      lastStudyDate: user?.stats.lastStudyDate ? formatDate(user.stats.lastStudyDate) : null,
    };
  },

  /**
   * FR-051/052: identifies weak topic tags by aggregating quiz_attempts'
   * precomputed weakAreas across all (or one content item's) attempts,
   * surfacing tags where the cumulative incorrect rate is high.
   */
  async getWeakAreas(userId: string, contentId?: string): Promise<Array<{ tag: string; incorrectRate: number; totalQuestions: number }>> {
    const filter: Record<string, unknown> = { userId };
    if (contentId) filter.contentItemId = contentId;

    const attempts = await QuizAttempt.find(filter).select('weakAreas');
    const tagTotals = new Map<string, { incorrect: number; total: number }>();

    for (const attempt of attempts) {
      for (const area of attempt.weakAreas) {
        const stats = tagTotals.get(area.tag) ?? { incorrect: 0, total: 0 };
        stats.incorrect += area.incorrectCount;
        stats.total += area.totalCount;
        tagTotals.set(area.tag, stats);
      }
    }

    return Array.from(tagTotals.entries())
      .map(([tag, stats]) => ({
        tag,
        incorrectRate: stats.total > 0 ? Math.round((stats.incorrect / stats.total) * 100) / 100 : 0,
        totalQuestions: stats.total,
      }))
      .filter((a) => a.incorrectRate >= 0.4) // surface tags with <60% correct rate (FR-051)
      .sort((a, b) => b.incorrectRate - a.incorrectRate);
  },

  /** GitHub-style activity heatmap: study minutes per day for a given year. */
  async getHeatmap(userId: string, year: number): Promise<Array<{ date: string; minutes: number }>> {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;

    const sessions = await StudySession.aggregate<{ _id: string; totalSeconds: number }>([
      { $match: { userId: userId, date: { $gte: start, $lte: end } } },
      { $group: { _id: '$date', totalSeconds: { $sum: '$durationSeconds' } } },
    ]);

    return sessions.map((s) => ({ date: s._id, minutes: Math.round(s.totalSeconds / 60) }));
  },

  /** FR-044-adjacent: count of flashcards due right now (used by the SRS reminder cron and the dashboard). */
  async getSrsDueCount(userId: string): Promise<number> {
    return Flashcard.countDocuments({ ownerId: userId, 'srsData.dueDate': { $lte: new Date() } });
  },

  async getWeeklyStudyTime(userId: string, weeks: number): Promise<Array<{ week: string; minutes: number }>> {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const sessions = await StudySession.find({ userId, startedAt: { $gte: since } }).select('startedAt durationSeconds');

    const buckets = new Map<string, number>();
    for (const s of sessions) {
      const weekKey = isoWeekKey(s.startedAt);
      buckets.set(weekKey, (buckets.get(weekKey) ?? 0) + s.durationSeconds);
    }

    return Array.from(buckets.entries())
      .map(([week, seconds]) => ({ week, minutes: Math.round(seconds / 60) }))
      .sort((a, b) => a.week.localeCompare(b.week));
  },

  async getDueForecast(userId: string, days: number): Promise<Array<{ date: string; count: number }>> {
    const forecast: Array<{ date: string; count: number }> = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await Flashcard.countDocuments({
        ownerId: userId,
        'srsData.dueDate': { $gte: i === 0 ? new Date(0) : dayStart, $lte: dayEnd },
      });
      forecast.push({ date: formatDate(dayStart), count });
    }

    return forecast;
  },

  /**
   * Records a completed study session and updates the user's streak/total
   * time stats. Called by content/flashcard/quiz controllers when a study
   * activity concludes (e.g., a flashcard review session ends).
   */
  async recordSession(input: {
    userId: string;
    contentItemId: string;
    projectId: string;
    sessionType: 'video' | 'audio' | 'flashcard' | 'quiz' | 'notes' | 'mindmap' | 'chat';
    startedAt: Date;
    endedAt: Date;
    itemsReviewed?: number;
    itemsMastered?: number;
  }): Promise<void> {
    const durationSeconds = Math.max(0, Math.round((input.endedAt.getTime() - input.startedAt.getTime()) / 1000));
    const dateKey = formatDate(input.startedAt);

    await StudySession.create({
      userId: input.userId,
      contentItemId: input.contentItemId,
      projectId: input.projectId,
      sessionType: input.sessionType,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationSeconds,
      itemsReviewed: input.itemsReviewed ?? 0,
      itemsMastered: input.itemsMastered ?? 0,
      date: dateKey,
    });

    await this.updateStreakAndTotalTime(input.userId, dateKey, durationSeconds);
  },

  /**
   * Updates a user's streak counter: increments if this is the first study
   * session of a new consecutive day, resets to 1 if a day was missed,
   * leaves unchanged if already studied today. Also accumulates total time.
   */
  async updateStreakAndTotalTime(userId: string, dateKey: string, durationSeconds: number): Promise<void> {
    const user = await User.findById(userId).select('stats');
    if (!user) return;

    const today = new Date(dateKey);
    const lastStudyDate = user.stats.lastStudyDate;

    let newStreak = user.stats.streak;
    if (!lastStudyDate) {
      newStreak = 1;
    } else {
      const lastDateKey = formatDate(lastStudyDate);
      if (lastDateKey === dateKey) {
        // Already studied today; streak unchanged.
      } else {
        const dayDiff = Math.round((today.getTime() - new Date(lastDateKey).getTime()) / (24 * 60 * 60 * 1000));
        newStreak = dayDiff === 1 ? user.stats.streak + 1 : 1;
      }
    }

    user.stats.streak = newStreak;
    user.stats.longestStreak = Math.max(user.stats.longestStreak, newStreak);
    user.stats.totalStudyTime += durationSeconds;
    user.stats.lastStudyDate = today;
    await user.save();

    logger.debug('User study stats updated', { userId, newStreak, durationSeconds });
  },
};

/** Returns an ISO 8601 week key like "2025-W01" for grouping study time by week. */
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
