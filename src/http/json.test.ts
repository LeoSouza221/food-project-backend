import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { InvalidJsonBodyError, readJsonBody, sendJson } from './json.js';

describe('sendJson', () => {
  it('writes JSON with the content type and optional headers', () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    } as unknown as ServerResponse;

    sendJson(res, 405, { error: 'Method Not Allowed' }, { Allow: 'GET' });

    expect(res.writeHead).toHaveBeenCalledWith(405, {
      'Content-Type': 'application/json',
      Allow: 'GET',
    });
    expect(res.end).toHaveBeenCalledWith(JSON.stringify({ error: 'Method Not Allowed' }));
  });
});

describe('readJsonBody', () => {
  it('parses JSON split across request chunks', async () => {
    const req = new EventEmitter() as IncomingMessage;
    const body = readJsonBody(req);

    req.emit('data', Buffer.from('{"name":'));
    req.emit('data', Buffer.from('"Lanches"}'));
    req.emit('end');

    await expect(body).resolves.toEqual({ name: 'Lanches' });
  });

  it('rejects malformed JSON with InvalidJsonBodyError', async () => {
    const req = new EventEmitter() as IncomingMessage;
    const body = readJsonBody(req);

    req.emit('data', Buffer.from('{ name: }'));
    req.emit('end');

    await expect(body).rejects.toBeInstanceOf(InvalidJsonBodyError);
  });

  it('rejects when the request stream fails', async () => {
    const req = new EventEmitter() as IncomingMessage;
    const body = readJsonBody(req);
    const error = new Error('Request stream failed');

    req.emit('error', error);

    await expect(body).rejects.toBe(error);
  });
});
