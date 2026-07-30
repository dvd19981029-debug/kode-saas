const admin = require('firebase-admin');
const XLSX = require('xlsx');
const path = require('path');
const { db } = require('../src/config/firebase');

async function seed() {
    if (!db) {
        console.error("No se pudo obtener la base de datos Firestore. Verifica la configuración de Firebase.");
        process.exit(1);
    }

    const excelPath = '/Users/luis/Downloads/BD KODE.xlsx';
    console.log(`Abriendo archivo excel en: ${excelPath}`);
    
    let workbook;
    try {
        workbook = XLSX.readFile(excelPath, { cellDates: true });
    } catch (err) {
        console.error("Error al leer el archivo Excel:", err.message);
        process.exit(1);
    }

    // Helper to format values
    const cleanVal = (val) => {
        if (val === undefined || val === null) return null;
        if (typeof val === 'string') return val.trim();
        return val;
    };

    // Helper to format ID
    const cleanId = (val) => {
        if (val === undefined || val === null) return null;
        if (typeof val === 'number') return Math.floor(val).toString();
        return String(val).trim();
    };

    const importSheet = async (sheetName, collectionName, idKey, mapFn) => {
        console.log(`\nImportando hoja [${sheetName}] a la colección [${collectionName}]...`);
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
            console.log(`La hoja [${sheetName}] no existe en el archivo. Saltando...`);
            return;
        }

        const data = XLSX.utils.sheet_to_json(sheet, { defval: null });
        console.log(`Se encontraron ${data.length} filas en la hoja [${sheetName}].`);

        const batchLimit = 500;
        let batch = db.batch();
        let count = 0;
        let totalImported = 0;

        for (const row of data) {
            const docData = mapFn(row);
            if (!docData) continue;

            const id = cleanId(docData[idKey] || row[idKey]);
            if (!id) {
                // If no id exists, skip or auto-generate
                continue;
            }

            const docRef = db.collection(collectionName).doc(id);
            batch.set(docRef, docData, { merge: true });
            count++;
            totalImported++;

            if (count >= batchLimit) {
                await batch.commit();
                console.log(`...Guardadas ${totalImported} filas.`);
                batch = db.batch();
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
            console.log(`...Guardadas ${totalImported} filas. ¡Completado!`);
        }
    };

    // 1. Deptos
    await importSheet('Deptos', 'departments', 'id_depto', (row) => ({
        id: cleanId(row['id_depto']),
        name: cleanVal(row['Nombre_depto']),
        code: cleanVal(row['cod_depto']),
        depto_mh: cleanVal(row['Depto MH'])
    }));

    // 2. Municipios
    await importSheet('Municipios', 'municipalities', 'id_municipio', (row) => ({
        id: cleanId(row['id_municipio']),
        name: cleanVal(row['Nombre_municipio']),
        depto_id: cleanId(row['id_depto']),
        municipio_mh: cleanVal(row['Municipio MH']),
        name_mh: cleanVal(row['Nombre Mh'])
    }));

    // 3. Catálgo
    await importSheet('Catálgo', 'catalog', 'Kodigo', (row) => {
        const id = cleanId(row['Kodigo']);
        if (!id) return null;
        return {
            id,
            contratipo: cleanVal(row['Contratipo']),
            marca: cleanVal(row['Marca']),
            genero: cleanVal(row['Genero']),
            estado: cleanVal(row['Estado']) || 'Activa',
            precio: parseFloat(row['Precio']) || 20.0
        };
    });

    // 4. Clientes
    await importSheet('Clientes', 'clients', 'Id Cliente', (row) => {
        const id = cleanVal(row['Id Cliente']);
        if (!id) return null;
        return {
            id,
            telefono: cleanVal(row['Teléfono Wa']),
            nombre: cleanVal(row['Nombre completo']),
            direccion: cleanVal(row['Direccion']),
            punto_referencia: cleanVal(row['Punto de Referencia']),
            contacto_adicional: cleanVal(row['Contacto Adicional']),
            correo: cleanVal(row['Correo']),
            depto_id: cleanId(row['Depto']),
            municipio_id: cleanId(row['Municipio']),
            usuario: cleanVal(row['Usuario']),
            tipo_doc: cleanVal(row['Tipo Doc']),
            num_doc: cleanVal(row['Num Doc'])
        };
    });

    // 5. Empleado
    await importSheet('Empleado', 'employees', 'ID_Empleado', (row) => {
        const id = cleanId(row['ID_Empleado']);
        if (!id) return null;
        return {
            id,
            nombre: cleanVal(row['Nombre ']),
            correo: cleanVal(row['Correo']),
            area: cleanVal(row['Area']),
            comision_porcentaje: 5.0 // Default commission of 5%
        };
    });

    // 6. Auth
    await importSheet('Auth', 'auth', 'ID_Auth', (row) => {
        const id = cleanVal(row['ID_Auth']);
        if (!id) return null;
        return {
            id,
            botones: cleanVal(row['Botones']),
            fecha_token: row['Fecha Token'] ? new Date(row['Fecha Token']).toISOString() : null,
            estado_auth: cleanVal(row['Estado_Auth']),
            token_1: cleanVal(row['Token 1']),
            fecha_expiracion: row['Fecha_Expiracion'] ? new Date(row['Fecha_Expiracion']).toISOString() : null
        };
    });

    // 7. Pedidos
    await importSheet('Pedidos', 'orders', 'ID Pedido', (row) => {
        const id = cleanVal(row['ID Pedido']);
        if (!id) return null;
        return {
            id,
            estado: cleanVal(row['Estado']) || 'Registrado',
            fecha_pedido: row['Fecha Pedido'] ? new Date(row['Fecha Pedido']).toISOString() : new Date().toISOString(),
            cliente_id: cleanVal(row['Cliente']),
            telefono: cleanVal(row['Teléfono']),
            direccion: cleanVal(row['Direccion']),
            depto_id: cleanId(row['Depto']),
            municipio_id: cleanId(row['Municipio']),
            correo: cleanVal(row['Correo']),
            estado_guia: cleanVal(row['estado_guia']) || 'Pendiente',
            token_2: cleanVal(row['Token 2']),
            proveedor_envio: cleanVal(row['Proveedor de envío']),
            marca_temporal: cleanVal(row['Marca Temporal']),
            num_rastreo: cleanVal(row['Num Rastreo']),
            link_rastreo: cleanVal(row['Link Rastreo']),
            usuario: cleanVal(row['Usuario']),
            estado_fact: cleanVal(row['Estado Fact']) || 'Pendiente',
            id_fact: cleanVal(row['id Fact']),
            generationCode: cleanVal(row['generationCode']),
            controlNumber: cleanVal(row['controlNumber']),
            mhDteUrl: cleanVal(row['mhDteUrl']),
            estado_recibo: cleanVal(row['Estado Recibo']),
            recibo: cleanVal(row['Recibo ']),
            estado_envio: cleanVal(row['Estado envío']),
            qr: cleanVal(row['QR']),
            estado_c807: cleanVal(row['Estado C807']) || 'Pendiente',
            monto_total: 0.0, // calculated from details
            monto_cobrar: 0.0 // COD amount if applicable
        };
    });

    // 8. Detalle Pedido
    await importSheet('Detalle Pedido', 'order_details', 'ID_Detalle', (row) => {
        const id = cleanVal(row['ID_Detalle']);
        if (!id) return null;
        return {
            id,
            pedido_id: cleanVal(row['ID Pedido']),
            fecha_registro: row['Fecha Registro'] ? new Date(row['Fecha Registro']).toISOString() : new Date().toISOString(),
            kodigo: cleanId(row['Kodigo']),
            precio: parseFloat(row['Precio']) || 20.0,
            usuario: cleanVal(row['Usuario']),
            estado: cleanVal(row['Estado']) || 'Registrado',
            version: cleanVal(row['Version']) || 'Normal'
        };
    });

    // 9. Pagos
    await importSheet('Pagos', 'payments', 'ID Pago', (row) => {
        const id = cleanVal(row['ID Pago']);
        if (!id) return null;
        return {
            id,
            pedido_id: cleanVal(row['ID Pedido']),
            fecha_pago: row['Fecha Pago'] ? new Date(row['Fecha Pago']).toISOString() : new Date().toISOString(),
            monto_pago: parseFloat(row['Monto Pago']) || 0.0,
            metodo_pago: cleanVal(row['Metodo Pago']),
            num_doc_auto: cleanVal(row['Num Doc/Auto']),
            estado_pago: cleanVal(row['Estado Pago']) || 'Confirmado',
            user: cleanVal(row['User']),
            fecha_registro: row['Fecha Registro'] ? new Date(row['Fecha Registro']).toISOString() : null,
            observaciones: cleanVal(row['Observaciones ']),
            cliente: cleanVal(row['Cliente:'])
        };
    });

    // Post-processing to calculate order total costs
    console.log("\nPost-procesando montos de pedidos...");
    const orderDetails = await db.collection('order_details').get();
    const orderTotals = {};
    orderDetails.forEach(doc => {
        const d = doc.data();
        if (d.pedido_id && d.precio) {
            orderTotals[d.pedido_id] = (orderTotals[d.pedido_id] || 0.0) + d.precio;
        }
    });

    let ordersBatch = db.batch();
    let orderCount = 0;
    for (const [orderId, total] of Object.entries(orderTotals)) {
        const orderRef = db.collection('orders').doc(orderId);
        ordersBatch.update(orderRef, { monto_total: total, monto_cobrar: total }); // Default COD amount is order total for simplicity or custom logic
        orderCount++;
        if (orderCount >= 500) {
            await ordersBatch.commit();
            ordersBatch = db.batch();
            orderCount = 0;
        }
    }
    if (orderCount > 0) {
        await ordersBatch.commit();
    }
    console.log("¡Cálculo de montos totales de pedidos finalizado!");

    // Set configuration meta and sales goal
    console.log("\nGuardando configuración inicial...");
    await db.collection('config').doc('settings').set({
        monthly_sales_goal: 15000.0,
        c807_username: "kode_xpress", // Placeholder credentials
        c807_password: "password123",
        facturallama_api_key: "test_sk_45b8180f-9dab-44d5-9575-ba1487c73ed1"
    }, { merge: true });
    console.log("¡Configuración guardada!");

    console.log("\nMigration completed successfully.");
    process.exit(0);
}

seed();
