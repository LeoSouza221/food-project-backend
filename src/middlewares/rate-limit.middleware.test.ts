import { rateLimitMiddleware } from './rate-limit.middleware.js';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IncomingMessage, ServerResponse } from 'node:http';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('rateLimitMiddleware', () => {
  it('should call next if under the limit', () => {
    const req = {
      socket: { remoteAddress: '127.0.0.1' },
    } as IncomingMessage;
    const res = {
      statusCode: 0,
      end: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as ServerResponse;
    const next = vi.fn();

    rateLimitMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
  it('should call next if is equal to the limit', () => {
    const req = {
      socket: { remoteAddress: '127.0.0.2' },
    } as IncomingMessage;
    const res = {
      statusCode: 0,
      end: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as ServerResponse;
    const next = vi.fn();

    for (let i = 0; i < 5; i++) {
      rateLimitMiddleware(req, res, next);
    }

    expect(next).toHaveBeenCalledTimes(5);
  });
  it('should return 429 if over the limit', () => {
    const req = {
      socket: { remoteAddress: '127.0.0.3' },
    } as IncomingMessage;
    const res = {
      statusCode: 0,
      end: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as ServerResponse;
    const next = vi.fn();

    for (let i = 0; i < 6; i++) {
      rateLimitMiddleware(req, res, next);
    }

    expect(res.statusCode).toBe(429);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    expect(res.end).toHaveBeenCalledWith('Too Many Requests');
    expect(next).toHaveBeenCalledTimes(5);
  });
  it('should call next if after five requests with a ip, other ip is used', () => {
    const req1 = {
      socket: { remoteAddress: '127.0.0.4' },
    } as IncomingMessage;
    const req2 = {
      socket: { remoteAddress: '127.0.0.5' },
    } as IncomingMessage;
    const res = {
      statusCode: 0,
      end: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as ServerResponse;
    const next = vi.fn();

    for (let i = 0; i < 5; i++) {
      rateLimitMiddleware(req1, res, next);
    }

    rateLimitMiddleware(req2, res, next);

    expect(next).toHaveBeenCalledTimes(6);
  });
  it('should reset the limit after some time', () => {
    const req = {
      socket: { remoteAddress: '127.0.0.6' },
    } as IncomingMessage;
    const res = {
      statusCode: 0,
      end: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as ServerResponse;
    const next = vi.fn();

    for (let i = 0; i < 5; i++) {
      rateLimitMiddleware(req, res, next);
    }

    expect(next).toHaveBeenCalledTimes(5);

    vi.advanceTimersByTime(60000);

    rateLimitMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(6);
  });
  it('should throw an error if no IP is provided', () => {
    const req = {
      socket: { remoteAddress: undefined },
    } as IncomingMessage;
    const res = {
      statusCode: 0,
      end: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as ServerResponse;
    const next = vi.fn();

    rateLimitMiddleware(req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.end).toHaveBeenCalledWith('Internal Server Error');
    expect(next).not.toHaveBeenCalled();
  });
});
