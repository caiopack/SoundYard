import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { PORT } from './config.js';

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SoundYard API",
      version: "1.0.0",
      description: "Documentação da API do SoundYard para gerenciamento de músicas e playlists.",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Servidor de Desenvolvimento"
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {          
          type: "http",
          scheme: "bearer",
        }
      }
    },
    security: [
      {
        bearerAuth: []         
      }
    ]
  },
  apis: ["./routes/*.js"],
};

const specs = swaggerJsdoc(options);

function swaggerDocs(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });
}

export default swaggerDocs;
