import { Schema, model, Document, Types } from 'mongoose';

export interface StudyRoomParticipant {
  userId: Types.ObjectId;
  displayName: string;
  joinedAt: Date;
  role: 'host' | 'participant';
  isActive: boolean;
  score: number;
}

export interface StudyRoomChatMessage {
  userId: Types.ObjectId;
  displayName: string;
  content: string;
  createdAt: Date;
}

export interface StudyRoomCurrentActivity {
  type: 'idle' | 'notes' | 'quiz' | 'discussion';
  resourceId: Types.ObjectId | null;
  startedAt: Date | null;
  currentQuestion: number;
}

export interface StudyRoomDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  projectId: Types.ObjectId;
  hostId: Types.ObjectId;
  participants: StudyRoomParticipant[];
  maxParticipants: number;
  currentActivity: StudyRoomCurrentActivity;
  sharedNotes: string;
  chatMessages: StudyRoomChatMessage[];
  isActive: boolean;
  inviteCode: string;
  scheduledFor: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const studyRoomSchema = new Schema<StudyRoomDocument>(
  {
    name: { type: String, required: true, maxlength: 100 },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        displayName: String,
        joinedAt: { type: Date, default: Date.now },
        role: { type: String, enum: ['host', 'participant'], default: 'participant' },
        isActive: { type: Boolean, default: true },
        score: { type: Number, default: 0 },
      },
    ],
    maxParticipants: { type: Number, default: 10, min: 2, max: 20 },
    currentActivity: {
      type: { type: String, enum: ['idle', 'notes', 'quiz', 'discussion'], default: 'idle' },
      resourceId: { type: Schema.Types.ObjectId, default: null },
      startedAt: { type: Date, default: null },
      currentQuestion: { type: Number, default: 0 },
    },
    sharedNotes: { type: String, default: '' },
    chatMessages: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        displayName: String,
        content: { type: String, maxlength: 500 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
    inviteCode: { type: String, required: true, unique: true },
    scheduledFor: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

studyRoomSchema.index({ inviteCode: 1 }, { unique: true });
studyRoomSchema.index({ projectId: 1 });
studyRoomSchema.index({ hostId: 1 });
studyRoomSchema.index({ isActive: 1 });

export const StudyRoom = model<StudyRoomDocument>('StudyRoom', studyRoomSchema);
