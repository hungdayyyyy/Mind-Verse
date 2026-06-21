import { Schema, model, Document, Types } from 'mongoose';

export type QuestionType = 'mcq' | 'truefalse' | 'short';

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  points: number;
}

export interface QuizSettings {
  timeLimit: number | null;
  timeLimitPerQuestion: number | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showExplanations: boolean;
  passingScore: number;
}

export interface QuizDocument extends Document {
  _id: Types.ObjectId;
  contentItemId: Types.ObjectId;
  ownerId: Types.ObjectId;
  title: string;
  description: string;
  questions: QuizQuestion[];
  settings: QuizSettings;
  totalPoints: number;
  attemptCount: number;
  averageScore: number | null;
  isAiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

const quizSchema = new Schema<QuizDocument>(
  {
    contentItemId: { type: Schema.Types.ObjectId, ref: 'ContentItem', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 500 },
    questions: [
      {
        id: { type: String, required: true },
        type: { type: String, enum: ['mcq', 'truefalse', 'short'], required: true },
        question: { type: String, required: true, maxlength: 1000 },
        options: [{ id: String, text: String }],
        correctAnswer: { type: String, required: true },
        explanation: { type: String, default: '', maxlength: 1000 },
        difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
        tags: [String],
        points: { type: Number, default: 1 },
      },
    ],
    settings: {
      timeLimit: { type: Number, default: null },
      timeLimitPerQuestion: { type: Number, default: null },
      shuffleQuestions: { type: Boolean, default: false },
      shuffleOptions: { type: Boolean, default: true },
      showExplanations: { type: Boolean, default: true },
      passingScore: { type: Number, default: 70 },
    },
    totalPoints: { type: Number, default: 0 },
    attemptCount: { type: Number, default: 0 },
    averageScore: { type: Number, default: null },
    isAiGenerated: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

quizSchema.index({ contentItemId: 1 });
quizSchema.index({ ownerId: 1 });

export const Quiz = model<QuizDocument>('Quiz', quizSchema);
