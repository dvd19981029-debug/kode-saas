const { db } = require('../src/config/firebase');

async function run() {
    if (!db) {
        console.error("No se pudo obtener la base de datos Firestore.");
        process.exit(1);
    }

    console.log("Iniciando post-procesamiento rápido y actualización de configuraciones...");

    // 1. Calculate and update order total amounts
    console.log("1. Calculando montos totales de pedidos desde 'order_details'...");
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
        ordersBatch.update(orderRef, { monto_total: total, monto_cobrar: total });
        orderCount++;
        totalUpdated++;
        if (orderCount >= 500) {
            await ordersBatch.commit();
            ordersBatch = db.batch();
            orderCount = 0;
            console.log(`...Actualizados ${totalUpdated} pedidos.`);
        }
    }
    if (orderCount > 0) {
        await ordersBatch.commit();
        console.log(`...Actualizados ${totalUpdated} pedidos. ¡Completado!`);
    }

    // 2. Set user-defined configuration settings
    console.log("\n2. Guardando configuraciones del sistema KODE SaaS...");
    await db.collection('config').doc('settings').set({
        monthly_sales_goal: 15000.0,
        c807_username: "kode_xpress",
        c807_password: "password123",
        facturallama_api_key: "test_sk_45b8180f-9dab-44d5-9575-ba1487c73ed1",
        c807_simulado: true // Use simulation mode for C807 by default
    }, { merge: true });
    console.log("¡Configuraciones de meta ($15,000) y FacturaLlama API Key guardadas!");

    // 3. Update employee commissions to 5.0%
    console.log("\n3. Configurando comisión inicial del 5% para los vendedores...");
    const employeesSnap = await db.collection('employees').get();
    const empBatch = db.batch();
    employeesSnap.forEach(doc => {
        empBatch.update(doc.ref, { comision_porcentaje: 5.0 });
    });
    await empBatch.commit();
    console.log("¡Comisiones de vendedores actualizadas al 5%!");

    console.log("\n¡Post-procesamiento y configuración rápidas finalizadas con éxito!");
    process.exit(0);
}

run();
