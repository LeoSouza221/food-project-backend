import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from '../types/user.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

const JWT_SECRET_BYTES = new TextEncoder().encode(JWT_SECRET);

export { JWT_SECRET_BYTES };

const isValidUserRole = (role: unknown): role is UserRole => {
  return ['customer', 'admin'].includes(role as UserRole);
};

export const generateJWT = async (id: string, role: UserRole) => {
  const payload = { role };
  const jwt = await new SignJWT(payload)
    .setSubject(id)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .setIssuedAt()
    .sign(JWT_SECRET_BYTES);
  return jwt;
};

export const verifyJWT = async (token: string) => {
  const { payload } = await jwtVerify(token, JWT_SECRET_BYTES, {
    algorithms: ['HS256'],
  });

  if (!payload.sub || typeof payload.sub !== 'string' || payload.sub.trim() === '') {
    throw new Error('Invalid token: missing subject');
  }

  if (!isValidUserRole(payload.role)) {
    throw new Error('Invalid role in token');
  }

  return payload;
};
