import { StudyRoom, StudyRoomDocument } from './studyRoom.model';
import { NotFoundError, ForbiddenError, ValidationError } from '@shared/errors';
import { generateInviteCode } from '@shared/utils/generateToken';
import { logger } from '@config/logger';
import { CreateStudyRoomBody, UpdateStudyRoomBody } from './studyRoom.schema';

export const studyRoomService = {
  async listByProject(projectId?: string): Promise<StudyRoomDocument[]> {
    const filter: Record<string, unknown> = {};
    if (projectId) filter.projectId = projectId;
    return StudyRoom.find(filter).sort({ createdAt: -1 });
  },

  async getById(roomId: string): Promise<StudyRoomDocument> {
    const room = await StudyRoom.findOne({ _id: roomId });
    if (!room) throw new NotFoundError('Study room');
    return room;
  },

  async getByInviteCode(inviteCode: string): Promise<StudyRoomDocument> {
    const room = await StudyRoom.findOne({ inviteCode: inviteCode.toUpperCase(), isActive: true });
    if (!room) throw new NotFoundError('Study room', { reason: 'Invalid or expired invite code' });
    return room;
  },

  /** UC-016 setup: creates a Study Room with a unique invite code. Pro-gated at the router level. */
  async createRoom(hostId: string, hostName: string, input: CreateStudyRoomBody): Promise<StudyRoomDocument> {
    let inviteCode = generateInviteCode();
    // Extremely unlikely collision given the keyspace, but guard anyway.
    for (let attempts = 0; attempts < 5 && (await StudyRoom.exists({ inviteCode })); attempts++) {
      inviteCode = generateInviteCode();
    }

    const room = await StudyRoom.create({
      name: input.name,
      projectId: input.projectId,
      hostId,
      maxParticipants: input.maxParticipants ?? 10,
      participants: [{ userId: hostId, displayName: hostName, role: 'host', isActive: true, score: 0 }],
      inviteCode,
    });

    logger.info('Study room created', { roomId: room._id.toString(), hostId, inviteCode });
    return room;
  },

  async updateRoom(roomId: string, hostId: string, input: UpdateStudyRoomBody): Promise<StudyRoomDocument> {
    const room = await this.getById(roomId);
    if (room.hostId.toString() !== hostId) throw new ForbiddenError('Only the host can update this room');
    if (input.name !== undefined) room.name = input.name;
    if (input.maxParticipants !== undefined) room.maxParticipants = input.maxParticipants;
    await room.save();
    return room;
  },

  async deleteRoom(roomId: string, hostId: string): Promise<void> {
    const room = await this.getById(roomId);
    if (room.hostId.toString() !== hostId) throw new ForbiddenError('Only the host can delete this room');
    room.isActive = false;
    room.endedAt = new Date();
    await room.save();
  },

  /**
   * UC-016: Adds a user as a participant via invite code. Validates room
   * capacity and that the user isn't already a member.
   */
  async joinRoom(inviteCode: string, userId: string, displayName: string): Promise<StudyRoomDocument> {
    const room = await this.getByInviteCode(inviteCode);

    const alreadyJoined = room.participants.some((p) => p.userId.toString() === userId);
    if (alreadyJoined) return room;

    if (room.participants.length >= room.maxParticipants) {
      throw new ValidationError({
        formErrors: [`This room is currently full (max ${room.maxParticipants} participants).`],
        fieldErrors: {},
      });
    }

    room.participants.push({ userId: userId as unknown as StudyRoomDocument['hostId'], displayName, joinedAt: new Date(), role: 'participant', isActive: true, score: 0 });
    await room.save();
    return room;
  },

  async leaveRoom(roomId: string, userId: string): Promise<StudyRoomDocument> {
    const room = await this.getById(roomId);
    const participant = room.participants.find((p) => p.userId.toString() === userId);
    if (participant) participant.isActive = false;
    await room.save();
    return room;
  },

  async kickParticipant(roomId: string, hostId: string, targetUserId: string): Promise<StudyRoomDocument> {
    const room = await this.getById(roomId);
    if (room.hostId.toString() !== hostId) throw new ForbiddenError('Only the host can remove participants');
    room.participants = room.participants.filter((p) => p.userId.toString() !== targetUserId);
    await room.save();
    return room;
  },

  /** Initializes the live-quiz activity state on the room; actual question flow runs over Socket.io. */
  async startQuiz(roomId: string, hostId: string, quizId: string): Promise<StudyRoomDocument> {
    const room = await this.getById(roomId);
    if (room.hostId.toString() !== hostId) throw new ForbiddenError('Only the host can start a quiz');

    room.currentActivity = {
      type: 'quiz',
      resourceId: quizId as unknown as StudyRoomDocument['hostId'],
      startedAt: new Date(),
      currentQuestion: 0,
    };
    room.participants.forEach((p) => (p.score = 0));
    await room.save();
    return room;
  },
};
