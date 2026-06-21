import { v4 as uuidv4 } from 'uuid';
import { Quiz, QuizDocument, QuizQuestion } from './quiz.model';
import { QuizAttempt, QuizAttemptDocument, WeakArea } from './quizAttempt.model';
import { NotFoundError } from '@shared/errors';
import { logger } from '@config/logger';
import { openai, openaiModels } from '@config/openai';
import { CreateQuizBody, UpdateQuizBody, SubmitAttemptBody } from './quiz.schema';

export const quizService = {
  async listByContentId(contentItemId?: string): Promise<QuizDocument[]> {
    const filter: Record<string, unknown> = { deletedAt: null };
    if (contentItemId) filter.contentItemId = contentItemId;
    return Quiz.find(filter).sort({ createdAt: -1 });
  },

  async getById(quizId: string): Promise<QuizDocument> {
    const quiz = await Quiz.findOne({ _id: quizId, deletedAt: null });
    if (!quiz) throw new NotFoundError('Quiz');
    return quiz;
  },

  async createQuiz(ownerId: string, input: CreateQuizBody): Promise<QuizDocument> {
    const questions: QuizQuestion[] = input.questions.map((q) => ({
      id: uuidv4(),
      type: q.type,
      question: q.question,
      options: (q.options ?? []).map((o, i) => ({ id: `opt-${i}`, text: o.text })),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ?? '',
      difficulty: q.difficulty ?? 'medium',
      tags: q.tags ?? [],
      points: 1,
    }));

    const quiz = await Quiz.create({
      contentItemId: input.contentItemId,
      ownerId,
      title: input.title,
      description: input.description ?? '',
      questions,
      totalPoints: questions.length,
      isAiGenerated: false,
    });

    return quiz;
  },

  async updateQuiz(quizId: string, input: UpdateQuizBody): Promise<QuizDocument> {
    const quiz = await this.getById(quizId);
    if (input.title !== undefined) quiz.title = input.title;
    if (input.description !== undefined) quiz.description = input.description;
    if (input.settings) quiz.settings = { ...quiz.settings, ...input.settings };
    await quiz.save();
    return quiz;
  },

  async deleteQuiz(quizId: string): Promise<void> {
    const quiz = await this.getById(quizId);
    quiz.deletedAt = new Date();
    await quiz.save();
  },

  /**
   * Creates a quiz with AI-generated questions (called by the quiz worker).
   * Mix per content item per UC-007: 5 MCQ + 3 true/false + 2 short answer
   * (scaled down for very short content — see notes in quiz.worker.ts).
   */
  async createFromAI(
    contentItemId: string,
    ownerId: string,
    title: string,
    questions: Array<Omit<QuizQuestion, 'id'>>
  ): Promise<QuizDocument> {
    const questionsWithIds: QuizQuestion[] = questions.map((q) => ({ ...q, id: uuidv4() }));
    return Quiz.create({
      contentItemId,
      ownerId,
      title,
      questions: questionsWithIds,
      totalPoints: questionsWithIds.reduce((sum, q) => sum + q.points, 0),
      isAiGenerated: true,
    });
  },

  /**
   * Grades a submitted quiz attempt (UC-011). MCQ and true/false are graded
   * by exact match against `correctAnswer`. Short-answer questions are
   * graded via GPT-4o semantic matching, falling back to normalized exact
   * match if the grading call fails.
   */
  async submitAttempt(
    quizId: string,
    userId: string,
    input: SubmitAttemptBody
  ): Promise<QuizAttemptDocument> {
    const quiz = await this.getById(quizId);
    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));

    const gradedAnswers = await Promise.all(
      input.answers.map(async (answer) => {
        const question = questionMap.get(answer.questionId);
        if (!question) {
          return { ...answer, isCorrect: false, pointsEarned: 0 };
        }

        const isCorrect =
          question.type === 'short'
            ? await this.gradeShortAnswer(question, answer.selectedAnswer)
            : this.gradeExactMatch(question, answer.selectedAnswer);

        return {
          questionId: answer.questionId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect,
          timeTaken: answer.timeTaken,
          pointsEarned: isCorrect ? question.points : 0,
        };
      })
    );

    const answeredIds = new Set(input.answers.map((a) => a.questionId));
    const skippedCount = quiz.questions.length - answeredIds.size;
    const correctCount = gradedAnswers.filter((a) => a.isCorrect).length;
    const earnedPoints = gradedAnswers.reduce((sum, a) => sum + a.pointsEarned, 0);
    const totalPoints = quiz.totalPoints;
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 1000) / 10 : 0;
    const passed = score >= quiz.settings.passingScore;

    const weakAreas = this.computeWeakAreas(quiz.questions, gradedAnswers);

    const attempt = await QuizAttempt.create({
      quizId,
      userId,
      contentItemId: quiz.contentItemId,
      answers: gradedAnswers,
      score,
      totalPoints,
      earnedPoints,
      totalQuestions: quiz.questions.length,
      correctCount,
      skippedCount,
      timeTaken: input.timeTaken,
      passed,
      weakAreas,
      studyRoomId: input.studyRoomId ?? null,
      completedAt: new Date(),
    });

    // Update denormalized quiz stats.
    const allAttempts = await QuizAttempt.find({ quizId }).select('score');
    const avgScore = allAttempts.reduce((sum, a) => sum + a.score, 0) / allAttempts.length;
    await Quiz.updateOne({ _id: quizId }, { attemptCount: allAttempts.length, averageScore: Math.round(avgScore * 10) / 10 });

    logger.info('Quiz attempt submitted', { quizId, userId, score, passed });
    return attempt;
  },

  gradeExactMatch(question: QuizQuestion, selectedAnswer: string | null): boolean {
    if (selectedAnswer === null) return false;
    return selectedAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
  },

  /**
   * Grades a short-answer response using GPT-4o for semantic equivalence
   * (e.g., "ReLU" vs "Rectified Linear Unit" should both be marked correct).
   * Falls back to a normalized exact-string match if the API call fails.
   */
  async gradeShortAnswer(question: QuizQuestion, selectedAnswer: string | null): Promise<boolean> {
    if (!selectedAnswer?.trim()) return false;

    try {
      const completion = await openai.chat.completions.create({
        model: openaiModels.chat,
        messages: [
          {
            role: 'system',
            content:
              'You grade short-answer quiz responses. Given a question, the expected correct answer, and the ' +
              'student\'s response, reply with ONLY "true" if the response is substantively correct (semantically ' +
              'equivalent, even if worded differently) or "false" if it is not. No other text.',
          },
          {
            role: 'user',
            content: `Question: ${question.question}\nExpected answer: ${question.correctAnswer}\nStudent response: ${selectedAnswer}`,
          },
        ],
        temperature: 0,
        max_tokens: 5,
      });

      const verdict = completion.choices[0]?.message?.content?.trim().toLowerCase();
      return verdict === 'true';
    } catch (err) {
      logger.warn('Short-answer AI grading failed, falling back to exact match', { error: (err as Error).message });
      return this.gradeExactMatch(question, selectedAnswer);
    }
  },

  /**
   * UC-012: Aggregates incorrect answers by question tag to surface weak
   * topic areas. A tag is included if at least one question with that tag
   * was answered incorrectly.
   */
  computeWeakAreas(
    questions: QuizQuestion[],
    answers: Array<{ questionId: string; isCorrect: boolean }>
  ): WeakArea[] {
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const tagStats = new Map<string, { incorrect: number; total: number }>();

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      for (const tag of question.tags) {
        const stats = tagStats.get(tag) ?? { incorrect: 0, total: 0 };
        stats.total += 1;
        if (!answer.isCorrect) stats.incorrect += 1;
        tagStats.set(tag, stats);
      }
    }

    return Array.from(tagStats.entries())
      .filter(([, stats]) => stats.incorrect > 0)
      .map(([tag, stats]) => ({ tag, incorrectCount: stats.incorrect, totalCount: stats.total }))
      .sort((a, b) => b.incorrectCount / b.totalCount - a.incorrectCount / a.totalCount);
  },

  async getAttempts(quizId: string, userId: string): Promise<QuizAttemptDocument[]> {
    return QuizAttempt.find({ quizId, userId }).sort({ completedAt: -1 });
  },

  async getLatestResult(quizId: string, userId: string): Promise<QuizAttemptDocument> {
    const attempt = await QuizAttempt.findOne({ quizId, userId }).sort({ completedAt: -1 });
    if (!attempt) throw new NotFoundError('Quiz attempt');
    return attempt;
  },
};
