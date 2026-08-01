import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { initializeDatabase, pool } from './models/db';
import reportesRoutes from './routes/reportes.routes';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3004);

app.use(cors());
app.use(express.json({ limit: '100kb' }));

const swaggerDocs = swaggerJsDoc({
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Reportes Service API',
            version: '2.0.0',
            description: 'Sensores e historial continuo de glucosa almacenados en PostgreSQL'
        },
        servers: [{ url: `http://localhost:${port}` }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
            }
        },
        security: [{ bearerAuth: [] }]
    },
    apis: ['./src/routes/*.ts']
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use('/reportes', reportesRoutes);

app.get('/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        return res.status(200).json({ status: 'UP', database: 'connected', engine: 'postgresql' });
    } catch {
        return res.status(503).json({ status: 'DOWN', database: 'disconnected', engine: 'postgresql' });
    }
});

const start = async () => {
    try {
        await initializeDatabase();
        app.listen(port, () => {
            console.log(`Reportes service running on port ${port} with PostgreSQL`);
        });
    } catch (error) {
        console.error('Unable to initialize PostgreSQL for Reportes Service:', error);
        process.exit(1);
    }
};

void start();
