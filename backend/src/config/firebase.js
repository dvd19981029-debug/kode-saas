const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let db = null;

try {
    let serviceAccount = null;

    // Check service account json path in environment variables
    const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const defaultSaPath = '/Users/luis/Downloads/kode-scents-firebase-adminsdk-fbsvc-24b9b8f8ed.json';

    if (saPath && fs.existsSync(saPath)) {
        serviceAccount = require(saPath);
        console.log(`Cargando cuenta de servicio desde la ruta del .env: ${saPath}`);
    } else if (fs.existsSync(defaultSaPath)) {
        serviceAccount = require(defaultSaPath);
        console.log(`Cargando cuenta de servicio desde la ruta por defecto: ${defaultSaPath}`);
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log("Cargando cuenta de servicio desde variable de entorno FIREBASE_SERVICE_ACCOUNT.");
    }

    if (serviceAccount) {
        const app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = getFirestore(app);
        console.log("Firebase Admin SDK inicializado exitosamente.");
    } else {
        // Fallback to default credentials
        const app = admin.initializeApp();
        db = getFirestore(app);
        console.log("Firebase Admin SDK inicializado con credenciales por defecto.");
    }
} catch (error) {
    console.error("Error al inicializar Firebase Admin SDK:", error.message);
}

module.exports = { admin, db };
