import type { IncomingMessage, ServerResponse } from 'node:http';

const attempts = new Map<
  string,
  {
    count: number;
    resetAt: number;
  }
>();
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 5;
const CLEANUP_INTERVAL_MS = 60_000;

export const rateLimitMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => {
  const ip = req.socket.remoteAddress;

  if (!ip) {
    res.statusCode = 500;
    res.end('Internal Server Error');
    return;
  }

  const userId = ip;
  const now = Date.now();
  const attempt = attempts.get(userId) || { count: 0, resetAt: now + WINDOW_MS };
  if (attempt.resetAt <= now) {
    attempt.count = 0;
    attempt.resetAt = now + WINDOW_MS;
  }

  attempt.count += 1;
  attempts.set(userId, attempt);
  if (attempt.count > MAX_ATTEMPTS) {
    res.statusCode = 429;
    res.setHeader('Retry-After', Math.ceil((attempt.resetAt - now) / 1000));
    res.end('Too Many Requests');
    return;
  }
  next();
};

const cleanupInterval = setInterval(() => {
  const now = Date.now();

  for (const [userId, attempt] of attempts) {
    if (attempt.resetAt <= now) {
      attempts.delete(userId);
    }
  }
}, CLEANUP_INTERVAL_MS);

cleanupInterval.unref();
