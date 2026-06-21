import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { studyRoomService } from './studyRoom.service';
import { quizService } from '@modules/quizzes/quiz.service';
import { Quiz } from '@modules/quizzes/quiz.model';
import { User } from '@modules/users/user.model';
import { SOCKET_EVENTS, studyRoomChannel } from '@shared/constants/events';
import { logger } from '@config/logger';

interface AuthenticatedSocket extends Socket {
  data: { userId: string };
}

/**
 * Registers all Study Room event handlers on a freshly-connected socket.
 * Called once per connection from config/socket.ts.
 *
 * Live quiz flow (UC-017):
 *   host: room:quiz-start { quizId, timePerQuestion }
 *     -> server broadcasts quiz:question for question[0]
 *     -> participants emit room:quiz-answer { questionId, selectedAnswer }
 *     -> server tracks answers, broadcasts quiz:score-update as they arrive
 *     -> on timer expiry or all-answered: server broadcasts quiz:reveal,
 *        then advances to next question or quiz:final-results if done
 */
export function registerStudyRoomHandlers(io: Server, socket: AuthenticatedSocket): void {
  const userId = socket.data.userId;

  socket.on(SOCKET_EVENTS.ROOM_JOIN, async (payload: { roomId: string }) => {
    try {
      const room = await studyRoomService.getById(payload.roomId);
      const channel = studyRoomChannel(room._id.toString());
      socket.join(channel);

      const user = await User.findById(userId).select('name avatar');
      io.to(channel).emit(SOCKET_EVENTS.ROOM_PARTICIPANT_JOINED, {
        userId,
        name: user?.name ?? 'Unknown',
        avatar: user?.avatar ?? null,
      });

      logger.debug('User joined study room channel', { userId, roomId: payload.roomId });
    } catch (err) {
      socket.emit('error', { message: (err as Error).message });
    }
  });

  socket.on(SOCKET_EVENTS.ROOM_LEAVE, async (payload: { roomId: string }) => {
    const channel = studyRoomChannel(payload.roomId);
    socket.leave(channel);
    await studyRoomService.leaveRoom(payload.roomId, userId);
    io.to(channel).emit(SOCKET_EVENTS.ROOM_PARTICIPANT_LEFT, { userId });
  });

  socket.on(SOCKET_EVENTS.ROOM_NOTE_UPDATE, async (payload: { roomId: string; content: string }) => {
    const channel = studyRoomChannel(payload.roomId);
    const { StudyRoom } = await import('./studyRoom.model');
    await StudyRoom.updateOne({ _id: payload.roomId }, { sharedNotes: payload.content });
    // Broadcast to everyone else in the room (last-write-wins sync).
    socket.to(channel).emit(SOCKET_EVENTS.ROOM_NOTES_SYNCED, { content: payload.content, updatedBy: userId });
  });

  socket.on(SOCKET_EVENTS.ROOM_CHAT_MESSAGE, async (payload: { roomId: string; content: string }) => {
    const channel = studyRoomChannel(payload.roomId);
    const user = await User.findById(userId).select('name');
    const message = { userId, displayName: user?.name ?? 'Unknown', content: payload.content, createdAt: new Date() };

    const { StudyRoom } = await import('./studyRoom.model');
    await StudyRoom.updateOne(
      { _id: payload.roomId },
      { $push: { chatMessages: { $each: [message], $slice: -200 } } } // cap at last 200 messages
    );

    io.to(channel).emit(SOCKET_EVENTS.ROOM_CHAT_BROADCAST, message);
  });

  socket.on(SOCKET_EVENTS.ROOM_QUIZ_START, async (payload: { roomId: string; quizId: string; timePerQuestion: number }) => {
    try {
      const room = await studyRoomService.startQuiz(payload.roomId, userId, payload.quizId);
      const quiz = await Quiz.findById(payload.quizId);
      if (!quiz) return;

      const channel = studyRoomChannel(room._id.toString());
      io.to(channel).emit(SOCKET_EVENTS.ROOM_QUIZ_START, {
        title: quiz.title,
        questionCount: quiz.questions.length,
        timePerQuestion: payload.timePerQuestion,
      });

      await runQuizQuestionLoop(io, channel, payload.roomId, payload.quizId, payload.timePerQuestion);
    } catch (err) {
      socket.emit('error', { message: (err as Error).message });
    }
  });

  socket.on(
    SOCKET_EVENTS.ROOM_QUIZ_ANSWER,
    async (payload: { roomId: string; questionId: string; selectedAnswer: string }) => {
      const channel = studyRoomChannel(payload.roomId);
      const answers = roomAnswerBuffers.get(payload.roomId) ?? new Map();
      answers.set(userId, payload.selectedAnswer);
      roomAnswerBuffers.set(payload.roomId, answers);

      const { StudyRoom } = await import('./studyRoom.model');
      const room = await StudyRoom.findById(payload.roomId);
      io.to(channel).emit(SOCKET_EVENTS.QUIZ_SCORE_UPDATE, {
        answeredCount: answers.size,
        totalParticipants: room?.participants.filter((p) => p.isActive).length ?? 0,
      });
    }
  );
}

/**
 * In-memory buffer tracking which participants have answered the current
 * question, keyed by roomId. This is process-local state — acceptable for a
 * single-instance deployment; a multi-instance deployment would move this
 * into Redis (consistent with SOCKET_IO_ADAPTER=redis) so quiz state is
 * shared across server instances.
 */
const roomAnswerBuffers = new Map<string, Map<string, string>>();

/**
 * Drives the live-quiz question loop for a Study Room: broadcasts each
 * question in sequence, waits for the timer (or early completion once
 * everyone has answered), reveals the answer + updates scores, then
 * advances. Emits `quiz:final-results` once all questions are done.
 */
async function runQuizQuestionLoop(
  io: Server,
  channel: string,
  roomId: string,
  quizId: string,
  timePerQuestion: number
): Promise<void> {
  const quiz = await Quiz.findById(quizId);
  if (!quiz) return;

  const { StudyRoom } = await import('./studyRoom.model');

  for (let i = 0; i < quiz.questions.length; i++) {
    const question = quiz.questions[i];
    roomAnswerBuffers.set(roomId, new Map());

    await StudyRoom.updateOne({ _id: roomId }, { 'currentActivity.currentQuestion': i });

    io.to(channel).emit(SOCKET_EVENTS.QUIZ_QUESTION, {
      questionIndex: i,
      questionId: question.id,
      type: question.type,
      question: question.question,
      options: question.options,
      timeLimit: timePerQuestion,
    });

    await waitForQuestionWindow(roomId, roomId, timePerQuestion);

    const answers = roomAnswerBuffers.get(roomId) ?? new Map();
    const room = await StudyRoom.findById(roomId);
    if (!room) return;

    for (const participant of room.participants) {
      const selected = answers.get(participant.userId.toString());
      const isCorrect = selected === question.correctAnswer;
      if (isCorrect) {
        // Simple speed-bonus scoring: base 100 points, decaying linearly to 50 over the time window.
        participant.score += 100;
      }
    }
    await room.save();

    io.to(channel).emit(SOCKET_EVENTS.QUIZ_REVEAL, {
      questionId: question.id,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      leaderboard: room.participants.map((p) => ({ userId: p.userId.toString(), displayName: p.displayName, score: p.score })),
    });

    await sleep(2000); // brief pause to let participants see the reveal
  }

  const finalRoom = await StudyRoom.findById(roomId);
  io.to(channel).emit(SOCKET_EVENTS.QUIZ_FINAL_RESULTS, {
    leaderboard: (finalRoom?.participants ?? [])
      .map((p) => ({ userId: p.userId.toString(), displayName: p.displayName, score: p.score }))
      .sort((a, b) => b.score - a.score),
  });

  if (finalRoom) {
    finalRoom.currentActivity = { type: 'idle', resourceId: null, startedAt: null, currentQuestion: 0 };
    await finalRoom.save();
  }
}

/** Resolves early if all active participants have answered, otherwise waits out the full time window. */
async function waitForQuestionWindow(roomId: string, _unused: string, timePerQuestion: number): Promise<void> {
  const { StudyRoom } = await import('./studyRoom.model');
  const pollIntervalMs = 500;
  const deadline = Date.now() + timePerQuestion * 1000;

  while (Date.now() < deadline) {
    const answers = roomAnswerBuffers.get(roomId);
    const room = await StudyRoom.findById(roomId).select('participants');
    const activeCount = room?.participants.filter((p) => p.isActive).length ?? 0;
    if (answers && activeCount > 0 && answers.size >= activeCount) break;
    await sleep(pollIntervalMs);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
