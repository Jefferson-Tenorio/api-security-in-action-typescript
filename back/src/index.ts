import fs from 'fs';
import https from 'https';
import path from 'path';

import { App } from './app.js';
import { env } from './config/env.js';

const options = {
  cert: fs.readFileSync(
    path.join(import.meta.dirname, '..', 'certs', 'localhost+1.pem'),
  ),
  key: fs.readFileSync(
    path.join(import.meta.dirname, '..', 'certs', 'localhost+1-key.pem'),
  ),
};

const app = new App();

const server = https.createServer(options, app.instance);

server.timeout = env.timeoutMs;
server.requestTimeout = env.timeoutMs;
server.headersTimeout = 60_000;

server.listen(env.port, () => {
  console.log(`HTTPS running on https://localhost:${env.port}`);
});
