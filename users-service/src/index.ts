import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import usersRoutes from './routes/users.routes';
import { pool } from './models/db';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Configuracion de Swagger
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Users Service API',
            version: '1.0.0',
            description: 'Microservicio de Perfiles y Roles (Médico/Paciente) para API_INSULIX',
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

app.use('/users', usersRoutes);

app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).json({ status: 'UP', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'DOWN', database: 'disconnected' });
    }
});

app.listen(port, () => {
    console.log(`Users service running on port ${port}`);
});
