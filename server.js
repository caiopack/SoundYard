// server.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// Rotas da API
import catalog from './src/routes/catalog.js';
import playlists from './src/routes/playlists.js';
import search from './src/routes/search.js';

// Swagger
import { swaggerServe, swaggerSetup } from './src/docs/swagger.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Resolve __dirname (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir arquivos estáticos da pasta /public
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Rotas da API
app.use('/catalog', catalog);
app.use('/playlists', playlists);

// Swagger (documentação)
app.use('/api-docs', swaggerServe, swaggerSetup);

// Fallback para / → index.html (frontend SPA simples)
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Subir servidor
const PORT = process.env.API_PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API up on http://localhost:${PORT}`);
  console.log(`Swagger docs em http://localhost:${PORT}/api-docs`);
  console.log(`Frontend em http://localhost:${PORT}/`);
});

app.use('/search', search);