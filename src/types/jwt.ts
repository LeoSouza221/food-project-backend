import type { UserRole } from './user.js';

export type VerifiedTokenPayload = {
  sub: string;
  role: UserRole;
};
