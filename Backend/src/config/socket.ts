import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env, config } from './index';
import { logger } from './logger';
import { SOCKET_EVENTS, userRoom } from '@shared/constants/events';

interface AuthenticatedSocket extends Socket {
  data: { userId: string };
}

let io: Server | null = null;

/**
 * Initializes the Socket.io server, attaches JWT auth middleware, and wires
 * up the Study Room event handlers. Returns the `io` instance so callers
 * (e.g., server.ts) can hold a reference if needed.
 */
export function initializeSocketServer(httpServer: HTTPServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.SOCKET_IO_CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string };
      (socket as AuthenticatedSocket).data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on(SOCKET_EVENTS.CONNECT, (socket: Socket) => {
    const authedSocket = socket as AuthenticatedSocket;
    const userId = authedSocket.data.userId;
    socket.join(userRoom(userId));
    logger.debug('Socket connected', { userId, socketId: socket.id });

    // Lazy-require to avoid a circular import between config/socket and the
    // study-rooms module (which itself imports socket emitters).
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { registerStudyRoomHandlers } = require('@modules/study-rooms/studyRoom.socket');
    registerStudyRoomHandlers(io as Server, authedSocket);

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      logger.debug('Socket disconnected', { userId, socketId: socket.id });
    });
  });

  logger.info('Socket.io server initialized');
  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io server has not been initialized yet');
  return io;
}

/** Emits an event to all of a user's connected devices/tabs. */
export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) {
    if (!config.isTest) logger.warn('Attempted to emit before Socket.io was initialized', { event });
    return;
  }
  io.to(userRoom(userId)).emit(event, payload);
}

/** Emits an event to everyone connected to a given Study Room channel. */
export function emitToRoom(roomChannel: string, event: string, payload: unknown): void {
  if (!io) {
    if (!config.isTest) logger.warn('Attempted to emit before Socket.io was initialized', { event });
    return;
  }
  io.to(roomChannel).emit(event, payload);
}
