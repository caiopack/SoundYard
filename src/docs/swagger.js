// src/docs/swagger.js
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SoundYard API',
      version: '1.0.0',
      description:
        'API de integração (Supabase) para catálogo de músicas e playlists.',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        Artist: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' }
          }
        },
        Album: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            year: { type: 'integer' },
            artist_id: { type: 'string', format: 'uuid' }
          }
        },
        Track: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            duration_seconds: { type: 'integer' },
            album_id: { type: 'string', format: 'uuid' }
          }
        },
        Playlist: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            is_public: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        PlaylistCreate: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' }
          }
        },
        PlaylistPatch: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            is_public: { type: 'boolean' }
          }
        },
        PlaylistTrackCreate: {
          type: 'object',
          required: ['track_id'],
          properties: {
            track_id: { type: 'string', format: 'uuid' },
            position: { type: 'integer' }
          }
        }
      }
    }
  },
  // os comentários JSDoc nas rotas irão gerar os paths
  apis: ['./server.js', './src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerServe = swaggerUi.serve;
export const swaggerSetup = swaggerUi.setup(swaggerSpec, { explorer: true });
