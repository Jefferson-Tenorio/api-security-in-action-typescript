import fs from 'fs';
import https from 'https';

import { App } from './app.js';

const options = {
  cert: fs.readFileSync('localhost+1.pem'),
  key:  fs.readFileSync('localhost+1-key.pem'),
};

const app = new App();
const port = Number(process.env.PORT) || 3000;

https.createServer(options, app.instance).listen(port, () => {
  console.log(`HTTPS rodando em https://localhost:${port}`);
});