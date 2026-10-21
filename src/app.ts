import { createServer } from 'node:http';
import { routes } from './routes/index.js';

export const createApp = () => {
  const server = createServer((req, res) => {
    routes(req, res);
  });
  return server;
};
