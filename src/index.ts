import { App } from './app.js';
import https from 'https';
import fs from 'fs';

const options = {
  key:  fs.readFileSync('localhost+1-key.pem'),
  cert: fs.readFileSync('localhost+1.pem'),
};

const app = new App();
const port = Number(process.env.PORT) || 3000;

https.createServer(options, app.instance).listen(port, () => {
  console.log(`HTTPS rodando em https://localhost:${port}`);
});