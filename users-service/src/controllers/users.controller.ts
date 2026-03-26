import { Request, Response } from 'express';
import { pool } from '../models/db';

export const registerMedico = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        // La contraseña se maneja 100% en Firebase, el front nos pasa el UID resultante
        const { 
            uid, email, 
            nombre, apellido_paterno, apellido_materno, 
            cedula_profesional, especialidad, hospital, 
            telefono 
        } = req.body;
        
        let foto_url = req.body.foto_url;
        if (req.file && req.file.path) {
            foto_url = req.file.path;
        }

        if (!foto_url) {
            foto_url = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}+${encodeURIComponent(apellido_paterno)}&background=0D8ABC&color=fff&size=500`;
        }
        
        await client.query('BEGIN');
        
        // 1. Obtener ID del rol MEDICO
        const roleRes = await client.query("SELECT rol_id FROM roles WHERE nombre_rol = 'MEDICO'");
        if (roleRes.rows.length === 0) throw new Error("Role MEDICO not found in DB");
        const rol_id = roleRes.rows[0].rol_id;

        // 2. Insertar en tabla usuario usando el UID de Firebase
        const userRes = await client.query(
            'INSERT INTO usuario (usuario_id, rol_id, email, nombre, apellido_paterno, apellido_materno) VALUES ($1, $2, $3, $4, $5, $6) RETURNING usuario_id',
            [uid, rol_id, email, nombre, apellido_paterno, apellido_materno]
        );
        const usuario_id = userRes.rows[0].usuario_id;
        
        // 3. Insertar detalle del médico
        const medicoRes = await client.query(
            `INSERT INTO detalle_medico 
            (medico_id, cedula_profesional, especialidad, hospital, telefono, foto_url) 
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [usuario_id, cedula_profesional, especialidad, hospital, telefono, foto_url]
        );
        console.log("Intentando guardar médico en Postgres con UID:", uid);
        
        await client.query('COMMIT');
        res.status(201).json({ usuario_id, email, detalle: medicoRes.rows[0] });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error registrando médico', details: error.message || error });
    } finally {
        client.release();
    }
    
};

export const getMedicos = async (req: Request, res: Response) => {
    try {
        const query = `
            SELECT u.nombre, u.apellido_paterno, u.apellido_materno, u.email, u.fecha_registro, u.is_active, m.* 
            FROM detalle_medico m 
            JOIN usuario u ON m.medico_id = u.usuario_id 
            WHERE u.is_active = true
        `;
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo lista de médicos', details: error });
    }
};

export const getMedicoById = async (req: Request, res: Response) => {
     try {
         const { id } = req.params; // ID de Firebase (VARCHAR)
          const result = await pool.query(`
            SELECT u.nombre, u.apellido_paterno, u.apellido_materno, u.email, u.fecha_registro, u.is_active, m.* 
            FROM detalle_medico m 
            JOIN usuario u ON m.medico_id = u.usuario_id 
            WHERE m.medico_id = $1 AND u.is_active = true
          `, [id]);
         
         if (result.rows.length === 0) {
              return res.status(404).json({ message: 'Médico no encontrado' });
         }
         res.status(200).json(result.rows[0]);
     } catch (error) {
         res.status(500).json({ error: 'Error obteniendo al médico details:', details: error });
     }
};

export const updateMedico = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const { 
            nombre, apellido_paterno, apellido_materno, 
            cedula_profesional, especialidad, hospital, telefono 
        } = req.body;

        let foto_url = req.body.foto_url;
        if (req.file && req.file.path) {
            foto_url = req.file.path;
        }

        await client.query('BEGIN');

        // 1. Actualizar nombres en usuario
        await client.query(
            `UPDATE usuario SET 
                nombre = COALESCE($1, nombre), 
                apellido_paterno = COALESCE($2, apellido_paterno), 
                apellido_materno = COALESCE($3, apellido_materno)
             WHERE usuario_id = $4`,
            [nombre, apellido_paterno, apellido_materno, id]
        );

        // 2. Actualizar resto en detalle_medico
        const result = await client.query(
            `UPDATE detalle_medico SET 
                cedula_profesional = COALESCE($1, cedula_profesional), 
                especialidad = COALESCE($2, especialidad), 
                hospital = COALESCE($3, hospital), 
                telefono = COALESCE($4, telefono), 
                foto_url = COALESCE($5, foto_url)
             WHERE medico_id = $6 RETURNING *`,
            [cedula_profesional, especialidad, hospital, telefono, foto_url, id]
        );
         
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Médico no encontrado' });
        }

        await client.query('COMMIT');
        res.status(200).json(result.rows[0]);
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error actualizando al médico', details: error.message });
    } finally {
        client.release();
    }
};

export const createPaciente = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const { 
            uid, email, medico_id, 
            nombre, apellido_paterno, apellido_materno, 
            edad, fecha_nacimiento, sexo, tipo_diabetes, 
            glucosa_base, peso, estatura, telefono, direccion
        } = req.body;
        
        let foto_url = req.body.foto_url;
        if (req.file && req.file.path) {
            foto_url = req.file.path;
        }

        if (!foto_url) {
            foto_url = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}+${encodeURIComponent(apellido_paterno)}&background=0D8ABC&color=fff&size=500`;
        }
        
        await client.query('BEGIN');
        
        // 1. Obtener ID del rol PACIENTE
        const roleRes = await client.query("SELECT rol_id FROM roles WHERE nombre_rol = 'PACIENTE'");
        if (roleRes.rows.length === 0) throw new Error("Role PACIENTE not found in DB");
        const rol_id = roleRes.rows[0].rol_id;

        // 2. Insertar en usuario
        const userRes = await client.query(
            'INSERT INTO usuario (usuario_id, rol_id, email, nombre, apellido_paterno, apellido_materno) VALUES ($1, $2, $3, $4, $5, $6) RETURNING usuario_id',
            [uid, rol_id, email, nombre, apellido_paterno, apellido_materno]
        );
        const usuario_id = userRes.rows[0].usuario_id;
        
        // 3. Insertar detalle paciente
        const pacienteRes = await client.query(
            `INSERT INTO detalle_paciente 
            (paciente_id, medico_id, edad, fecha_nacimiento, sexo, tipo_diabetes, glucosa_base, peso, estatura, telefono, direccion, foto_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
            [usuario_id, medico_id, edad, fecha_nacimiento, sexo, tipo_diabetes, glucosa_base, peso, estatura, telefono, direccion, foto_url]
        );
        
        await client.query('COMMIT');
        res.status(201).json({ usuario_id, email, detalle: pacienteRes.rows[0] });
    } catch (error: any) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Error agregando paciente', details: error.message || error });
    } finally {
        client.release();
    }
};

export const getPacientes = async (req: Request, res: Response) => {
    try {
        const medico_id = req.query.medico_id;
        
        let query = `
            SELECT u.nombre, u.apellido_paterno, u.apellido_materno, u.email, u.fecha_registro, u.is_active, p.* 
            FROM detalle_paciente p 
            JOIN usuario u ON p.paciente_id = u.usuario_id 
            WHERE u.is_active = true
        `;
        let params: any[] = [];
        
        if (medico_id) {
            query += ' AND p.medico_id = $1';
            params.push(medico_id);
        }
        
        const result = await pool.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo pacientes', details: error });
    }
};

export const getPacienteById = async (req: Request, res: Response) => {
     try {
         const { id } = req.params; // ID de Firebase (VARCHAR)
          const result = await pool.query(`
            SELECT u.nombre, u.apellido_paterno, u.apellido_materno, u.email, u.fecha_registro, u.is_active, p.* 
            FROM detalle_paciente p 
            JOIN usuario u ON p.paciente_id = u.usuario_id 
            WHERE p.paciente_id = $1 AND u.is_active = true
          `, [id]);
         
         if (result.rows.length === 0) {
              return res.status(404).json({ message: 'Paciente no encontrado' });
         }
         res.status(200).json(result.rows[0]);
     } catch (error) {
         res.status(500).json({ error: 'Error obteniendo al paciente' });
     }
};

export const updatePaciente = async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
         const { id } = req.params;
         const { 
             nombre, apellido_paterno, apellido_materno, 
             edad, fecha_nacimiento, sexo, tipo_diabetes, 
             glucosa_base, peso, estatura, telefono, direccion 
         } = req.body;

         let foto_url = req.body.foto_url;
         if (req.file && req.file.path) {
             foto_url = req.file.path;
         }

         await client.query('BEGIN');

         // 1. Actualizar nombres en usuario
         await client.query(
            `UPDATE usuario SET 
                nombre = COALESCE($1, nombre), 
                apellido_paterno = COALESCE($2, apellido_paterno), 
                apellido_materno = COALESCE($3, apellido_materno)
             WHERE usuario_id = $4`,
            [nombre, apellido_paterno, apellido_materno, id]
         );

         // 2. Actualizar resto en detalle_paciente
         const result = await client.query(
            `UPDATE detalle_paciente SET 
                edad = COALESCE($1, edad), 
                fecha_nacimiento = COALESCE($2, fecha_nacimiento), 
                sexo = COALESCE($3, sexo), 
                tipo_diabetes = COALESCE($4, tipo_diabetes), 
                glucosa_base = COALESCE($5, glucosa_base),
                peso = COALESCE($6, peso),
                estatura = COALESCE($7, estatura),
                telefono = COALESCE($8, telefono),
                direccion = COALESCE($9, direccion),
                foto_url = COALESCE($10, foto_url)
             WHERE paciente_id = $11 RETURNING *`,
            [edad, fecha_nacimiento, sexo, tipo_diabetes, glucosa_base, peso, estatura, telefono, direccion, foto_url, id]
         );
         
         if (result.rows.length === 0) {
              await client.query('ROLLBACK');
              return res.status(404).json({ message: 'Paciente no encontrado' });
         }

         await client.query('COMMIT');
         res.status(200).json(result.rows[0]);
     } catch (error: any) {
         await client.query('ROLLBACK');
         res.status(500).json({ error: 'Error actualizando al paciente', details: error.message });
     } finally {
         client.release();
     }
};

export const deletePaciente = async (req: Request, res: Response) => {
    try {
         const { id } = req.params;
         // 1. Desactivación lógica en Postgres
         const result = await pool.query(
            'UPDATE usuario SET is_active = false WHERE usuario_id = $1 RETURNING *',
            [id]
         );
         
         if (result.rows.length === 0) {
              return res.status(404).json({ message: 'Paciente no encontrado' });
         }

         // 2. Eliminación física en Firebase Auth mediante llamada al auth-service
         try {
             // Utiliza fetch nativo (disponible en Node 18+)
             const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000';
             const response = await fetch(`${authServiceUrl}/firebase/${id}`, {
                 method: 'DELETE',
                 headers: {
                     'Content-Type': 'application/json',
                     'Authorization': req.headers.authorization || ''
                 }
             });
             
             if (!response.ok) {
                 console.warn(`[Warnings] Firebase user deletion response: ${response.status} ${response.statusText}`);
             } else {
                 console.log(`Firebase user ${id} deleted successfully.`);
             }
         } catch (firebaseErr: any) {
             console.error('Error contacting auth-service to delete Firebase user:', firebaseErr.message);
         }

         res.status(200).json({ message: 'Paciente desactivado localmente y eliminado de Firebase', usuario: result.rows[0] });
     } catch (error) {
         res.status(500).json({ error: 'Error borrando al paciente' });
     }
};
