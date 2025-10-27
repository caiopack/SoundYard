// server.js
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import soundYardRoutes from './routes/soundYard.js';
import authMiddleware from './middleware/auth.js';

const app = express();
app.use(express.json());

// --- Swagger ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SoundYard API',
      version: '1.0.0',
      description: 'API para gerenciar artistas, álbuns e playlists',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [], // <-- deixar vazio para Swagger não exigir token
  },
  apis: ['./routes/*.js'], // procura pelos comentários @openapi
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Rota do Swagger sem autenticação
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rotas reais da API com autenticação
app.use('/soundyard', authMiddleware, soundYardRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
  console.log(`Swagger docs em http://localhost:${PORT}/api-docs`);
});
