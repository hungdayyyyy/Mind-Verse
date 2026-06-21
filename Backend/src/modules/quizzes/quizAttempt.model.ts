import { Schema, model, Document, Types } from 'mongoose';

export interface QuizAnswer {
  questionId: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeTaken: number;
  pointsEarned: number;
}

export interface WeakArea {
  tag: string;
  incorrectCount: number;
  totalCount: number;
}

export interface QuizAttemptDocument extends Document {
  _id: Types.ObjectId;
  quizId: Types.ObjectId;
  userId: Types.ObjectId;
  contentItemId: Types.ObjectId;
  answers: QuizAnswer[];
  score: number;
  totalPoints: number;
  earnedPoints: number;
  totalQuestions: number;
  correctCount: number;
  skippedCount: number;
  timeTaken: number;
  passed: boolean;
  weakAreas: WeakArea[];
  studyRoomId: Types.ObjectId | null;
  completedAt: Date;
  createdAt: Date;
}

const quizAttemptSchema = new Schema<QuizAttemptDocument>({
  quizId: { type: Schema.Types.ObjectId, ref: 'Quiz', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true },
  answers: [
    {
      questionId: { type: String, required: true },
      selectedAnswer: { type: String, default: null },
      isCorrect: { type: Boolean, required: true },
      timeTaken: { type: Number, default: 0 },
      pointsEarned: { type: Number, default: 0 },
    },
  ],
  score: { type: Number, required: true },
  totalPoints: { type: Number, default: 0 },
  earnedPoints: { type: Number, default: 0 },
  totalQuestions: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  skippedCount: { type: Number, default: 0 },
  timeTaken: { type: Number, required: true },
  passed: { type: Boolean, required: true },
  weakAreas: [{ tag: String, incorrectCount: Number, totalCount: Number }],
  studyRoomId: { type: Schema.Types.ObjectId, ref: 'StudyRoom', default: null },
  completedAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

quizAttemptSchema.index({ quizId: 1, userId: 1 });
quizAttemptSchema.index({ userId: 1, completedAt: -1 });
quizAttemptSchema.index({ contentItemId: 1 });

export const QuizAttempt = model<QuizAttemptDocument>('QuizAttempt', quizAttemptSchema);
