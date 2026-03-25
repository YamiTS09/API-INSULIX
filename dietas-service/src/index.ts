import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import dietasRoutes from './routes/dietas.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// Conexión a MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:secretpassword@localhost:27017/insulix_dietas?authSource=admin';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB - Dietas Service'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Configuracion de Swagger
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Dietas Service API',
            version: '1.0.0',
            description: 'Microservicio de Nutrición (Catálogo y Asignación) para API_INSULIX',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
            },
        ],
    },
    apis: ['./src/routes/*.ts'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use('/dietas', dietasRoutes);

app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    res.status(200).json({ status: 'UP', database: dbState === 1 ? 'connected' : 'disconnected' });
});

app.listen(port, () => {
    console.log(`Dietas service running on port ${port}`);
});
