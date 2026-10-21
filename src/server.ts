import { createApp } from './app.js';

const server = createApp();

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});
