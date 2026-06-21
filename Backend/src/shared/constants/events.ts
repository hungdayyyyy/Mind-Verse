/**
 * Centralized Socket.io event name constants. Importing from here (rather than
 * hardcoding string literals) keeps client/server event names in sync and makes
 * renames a single-file change.
 */
export const SOCKET_EVENTS = {
  // Connection lifecycle
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // Content processing pipeline (emitted to `user:{userId}` room)
  PROCESSING_UPDATE: 'content:processing:update',
  PROCESSING_ERROR: 'content:processing:error',

  // Study Room — client → server
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_QUIZ_START: 'room:quiz-start',
  ROOM_QUIZ_ANSWER: 'room:quiz-answer',
  ROOM_NOTE_UPDATE: 'room:note-update',
  ROOM_CHAT_MESSAGE: 'room:chat-message',

  // Study Room — server → client
  ROOM_PARTICIPANT_JOINED: 'room:participant-joined',
  ROOM_PARTICIPANT_LEFT: 'room:participant-left',
  ROOM_NOTES_SYNCED: 'room:notes-synced',
  ROOM_CHAT_BROADCAST: 'room:chat-broadcast',
  QUIZ_QUESTION: 'quiz:question',
  QUIZ_SCORE_UPDATE: 'quiz:score-update',
  QUIZ_REVEAL: 'quiz:reveal',
  QUIZ_FINAL_RESULTS: 'quiz:final-results',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** Builds the Socket.io room name for a user's personal notification channel. */
export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/** Builds the Socket.io room name for a Study Room. */
export function studyRoomChannel(roomId: string): string {
  return `room:${roomId}`;
}
