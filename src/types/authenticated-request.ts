import type { IncomingMessage } from 'node:http';
import type { AuthContext } from './auth.js';

export type AuthenticatedRequest = IncomingMessage & {
  auth: AuthContext;
};
