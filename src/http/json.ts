import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http';

export class InvalidJsonBodyError extends Error {
  constructor() {
    super('Invalid JSON');
    this.name = 'InvalidJsonBodyError';
  }
}

export const sendJson = (
  res: ServerResponse,
  statusCode: number,
  body: unknown,
  headers: OutgoingHttpHeaders = {},
): ServerResponse => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    ...headers,
  });
  return res.end(JSON.stringify(body));
};

export const readJsonBody = (req: IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    let body = '';

    // Remove os listeners assim que a leitura termina para evitar handlers pendurados.
    const cleanup = () => {
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
      req.off('aborted', onAborted);
    };

    // Cada evento "data" entrega um pedaço do corpo; juntamos os pedaços antes do parse.
    const onData = (chunk: Buffer | string) => {
      body += chunk.toString();
    };

    // "end" indica que todos os pedaços chegaram; então fazemos o parse e concluímos a Promise.
    const onEnd = () => {
      cleanup();
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new InvalidJsonBodyError());
      }
    };

    // "error" sinaliza uma falha na leitura do stream, que é repassada ao chamador.
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    // "aborted" indica que a conexão foi interrompida antes do corpo chegar por completo.
    const onAborted = () => {
      cleanup();
      reject(new Error('Request body was aborted.'));
    };

    req.on('data', onData);
    req.once('end', onEnd);
    req.once('error', onError);
    req.once('aborted', onAborted);
  });
