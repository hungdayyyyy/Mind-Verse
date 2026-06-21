import { UserDocument } from '@modules/users/user.types';

/**
 * Augments Express's Request type with the fields our middleware attaches.
 * `user` is populated by auth.middleware after JWT verification.
 * `requestId` is attached for correlation/tracing across logs.
 * `validated` holds the parsed-and-typed output of zod validation middleware.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDocument;
      requestId?: string;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
