const https = require('https');
const { db } = require('../config/firebase');

exports.generateGuia = async (req, res) => {
    try {
        const { id } = req.params; // Order ID
        
        // Fetch order details
        const orderRef = db.collection('orders').doc(id);
        const orderDoc = await orderRef.get();
        if (!orderDoc.exists) {
            return res.status(404).json({ error: "Pedido no encontrado" });
        }
        const orderData = orderDoc.data();
        
        // Fetch client details
        let clientName = orderData.cliente_id;
        let clientEmail = orderData.correo || 'luisundae@gmail.com';
        let clientAddress = orderData.direccion || '';
        let clientPhone = orderData.telefono || '';
        
        if (orderData.cliente_id) {
            const clientDoc = await db.collection('clients').doc(orderData.cliente_id).get();
            if (clientDoc.exists) {
                const client = clientDoc.data();
                clientName = client.nombre || clientName;
                clientEmail = client.correo || clientEmail;
                clientAddress = client.direccion || clientAddress;
                clientPhone = client.telefono || clientPhone;
            }
        }

        // Calculate tomorrow's collection date
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        const hours = String(tomorrow.getHours()).padStart(2, '0');
        const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
        const recolectaFecha = `${year}-${month}-${day} ${hours}:${minutes}`;

        // Resolve C807 departments and municipalities
        // Depto/municipio ids must be numbers
        const deptoId = orderData.depto_id ? parseInt(orderData.depto_id) : 11; // 11 = San Salvador
        const municipioId = orderData.municipio_id ? parseInt(orderData.municipio_id) : 194; // 194 = San Salvador centro/metro

        const montoCobrar = parseFloat(orderData.monto_cobrar) || 0.0;
        const tipoServicio = montoCobrar > 0 ? "CCE" : "SER";

        // Build Payload
        const c807Payload = {
            recolecta_fecha: recolectaFecha,
            recolecta_comentario: "Recolección solicitada desde App",
            tipo_entrega: "NRML",
            guias: [
                {
                    orden: id,
                    nombre: clientName,
                    direccion: clientAddress,
                    telefono: clientPhone,
                    correo: clientEmail,
                    tipo_servicio: tipoServicio,
                    monto_cce: montoCobrar,
                    departamento_id: deptoId,
                    municipio_id: municipioId,
                    liquidacion_documentos: false,
                    seguro: false,
                    detalle: [
                        {
                            peso: 5,
                            contenido: "Fragancias KODE El Salvador",
                            unidad_medida: "LB"
                        }
                    ]
                }
            ]
        };

        // Check if settings has simulated mode
        const configDoc = await db.collection('config').doc('settings').get();
        const config = configDoc.exists ? configDoc.data() : {};
        const isSimulated = config.c807_simulado !== false; // defaults to true if not explicitly false (e.g., during tests or if missing)

        if (isSimulated) {
            // Return Simulated C807 response
            const trackingNum = `KODE-${Math.floor(Math.random()*90000 + 10000)}-${year}${month}${day}`;
            const linkRastreo = `https://app.c807.com/guia.php/seguimiento/${trackingNum}`;
            
            await orderRef.update({
                estado: 'Enviado',
                estado_guia: 'Generada',
                proveedor_envio: 'C807 Express',
                num_rastreo: trackingNum,
                link_rastreo: linkRastreo,
                estado_c807: 'Enviado'
            });

            return res.json({
                success: true,
                simulated: true,
                recolecta: `RECOLECTA-${year}${month}${day}-${Math.floor(Math.random()*1000)}`,
                guias: [
                    {
                        orden: id,
                        guia: trackingNum,
                        seguimiento: linkRastreo,
                        entrega_min: `${year}-${month}-${day} 08:00:00`,
                        entrega_max: `${year}-${month}-${day} 18:00:00`
                    }
                ]
            });
        }

        // Retrieve C807 Token dynamically using Basic Auth (matching the Google Apps Script bridge credentials)
        let basicAuth = "Basic YWRtaW5AbHVpc2VnbToyMDI2"; // Default fallback basic auth token
        if (config.c807_username && config.c807_password) {
            const credentials = `${config.c807_username}:${config.c807_password}`;
            basicAuth = `Basic ${Buffer.from(credentials).toString('base64')}`;
        }

        let c807Token = null;
        try {
            c807Token = await new Promise((resolve, reject) => {
                const options = {
                    method: 'POST',
                    headers: {
                        'Authorization': basicAuth,
                        'Content-Length': 0
                    }
                };
                const tokenReq = https.request('https://app.c807.com/admin.php/sesion/get_token', options, (tokenRes) => {
                    let body = '';
                    tokenRes.on('data', chunk => body += chunk);
                    tokenRes.on('end', () => {
                        if (tokenRes.statusCode !== 200) {
                            return reject(new Error(`Status Code ${tokenRes.statusCode} - ${body}`));
                        }
                        try {
                            const json = JSON.parse(body);
                            const token = json.access_token || (json.data && json.data.access_token) || json.token;
                            if (!token) {
                                return reject(new Error(`No token found in body: ${body}`));
                            }
                            resolve(token);
                        } catch (e) {
                            reject(new Error(`JSON Parse error: ${e.message}`));
                        }
                    });
                });
                tokenReq.on('error', (err) => reject(new Error(`Connection failure: ${err.message}`)));
                tokenReq.end();
            });
        } catch (authErr) {
            console.error("C807 Token Retrieval Error:", authErr);
            return res.status(401).json({ error: "Error de autenticación con C807 (Obtención de Token)", details: authErr.message });
        }

        // Send to real C807 Express API
        const targetUrl = 'https://app.c807.com/guia.php/api/set_registro';
        const payloadString = JSON.stringify(c807Payload);
        
        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${c807Token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payloadString)
            }
        };

        const proxyReq = https.request(targetUrl, options, (proxyRes) => {
            let proxyBody = '';
            proxyRes.on('data', chunk => proxyBody += chunk);
            proxyRes.on('end', async () => {
                try {
                    const responseData = JSON.parse(proxyBody);
                    if (proxyRes.statusCode === 200 && responseData.guias && responseData.guias.length > 0) {
                        const guideInfo = responseData.guias[0];
                        await orderRef.update({
                            estado: 'Enviado',
                            estado_guia: 'Generada',
                            proveedor_envio: 'C807 Express',
                            num_rastreo: guideInfo.guia,
                            link_rastreo: guideInfo.seguimiento || `https://app.c807.com/guia.php/seguimiento/${guideInfo.guia}`,
                            estado_c807: 'Enviado'
                        });
                    }
                    res.status(proxyRes.statusCode).json(responseData);
                } catch (e) {
                    res.status(proxyRes.statusCode).send(proxyBody);
                }
            });
        });

        proxyReq.on('error', (err) => {
            console.error("C807 Connection Error:", err);
            res.status(502).json({ error: "Error de conexión con C807", details: err.message });
        });

        proxyReq.write(payloadString);
        proxyReq.end();

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.receiveIncomingC807 = async (req, res) => {
    try {
        console.log("C807 Webhook Received Payload:", JSON.stringify(req.body));
        const { guia, codigo, estatus, observaciones, razon, pod } = req.body;
        
        // Log webhook payload for auditing
        try {
            await db.collection('dte_api_logs').add({
                provider: 'C807',
                type: 'Webhook',
                trackingNumber: guia || null,
                payload: req.body,
                timestamp: new Date().toISOString()
            });
        } catch (logErr) {
            console.error("Error saving C807 webhook log:", logErr);
        }

        if (!guia) {
            return res.status(400).json({ error: "No se proporcionó el número de guía" });
        }
        
        // Find order with this guide number (num_rastreo)
        const ordersRef = db.collection('orders');
        const snapshot = await ordersRef.where('num_rastreo', '==', guia).get();
        
        if (snapshot.empty) {
            console.warn(`No order found matching tracking number: ${guia}`);
            // Return 200 to acknowledge receipt so C807 doesn't keep retrying
            return res.json({ success: false, message: "No se encontró pedido para esta guía" });
        }
        
        // We'll update all orders that might share this guide number (normally just one)
        const updatePromises = [];
        const orderIds = [];
        
        snapshot.forEach(doc => {
            const orderId = doc.id;
            orderIds.push(orderId);
            const orderRef = ordersRef.doc(orderId);
            
            const updateData = {
                estado_c807: estatus || "",
                codigo_estado_c807: codigo || "",
                observaciones_c807: observaciones || "",
                fecha_actualizacion_c807: new Date().toISOString()
            };
            
            // Map status codes
            // Code "15" is "Llegó a su destino" (Delivered)
            if (codigo === "15" || estatus === "Llegó a su destino") {
                updateData.estado = 'Entregado';
                updateData.fecha_entrega = new Date().toISOString();
            }
            
            // If there's an issue/non-delivery reason
            if (razon && (typeof razon === 'string' ? razon : razon.descripcion)) {
                updateData.razon_no_entrega = typeof razon === 'string' ? razon : razon.descripcion;
            }
            
            // If there's proof of delivery (POD)
            if (pod && pod.length > 0) {
                updateData.pod_c807 = pod;
            }
            
            updatePromises.push(orderRef.update(updateData));
        });
        
        await Promise.all(updatePromises);
        
        console.log(`Successfully updated order(s) ${orderIds.join(', ')} status to C807 status: ${estatus}`);
        res.json({ success: true, message: `Pedidos ${orderIds.join(', ')} actualizados correctamente` });
    } catch (err) {
        console.error("Error processing C807 webhook:", err);
        res.status(500).json({ error: err.message });
    }
};
