import { createApp } from './app.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const distPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');

createApp().listen(port, host, () => {
  console.log(`Pronunciation server listening on http://${host}:${port}${process.env.NODE_ENV === 'production' ? ` (serving ${path.join(distPath, 'index.html')})` : ''}`);
});
