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

        // Retrieve Token 1 from Auth collection
        const authSnap = await db.collection('auth').get();
        let c807Token = null;
        authSnap.forEach(doc => {
            const data = doc.data();
            if (data.token_1 && data.estado_auth === 'Activo') {
                c807Token = data.token_1;
            }
        });

        // Check if settings has simulated mode or if token is missing
        const configDoc = await db.collection('config').doc('settings').get();
        const config = configDoc.exists ? configDoc.data() : {};
        const isSimulated = config.c807_simulado !== false && (!c807Token || config.c807_simulado === true);

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
