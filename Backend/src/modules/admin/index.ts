import { adminRouter } from './admin.router';

/**
 * Admin module — platform-wide user management, moderation, and metrics.
 * Has no BullMQ workers or Socket.io handlers of its own (it orchestrates
 * existing services), so only `router` is populated here. See
 * shared/types/index.ts for the SystemRole hierarchy this module enforces.
 */
export const adminModule = {
  router: adminRouter,
  workers: [],
  socketHandlers: undefined,
};

export * from './admin.service';
export * from './admin.types';
export * from './admin.schema';
