import type { UserRole } from './user.js';

export type AuthContext = {
  role: UserRole;
  userId: string;
};
