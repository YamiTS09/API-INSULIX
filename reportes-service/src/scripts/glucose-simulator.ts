import { pool } from '../models/db';

type Scenario = 'normal' | 'high' | 'low';

const patientId = String(process.env.SIM_PATIENT_ID ?? '').trim();
const serialNumber = String(process.env.SIM_SENSOR_SERIAL ?? `SIM-${patientId}`).trim();
const intervalMs = Number(process.env.SIM_INTERVAL_MS ?? 300_000);
const baseGlucose = Number(process.env.SIM_BASE_MGDL ?? 105);
const scenario = String(process.env.SIM_SCENARIO ?? 'normal').toLowerCase() as Scenario;

const validScenarios: Scenario[] = ['normal', 'high', 'low'];

const randomNormal = (): number => {
    const first = Math.max(Math.random(), Number.EPSILON);
    const second = Math.random();
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
};

const mealEffect = (date: Date): number => {
    const hour = date.getHours() + date.getMinutes() / 60;
    const peaks = [8.5, 14.5, 20.5];
    return peaks.reduce((total, peak) => {
        const distance = hour - peak;
        return total + 55 * Math.exp(-(distance * distance) / (2 * 1.1 * 1.1));
    }, 0);
};

const scenarioOffset = (): number => {
    if (scenario === 'high') return 105;
    if (scenario === 'low') return -42;
    return 0;
};

let currentGlucose = baseGlucose + scenarioOffset();
let sensorId = '';
let stopping = false;

const ensureSensor = async (): Promise<string> => {
    const patient = await pool.query(
        `SELECT 1
         FROM detalle_paciente p
         JOIN usuario u ON u.usuario_id = p.paciente_id
         WHERE p.paciente_id = $1 AND u.is_active = TRUE`,
        [patientId]
    );
    if (patient.rowCount === 0) {
        throw new Error(`No existe un paciente activo con id ${patientId}`);
    }

    const existing = await pool.query(
        `SELECT sensor_id, paciente_id
         FROM dispositivo_sensor
         WHERE numero_serie = $1`,
        [serialNumber]
    );
    if (existing.rowCount === 1) {
        if (existing.rows[0].paciente_id !== patientId) {
            throw new Error('El numero de serie ya pertenece a otro paciente');
        }
        await pool.query(
            `UPDATE dispositivo_sensor
             SET activo = TRUE, fecha_desactivacion = NULL, es_simulado = TRUE
             WHERE sensor_id = $1`,
            [existing.rows[0].sensor_id]
        );
        return existing.rows[0].sensor_id;
    }

    const created = await pool.query(
        `INSERT INTO dispositivo_sensor
            (paciente_id, numero_serie, modelo, fecha_activacion, activo, es_simulado)
         VALUES ($1, $2, 'Simulador INSULIX', CURRENT_TIMESTAMP, TRUE, TRUE)
         RETURNING sensor_id`,
        [patientId, serialNumber]
    );
    return created.rows[0].sensor_id;
};

const generateReading = (date: Date): number => {
    const target = baseGlucose + scenarioOffset() + mealEffect(date);
    currentGlucose += (target - currentGlucose) * 0.16 + randomNormal() * 2.4;
    currentGlucose = Math.min(350, Math.max(40, currentGlucose));
    return Math.round(currentGlucose * 10) / 10;
};

const insertReading = async (): Promise<void> => {
    const measuredAt = new Date();
    const glucose = generateReading(measuredAt);
    await pool.query(
        `INSERT INTO historial_glucosa (sensor_id, valor_mgdl, fecha_hora)
         VALUES ($1, $2, $3)
         ON CONFLICT (sensor_id, fecha_hora) DO NOTHING`,
        [sensorId, glucose, measuredAt.toISOString()]
    );
    console.log(`[${measuredAt.toISOString()}] ${glucose.toFixed(1)} mg/dL (${scenario})`);
};

const stop = async (): Promise<void> => {
    if (stopping) return;
    stopping = true;
    console.log('Stopping glucose simulator...');
    await pool.end();
    process.exit(0);
};

const run = async (): Promise<void> => {
    if (!patientId) {
        throw new Error('Define SIM_PATIENT_ID con el Firebase UID del paciente');
    }
    if (!serialNumber || serialNumber.length > 50) {
        throw new Error('SIM_SENSOR_SERIAL debe contener entre 1 y 50 caracteres');
    }
    if (!Number.isFinite(intervalMs) || intervalMs < 1_000) {
        throw new Error('SIM_INTERVAL_MS debe ser un numero igual o mayor a 1000');
    }
    if (!Number.isFinite(baseGlucose) || baseGlucose < 60 || baseGlucose > 250) {
        throw new Error('SIM_BASE_MGDL debe estar entre 60 y 250');
    }
    if (!validScenarios.includes(scenario)) {
        throw new Error('SIM_SCENARIO debe ser normal, high o low');
    }

    sensorId = await ensureSensor();
    console.log(`Synthetic sensor ${serialNumber} started for patient ${patientId}`);
    console.log(`Interval: ${intervalMs} ms | Scenario: ${scenario}`);
    console.log('These readings are marked as simulated and must not be treated as clinical data.');

    await insertReading();
    const timer = setInterval(() => {
        void insertReading().catch(async (error) => {
            console.error('Unable to insert simulated reading:', error);
            clearInterval(timer);
            await stop();
        });
    }, intervalMs);

    process.on('SIGINT', () => {
        clearInterval(timer);
        void stop();
    });
    process.on('SIGTERM', () => {
        clearInterval(timer);
        void stop();
    });
};

void run().catch(async (error) => {
    console.error('Glucose simulator failed:', error.message);
    await pool.end();
    process.exit(1);
});
