import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import soundYardRoutes from './routes/soundYard.js';
import authMiddleware from './middleware/auth.js';


const app = express();
app.use(express.json());
app.use(express.static('public'));

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
    security: [], 
  },
  apis: ['./routes/*.js'], 
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/soundyard', authMiddleware, soundYardRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
  console.log(`Swagger docs em http://localhost:${PORT}/api-docs`);
});
