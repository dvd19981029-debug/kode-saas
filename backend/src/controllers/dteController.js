const https = require('https');
const { db } = require('../config/firebase');

async function saveDteLog(action, orderId, docType, requestPayload, responseStatus, responseBody, endpoint) {
    if (!db) return;
    try {
        let parsedResBody = responseBody;
        if (typeof responseBody === 'string') {
            try {
                parsedResBody = JSON.parse(responseBody);
            } catch (e) {
                // Keep as string
            }
        }

        await db.collection('dte_api_logs').add({
            action,
            orderId: orderId || 'desconocido',
            docType: docType || 'desconocido',
            endpoint: endpoint || '',
            requestPayload: requestPayload || null,
            responseStatus: responseStatus || 0,
            responseBody: parsedResBody || null,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error("Error saving DTE API Log:", err);
    }
}

exports.generateFactura = async (req, res) => {
    try {
        const { id } = req.params; // Order ID
        const { docType, clientDocType, clientDocNum, clientName, clientEmail } = req.body;
        
        // Fetch order details
        const orderDoc = await db.collection('orders').doc(id).get();
        if (!orderDoc.exists) {
            return res.status(404).json({ error: "Pedido no encontrado" });
        }
        const orderData = orderDoc.data();
        
        // Fetch order detail items
        const detailsSnap = await db.collection('order_details').where('pedido_id', '==', id).get();
        const items = [];
        detailsSnap.forEach(doc => items.push(doc.data()));

        // Resolve API key
        const configDoc = await db.collection('config').doc('settings').get();
        const config = configDoc.exists ? configDoc.data() : {};
        const apiKey = config.facturallama_api_key || process.env.FACTURALLAMA_API_KEY;

        const llamaDocType = (docType || 'fc').toLowerCase(); // fc = factura consumidor final, ccf = credito fiscal

        const crypto = require('crypto');
        const dtePayload = {
            id: crypto.randomUUID(),
            recipient: {
                name: clientName || orderData.cliente_id || "Consumidor Final",
                email: clientEmail || orderData.correo || "cliente@kodescents.com",
                address: {
                    department: String(orderData.depto_id || '11').padStart(2, '0'),
                    municipality: String(orderData.municipio_id || '15').padStart(2, '0'),
                    complement: (orderData.direccion || "San Salvador").substring(0, 200)
                },
                identificationDocument: {
                    type: clientDocType === "36" || String(clientDocType).toUpperCase() === "NIT" ? "NIT" : "DUI",
                    number: (clientDocNum || "00000000-0").replace(/\D/g, '')
                }
            },
            items: items.map((item, idx) => {
                const qty = 1;
                const price = parseFloat(item.precio) || 20.0;
                const unitPrice = parseFloat((price / 1.13).toFixed(4));
                
                return {
                    type: 'BIENES',
                    internalCode: String(item.kodigo || "000"),
                    description: item.contratipo || "Perfume Concentrado",
                    quantity: qty,
                    unitPrice: unitPrice,
                    saleType: 'GRAVADA'
                };
            }),
            paymentType: "CONTADO"
        };

        if (!apiKey || apiKey.startsWith('simulado_')) {
            // Simulated DTE Generation
            const genCode = "MOCK-DTE-" + Math.floor(Date.now() / 1000).toString() + "-" + Math.floor(Math.random()*10000);
            const ctrlNum = "DTE-" + (llamaDocType === 'ccf' ? '03' : '01') + "-M001P001-" + Math.floor(Math.random()*90000 + 10000);
            const seal = Math.floor(Math.random()*9000000).toString() + "-APPROVED-" + Math.floor(Math.random()*9000);
            const mhDteUrl = `https://admin.factura.gob.sv/consultaPublica?ambiente=01&codGen=${genCode}&fechaEmi=${new Date().toISOString().split('T')[0]}`;
            
            const mockRes = {
                success: true,
                simulated: true,
                code: "00",
                description: "DTE Simulado Exitosamente (Modo Simulado)",
                generationCode: genCode,
                controlNumber: ctrlNum,
                receptionSeal: seal,
                mhDteUrl: mhDteUrl
            };

            // Update order with DTE details
            await db.collection('orders').doc(id).update({
                estado_fact: 'Generada',
                id_fact: genCode,
                generationCode: genCode,
                controlNumber: ctrlNum,
                mhDteUrl: mhDteUrl
            });

            await saveDteLog("Emisión DTE (Simulado)", id, llamaDocType, dtePayload, 200, mockRes, "MOCK / SIMULADO");
            return res.json(mockRes);
        }

        // Live connection to FacturaLlama
        const targetUrl = `https://api.facturallama.com/dte/${llamaDocType}`;
        const payloadString = JSON.stringify(dtePayload);
        
        const options = {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'X-API-Version': '1',
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
                    let genCode = responseData.generationCode;
                    let ctrlNum = responseData.controlNumber;
                    let mhUrl = responseData.mhDteUrl;

                    // Decodificar signedDte si es necesario
                    if (!genCode && responseData.signedDte) {
                        try {
                            const jwtParts = responseData.signedDte.split('.');
                            if (jwtParts.length >= 2) {
                                const payloadBuf = Buffer.from(jwtParts[1], 'base64');
                                const dteObj = JSON.parse(payloadBuf.toString('utf8'));
                                if (dteObj.identificacion) {
                                    genCode = dteObj.identificacion.codigoGeneracion;
                                    ctrlNum = dteObj.identificacion.numeroControl;
                                    mhUrl = `https://admin.factura.gob.sv/consultaPublica?ambiente=01&codGen=${genCode}&fechaEmi=${dteObj.identificacion.fecEmi || new Date().toISOString().split('T')[0]}`;
                                }
                            }
                        } catch(jwtErr) {
                            console.error("Error decoding signedDte JWT:", jwtErr);
                        }
                    }

                    if (genCode) {
                        // Success DTE emission
                        await db.collection('orders').doc(id).update({
                            estado_fact: 'Generada',
                            id_fact: genCode,
                            generationCode: genCode,
                            controlNumber: ctrlNum || null,
                            mhDteUrl: mhUrl || null
                        });
                    }
                    await saveDteLog("Emisión DTE", id, llamaDocType, dtePayload, proxyRes.statusCode, responseData, targetUrl);
                    res.status(proxyRes.statusCode).json(responseData);
                } catch (e) {
                    await saveDteLog("Emisión DTE Error Parseo", id, llamaDocType, dtePayload, proxyRes.statusCode, proxyBody, targetUrl);
                    res.status(proxyRes.statusCode).send(proxyBody);
                }
            });
        });

        proxyReq.on('error', async (err) => {
            console.error("FacturaLlama Connection Error:", err);
            await saveDteLog("Emisión DTE Error Conexión", id, llamaDocType, dtePayload, 502, { error: err.message }, targetUrl);
            res.status(502).json({ error: "Error de conexión con FacturaLlama", details: err.message });
        });

        proxyReq.write(payloadString);
        proxyReq.end();

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.receiveIncomingDte = async (req, res) => {
    try {
        const webhookToken = req.headers['x-webhook-token'];
        const expectedToken = process.env.WEBHOOK_TOKEN || 'test_webhook_secret_key_kode';
        
        if (!webhookToken || webhookToken !== expectedToken) {
            console.warn("Intento de webhook no autorizado.");
            return res.status(401).json({ success: false, message: "Token de webhook no autorizado." });
        }
        
        const { dteJson } = req.body;
        if (!dteJson) {
            return res.status(400).json({ success: false, message: "No se proporcionó el dteJson en la petición." });
        }
        
        const ident = dteJson.identificacion || {};
        const emisor = dteJson.emisor || {};
        const receptor = dteJson.receptor || {};
        const resumen = dteJson.resumen || {};
        const cuerpo = dteJson.cuerpoDocumento || [];
        
        const selloRecepcion = ident.selloRecepcion || ident.codigoGeneracion || ("INCOMING-KODE-" + Date.now());
        const emisorNombre = emisor.nombre || "Proveedor Desconocido";
        const totalPagar = resumen.totalPagar || 0.00;
        const fechaEmision = ident.fecEmi || new Date().toISOString().split('T')[0];
        const numeroControl = ident.numeroControl || "";
        
        if (!db) {
            return res.json({
                success: true,
                simulated: true,
                message: "DTE recibido exitosamente (Firebase no inicializado)",
                selloRecepcion: selloRecepcion
            });
        }
        
        // Verificar si ya existe en Firestore para evitar duplicados
        const docRef = db.collection('dte_recibidos').doc(selloRecepcion);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return res.json({
                success: true,
                message: "El DTE ya está registrado (Deduplicado).",
                selloRecepcion: selloRecepcion,
                alreadyExists: true
            });
        }
        
        // Formatear items del DTE
        const parsedItems = cuerpo.map(item => ({
            numItem: item.numItem || 1,
            cantidad: item.cantidad || 1,
            descripcion: item.descripcion || "Item general",
            precioUnitario: item.precioUni || 0.00,
            ventaGravada: item.ventaGravada || 0.00
        }));
        
        // Crear documento en la colección dte_recibidos
        const dteRecord = {
            id_dte: selloRecepcion,
            numeroDte: selloRecepcion,
            numeroControl: numeroControl,
            fecha: fechaEmision,
            emisor: emisorNombre,
            nitEmisor: emisor.nit || "",
            monto: totalPagar,
            estado: 'pendiente_aplicar',
            items: parsedItems,
            rawJson: JSON.stringify(dteJson),
            createdAt: Date.now()
        };
        
        await docRef.set(dteRecord);
            
        console.log(`DTE ${selloRecepcion} registrado exitosamente en dte_recibidos`);
        return res.json({
            success: true,
            message: "DTE recibido y registrado exitosamente.",
            selloRecepcion: selloRecepcion
        });
        
    } catch (err) {
        console.error("Exception on receiveIncomingDte:", err);
        return res.status(500).json({ success: false, error: "InternalError", message: err.message });
    }
};
