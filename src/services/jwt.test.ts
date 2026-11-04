import { describe, it, expect } from 'vitest';
import { generateJWT, verifyJWT, JWT_SECRET_BYTES } from './jwt.js';
import { SignJWT } from 'jose';

describe('JWT Service', () => {
  it('should generate and verify a JWT', async () => {
    const id = 'user-id';
    const role = 'customer';
    const token = await generateJWT(id, role);
    const payload = await verifyJWT(token);
    expect(payload.sub).toBe(id);
    expect(payload.role).toBe(role);
  });
  it('should throw an error for an invalid JWT', async () => {
    const invalidToken = 'invalid.token.here';
    await expect(verifyJWT(invalidToken)).rejects.toThrow();
  });
  it('should throw an error for a JWT with an invalid role', async () => {
    const id = 'user-id';
    const invalidRoleToken = await new SignJWT({ role: 'invalid-role' })
      .setSubject(id)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(JWT_SECRET_BYTES);
    await expect(verifyJWT(invalidRoleToken)).rejects.toThrow('Invalid role in token');
  });
  it('should throw an error for a JWT with a missing subject', async () => {
    const role = 'customer';
    const token = await new SignJWT({ role })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(JWT_SECRET_BYTES);
    await expect(verifyJWT(token)).rejects.toThrow('Invalid token: missing subject');
  });
  it('should throw an error for expired JWT', async () => {
    const id = 'user-id';
    const role = 'customer';
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({ role })
      .setSubject(id)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now - 3600)
      .setExpirationTime(now - 1800)
      .sign(JWT_SECRET_BYTES);
    await expect(verifyJWT(token)).rejects.toThrow(/exp/);
  });
  it('should throw an error for a JWT with an invalid signature', async () => {
    const id = 'user-id';
    const role = 'customer';
    const token = await generateJWT(id, role);
    const [header, payload, signature] = token.split('.');
    const modifiedSignature = signature?.endsWith('A')
      ? `${signature.slice(0, -1)}B`
      : `${signature?.slice(0, -1)}A`;
    const invalidToken = `${header}.${payload}.${modifiedSignature}`;

    await expect(verifyJWT(invalidToken)).rejects.toThrow();
  });
});
