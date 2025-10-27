import fs from 'fs';
import path from 'path';

function logMiddleware(req, res, next) {
  const entry = `${new Date().toISOString()} - ${req.method} ${req.originalUrl} - body: ${JSON.stringify(req.body || {})}\n`;
  const logFile = path.resolve('data/logs.txt');

  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFile(logFile, entry, (err) => {
    if (err) console.error('Erro ao gravar log:', err);
  });

  next();
}

export default logMiddleware;