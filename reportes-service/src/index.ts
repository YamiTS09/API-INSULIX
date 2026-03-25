import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import reportesRoutes from './routes/reportes.routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());

// Conexión a MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://admin:secretpassword@localhost:27017/insulix_reportes?authSource=admin';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB - Reportes Service'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Configuracion de Swagger
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Reportes Service API',
            version: '1.0.0',
            description: 'Microservicio de Historiales y Glucosa para API_INSULIX',
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

app.use('/reportes', reportesRoutes);

app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    res.status(200).json({ status: 'UP', database: dbState === 1 ? 'connected' : 'disconnected' });
});

app.listen(port, () => {
    console.log(`Reportes service running on port ${port}`);
});
