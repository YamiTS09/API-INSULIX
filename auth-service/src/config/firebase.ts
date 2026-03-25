import * as admin from 'firebase-admin';
import path from 'path';

// Ruta al JSON con credenciales de la cuenta de servicio de Firebase
const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath)
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Firebase Admin initialization error', error);
}

export default admin;
