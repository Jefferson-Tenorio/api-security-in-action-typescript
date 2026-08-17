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

https.createServer(options, app.instance).listen(env.port, () => {
  console.log(`HTTPS running on https://localhost:${env.port}`);
});
