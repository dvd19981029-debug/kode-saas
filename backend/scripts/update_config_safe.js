const { db } = require('../src/config/firebase');

async function run() {
    if (!db) {
        console.error("No se pudo obtener la base de datos Firestore.");
        process.exit(1);
    }

    console.log("Iniciando post-procesamiento SEGURO y actualización de configuraciones...");

    // 1. Set user-defined configuration settings
    console.log("\n1. Guardando configuraciones del sistema KODE SaaS...");
    try {
        await db.collection('config').doc('settings').set({
            monthly_sales_goal: 15000.0,
            c807_username: "kode_xpress",
            c807_password: "password123",
            facturallama_api_key: "test_sk_45b8180f-9dab-44d5-9575-ba1487c73ed1",
            c807_simulado: true
        }, { merge: true });
        console.log("¡Configuraciones de meta ($15,000) y FacturaLlama API Key guardadas!");
    } catch(err) {
        console.error("Error al guardar config:", err.message);
    }

    // 2. Update employee commissions to 5.0%
    console.log("\n2. Configurando comisión inicial del 5% para los vendedores...");
    try {
        const employeesSnap = await db.collection('employees').get();
        const empBatch = db.batch();
        employeesSnap.forEach(doc => {
            empBatch.update(doc.ref, { comision_porcentaje: 5.0 });
        });
        await empBatch.commit();
        console.log("¡Comisiones de vendedores actualizadas al 5%!");
    } catch(err) {
        console.error("Error al actualizar comisiones de empleados:", err.message);
    }

    // 3. Calculate and update order total amounts (using set with merge: true)
    console.log("\n3. Calculando montos totales de pedidos desde 'order_details'...");
    try {
        const orderDetails = await db.collection('order_details').get();
        const orderTotals = {};
        orderDetails.forEach(doc => {
            const d = doc.data();
            if (d.pedido_id && d.precio) {
                orderTotals[d.pedido_id] = (orderTotals[d.pedido_id] || 0.0) + d.precio;
            }
        });
        console.log(`Se calcularon totales para ${Object.keys(orderTotals).length} pedidos.`);

        let ordersBatch = db.batch();
        let orderCount = 0;
        let totalUpdated = 0;
        
        for (const [orderId, total] of Object.entries(orderTotals)) {
            const orderRef = db.collection('orders').doc(orderId);
            ordersBatch.set(orderRef, { monto_total: total, monto_cobrar: total }, { merge: true });
            orderCount++;
            totalUpdated++;
            
            if (orderCount >= 200) { // Smaller batches are safer
                console.log(`...Comprometiendo lote de ${orderCount} pedidos (Total hasta ahora: ${totalUpdated})...`);
                await ordersBatch.commit();
                console.log(`...Lote comprometido exitosamente.`);
                ordersBatch = db.batch();
                orderCount = 0;
            }
        }
        
        if (orderCount > 0) {
            console.log(`...Comprometiendo último lote de ${orderCount} pedidos...`);
            await ordersBatch.commit();
            console.log(`...Último lote comprometido exitosamente.`);
        }
        console.log(`¡Cálculo de montos totales finalizado! Total de pedidos actualizados: ${totalUpdated}`);
    } catch(err) {
        console.error("Error al actualizar montos de pedidos:", err.message);
    }

    console.log("\n¡Post-procesamiento y configuración rápidas finalizadas con éxito!");
    process.exit(0);
}

run();
