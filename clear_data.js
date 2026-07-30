const { db } = require('./backend/src/config/firebase');

async function deleteCollection(collectionPath, batchSize = 100) {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.limit(batchSize);

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve, reject);
    });
}

async function deleteQueryBatch(query, resolve, reject) {
    try {
        const snapshot = await query.get();

        const batchSize = snapshot.size;
        if (batchSize === 0) {
            resolve();
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`  Deleted batch of ${batchSize} documents.`);

        process.nextTick(() => {
            deleteQueryBatch(query, resolve, reject);
        });
    } catch (err) {
        reject(err);
    }
}

async function clearAll() {
    console.log("Iniciando limpieza de la base de datos Firestore...");
    const collectionsToDelete = ['orders', 'order_details', 'payments', 'clients', 'dte_api_logs'];
    
    for (const col of collectionsToDelete) {
        console.log(`Vaciando colección: ${col}...`);
        try {
            await deleteCollection(col);
            console.log(`✅ Colección '${col}' vaciada con éxito.`);
        } catch (err) {
            console.error(`❌ Error al vaciar la colección '${col}':`, err.message);
        }
    }
    console.log("¡Limpieza de base de datos finalizada!");
    process.exit(0);
}

clearAll();
