const { db } = require('../config/firebase');
const https = require('https');
const crypto = require('crypto');

exports.getEmployees = async (req, res) => {
    try {
        const snapshot = await db.collection('employees').get();
        const employees = [];
        snapshot.forEach(doc => {
            employees.push(doc.data());
        });
        res.json(employees);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            comision_porcentaje, 
            salario_base, 
            documento_tipo, 
            documento_numero, 
            departamento_codigo, 
            municipio_codigo, 
            direccion_complemento,
            tipo_contratacion
        } = req.body;
        
        const updateData = {};
        if (comision_porcentaje !== undefined) updateData.comision_porcentaje = parseFloat(comision_porcentaje);
        if (salario_base !== undefined) updateData.salario_base = parseFloat(salario_base);
        if (documento_tipo !== undefined) updateData.documento_tipo = documento_tipo;
        if (documento_numero !== undefined) updateData.documento_numero = documento_numero;
        if (departamento_codigo !== undefined) updateData.departamento_codigo = departamento_codigo;
        if (municipio_codigo !== undefined) updateData.municipio_codigo = municipio_codigo;
        if (direccion_complemento !== undefined) updateData.direccion_complemento = direccion_complemento;
        if (tipo_contratacion !== undefined) updateData.tipo_contratacion = tipo_contratacion;

        await db.collection('employees').doc(id).update(updateData);
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getCommissionPayments = async (req, res) => {
    try {
        const { email } = req.query;
        let query = db.collection('commission_payments');
        if (email) {
            query = query.where('vendedor_email', '==', email);
        }
        // Since orderBy requires an index if coupled with where, let's fetch first and sort in JS
        // to avoid index-creation errors during testing.
        const snapshot = await query.get();
        const payments = [];
        snapshot.forEach(doc => {
            payments.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by createdAt desc
        payments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.registerCommissionPayment = async (req, res) => {
    try {
        const { vendedor_email, vendedor_nombre, monto_pagado, fecha_pago, metodo_pago, referencia, registrado_por } = req.body;
        
        if (!vendedor_email || !monto_pagado || !fecha_pago) {
            return res.status(400).json({ error: "vendedor_email, monto_pagado y fecha_pago son requeridos" });
        }

        const paymentDoc = {
            vendedor_email,
            vendedor_nombre: vendedor_nombre || "",
            monto_pagado: parseFloat(monto_pagado),
            fecha_pago,
            metodo_pago: metodo_pago || "Efectivo",
            referencia: referencia || "",
            registrado_por: registrado_por || "admin",
            createdAt: Date.now()
        };

        const docRef = await db.collection('commission_payments').add(paymentDoc);
        res.json({ success: true, id: docRef.id, payment: paymentDoc });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPayrollPayments = async (req, res) => {
    try {
        const { mes } = req.query;
        let query = db.collection('payroll_payments');
        if (mes) {
            query = query.where('mes', '==', mes);
        }
        const snapshot = await query.get();
        const payments = [];
        snapshot.forEach(doc => {
            payments.push({ id: doc.id, ...doc.data() });
        });
        payments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        res.json(payments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.payPayroll = async (req, res) => {
    try {
        const { id } = req.params;
        const { mes, monto_comision, monto_salario_base, metodo_pago, referencia, registrado_por } = req.body;

        if (!mes) {
            return res.status(400).json({ error: "El mes es requerido (formato YYYY-MM)" });
        }

        // Fetch employee
        const empDoc = await db.collection('employees').doc(id).get();
        if (!empDoc.exists) {
            return res.status(404).json({ error: "Empleado no encontrado" });
        }
        const emp = empDoc.data();

        // Validate FSE details
        const docTipo = emp.documento_tipo;
        const docNum = emp.documento_numero;
        const depto = emp.departamento_codigo;
        const muni = emp.municipio_codigo;
        const addr = emp.direccion_complemento;

        if (!docTipo || !docNum || !depto || !muni || !addr) {
            return res.status(400).json({ 
                error: "Datos fiscales del empleado incompletos para emitir Factura de Sujeto Excluido (FSE). " + 
                       "Por favor, edita la ficha del empleado y completa su DUI, Dirección y Códigos de Ubicación." 
            });
        }

        const com = parseFloat(monto_comision) || 0.0;
        const base = parseFloat(emp.salario_base || monto_salario_base) || 0.0;
        const bruto = com + base;
        
        if (bruto <= 0) {
            return res.status(400).json({ error: "El monto bruto total (salario + comisión) debe ser mayor a cero." });
        }

        // Calculate Renta Withholding (10%)
        const renta = bruto * 0.10;
        const neto = bruto - renta;

        // Check if already paid for this period
        const checkSnap = await db.collection('payroll_payments')
            .where('vendedor_email', '==', emp.correo)
            .where('mes', '==', mes)
            .get();
        if (!checkSnap.empty) {
            return res.status(400).json({ error: `La planilla del mes ${mes} para ${emp.nombre} ya fue pagada.` });
        }

        // Prepare FacturaLlama FSE DTE payload
        const fseId = crypto.randomUUID();
        const fsePayload = {
            id: fseId,
            recipient: {
                name: emp.nombre,
                identificationDocument: {
                    type: docTipo,
                    number: docNum.replace(/[^a-zA-Z0-9]/g, '') // strip dashes
                },
                address: {
                    department: depto,
                    municipality: muni,
                    complement: addr
                }
            },
            items: [
                {
                    type: "SERVICIOS",
                    description: `Servicios Profesionales - Planilla ${mes} (Sueldo Base: $${base.toFixed(2)}, Comisiones: $${com.toFixed(2)})`,
                    quantity: 1,
                    unitPrice: bruto
                }
            ],
            retentionRenta: renta
        };

        const payloadString = JSON.stringify(fsePayload);
        const apiKey = process.env.FACTURALLAMA_API_KEY || 'test_sk_45b8180f-9dab-44d5-9575-ba1487c73ed1';

        const reqOpts = {
            method: 'POST',
            hostname: 'api.facturallama.com',
            path: '/dte/fse',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                'X-API-Version': '1'
            }
        };

        const proxyReq = https.request(reqOpts, (proxyRes) => {
            let body = '';
            proxyRes.on('data', chunk => body += chunk);
            proxyRes.on('end', async () => {
                let responseData;
                try {
                    responseData = JSON.parse(body);
                } catch (e) {
                    responseData = { error: "Raw response parse error", rawBody: body };
                }

                // If sandbox returns warning (422) but signedDte is present, treat as success
                const hasSignedDte = responseData && responseData.signedDte;
                const isSuccess = proxyRes.statusCode === 200 || proxyRes.statusCode === 201 || (proxyRes.statusCode === 422 && hasSignedDte);

                if (isSuccess) {
                    const genCode = responseData.generationCode || responseData.id || fseId;
                    const ctrlNum = responseData.controlNumber || null;
                    const pdfUrl = responseData.pdfUrl || null;

                    // Save payroll record in Firestore
                    const payrollRecord = {
                        empleado_id: id,
                        vendedor_email: emp.correo,
                        vendedor_nombre: emp.nombre,
                        mes,
                        monto_comision: com,
                        monto_salario_base: base,
                        monto_bruto: bruto,
                        retencion_renta: renta,
                        monto_neto: neto,
                        metodo_pago: metodo_pago || "Transferencia",
                        referencia: referencia || "",
                        registrado_por: registrado_por || "admin",
                        estado_pago: "Pagado",
                        id_fact: genCode,
                        generationCode: genCode,
                        controlNumber: ctrlNum,
                        pdfUrl: pdfUrl,
                        createdAt: Date.now()
                    };

                    await db.collection('payroll_payments').doc(genCode).set(payrollRecord);

                    // Add to commission_payments too to offset advisor pending commission if commission > 0!
                    if (com > 0) {
                        const commissionRecord = {
                            vendedor_email: emp.correo,
                            vendedor_nombre: emp.nombre,
                            monto_pagado: com,
                            fecha_pago: new Date().toISOString().split('T')[0],
                            metodo_pago: metodo_pago || "Transferencia",
                            referencia: `Planilla ${mes} (FSE: ${ctrlNum || genCode})`,
                            registrado_por: registrado_por || "admin",
                            createdAt: Date.now()
                        };
                        await db.collection('commission_payments').doc(`payroll-commission-${genCode}`).set(commissionRecord);
                    }

                    res.status(200).json({ success: true, payment: payrollRecord, dteResponse: responseData });
                } else {
                    res.status(proxyRes.statusCode).json({
                        error: responseData.error || responseData.message || "Error al emitir FSE en FacturaLlama",
                        details: responseData
                    });
                }
            });
        });

        proxyReq.on('error', (err) => {
            console.error("FacturaLlama FSE Connection Error:", err);
            res.status(502).json({ error: "Error de conexión con FacturaLlama", details: err.message });
        });

        proxyReq.write(payloadString);
        proxyReq.end();

    } catch (err) {
        console.error("Exception in payPayroll:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.payWeeklyPayroll = async (req, res) => {
    try {
        const { id } = req.params;
        const { orderIds, fecha_inicio, fecha_fin, metodo_pago, referencia, registrado_por } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: "Debe seleccionar al menos un pedido para liquidar." });
        }
        if (!fecha_inicio || !fecha_fin) {
            return res.status(400).json({ error: "Las fechas de inicio y fin son requeridas." });
        }

        // Fetch employee
        const empDoc = await db.collection('employees').doc(id).get();
        if (!empDoc.exists) {
            return res.status(404).json({ error: "Empleado no encontrado" });
        }
        const emp = empDoc.data();
        const tipoContrat = emp.tipo_contratacion || 'Servicios Profesionales';

        // 1. Fetch all selected orders and validate they are eligible for payment
        const ordersToUpdate = [];
        let gross = 0.0;
        const commRate = parseFloat(emp.comision_porcentaje || 5.0) / 100.0;

        for (const orderId of orderIds) {
            const orderDoc = await db.collection('orders').doc(orderId).get();
            if (!orderDoc.exists) {
                return res.status(400).json({ error: `El pedido con ID ${orderId} no existe.` });
            }
            const order = orderDoc.data();
            
            if (order.usuario !== emp.correo) {
                return res.status(400).json({ error: `El pedido ${order.numero_pedido || orderId} no pertenece a ${emp.nombre}.` });
            }
            if (order.estado === 'Cancelado') {
                return res.status(400).json({ error: `El pedido ${order.numero_pedido || orderId} está cancelado y no puede comisionar.` });
            }
            if (order.estado_comision === 'Pagada') {
                return res.status(400).json({ error: `La comisión del pedido ${order.numero_pedido || orderId} ya fue pagada anteriormente.` });
            }

            const saleAmount = parseFloat(order.monto_total || 0);
            const commAmount = saleAmount * commRate;
            gross += commAmount;
            ordersToUpdate.push({ id: orderId, number: order.numero_pedido || orderId });
        }

        if (gross <= 0) {
            return res.status(400).json({ error: "El monto de comisiones a pagar debe ser mayor a cero." });
        }

        // 2. Determine tax withholding and call FacturaLlama if Servicios Profesionales
        let renta = 0.0;
        let net = gross;

        if (tipoContrat === 'Servicios Profesionales') {
            renta = gross * 0.10;
            net = gross - renta;

            // Validate FSE details
            const docTipo = emp.documento_tipo;
            const docNum = emp.documento_numero;
            const depto = emp.departamento_codigo;
            const muni = emp.municipio_codigo;
            const addr = emp.direccion_complemento;

            if (!docTipo || !docNum || !depto || !muni || !addr) {
                return res.status(400).json({ 
                    error: "Datos fiscales del empleado incompletos para emitir Factura de Sujeto Excluido (FSE). " + 
                           "Por favor, edita la ficha del empleado y completa su DUI, Dirección y Códigos de Ubicación." 
                });
            }

            // Prepare FacturaLlama FSE DTE payload
            const fseId = crypto.randomUUID();
            const fsePayload = {
                id: fseId,
                recipient: {
                    name: emp.nombre,
                    identificationDocument: {
                        type: docTipo,
                        number: docNum.replace(/[^a-zA-Z0-9]/g, '') // strip dashes
                    },
                    address: {
                        department: depto,
                        municipality: muni,
                        complement: addr
                    }
                },
                items: [
                    {
                        type: "SERVICIOS",
                        description: `Servicios Profesionales - Liquidación de Comisiones Semanal del ${fecha_inicio} al ${fecha_fin}`,
                        quantity: 1,
                        unitPrice: gross
                    }
                ],
                retentionRenta: renta
            };

            const payloadString = JSON.stringify(fsePayload);
            const apiKey = process.env.FACTURALLAMA_API_KEY || 'test_sk_45b8180f-9dab-44d5-9575-ba1487c73ed1';

            const reqOpts = {
                method: 'POST',
                hostname: 'api.facturallama.com',
                path: '/dte/fse',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey,
                    'X-API-Version': '1'
                }
            };

            const proxyReq = https.request(reqOpts, (proxyRes) => {
                let body = '';
                proxyRes.on('data', chunk => body += chunk);
                proxyRes.on('end', async () => {
                    let responseData;
                    try {
                        responseData = JSON.parse(body);
                    } catch (e) {
                        responseData = { error: "Raw response parse error", rawBody: body };
                    }

                    const hasSignedDte = responseData && responseData.signedDte;
                    const isSuccess = proxyRes.statusCode === 200 || proxyRes.statusCode === 201 || (proxyRes.statusCode === 422 && hasSignedDte);

                    if (isSuccess) {
                        const genCode = responseData.generationCode || responseData.id || fseId;
                        const ctrlNum = responseData.controlNumber || null;
                        const pdfUrl = responseData.pdfUrl || null;

                        // Save weekly payroll payment record and update orders inside a batch
                        const batch = db.batch();

                        const payrollRecord = {
                            empleado_id: id,
                            vendedor_email: emp.correo,
                            vendedor_nombre: emp.nombre,
                            tipo_contratacion: tipoContrat,
                            fecha_inicio,
                            fecha_fin,
                            orderIds: orderIds,
                            monto_bruto: gross,
                            retencion_renta: renta,
                            monto_neto: net,
                            metodo_pago: metodo_pago || "Transferencia",
                            referencia: referencia || "",
                            registrado_por: registrado_por || "admin",
                            estado_pago: "Pagado",
                            id_fact: genCode,
                            generationCode: genCode,
                            controlNumber: ctrlNum,
                            pdfUrl: pdfUrl,
                            createdAt: Date.now()
                        };

                        const payRef = db.collection('payroll_payments').doc(genCode);
                        batch.set(payRef, payrollRecord);

                        // Mark orders as paid
                        ordersToUpdate.forEach(o => {
                            const oRef = db.collection('orders').doc(o.id);
                            batch.update(oRef, {
                                estado_comision: 'Pagada',
                                id_pago_comision: genCode
                            });
                        });

                        // Add offset commission payment
                        const commPayRef = db.collection('commission_payments').doc(`weekly-${genCode}`);
                        const commissionRecord = {
                            vendedor_email: emp.correo,
                            vendedor_nombre: emp.nombre,
                            monto_pagado: gross,
                            fecha_pago: new Date().toISOString().split('T')[0],
                            metodo_pago: metodo_pago || "Transferencia",
                            referencia: `Planilla Semanal (${fecha_inicio} a ${fecha_fin}) - FSE: ${ctrlNum || genCode}`,
                            registrado_por: registrado_por || "admin",
                            createdAt: Date.now()
                        };
                        batch.set(commPayRef, commissionRecord);

                        await batch.commit();

                        res.status(200).json({ success: true, payment: payrollRecord, dteResponse: responseData });
                    } else {
                        res.status(proxyRes.statusCode).json({
                            error: responseData.error || responseData.message || "Error al emitir FSE en FacturaLlama",
                            details: responseData
                        });
                    }
                });
            });

            proxyReq.on('error', (err) => {
                console.error("FacturaLlama weekly FSE connection error:", err);
                res.status(502).json({ error: "Error de conexión con FacturaLlama", details: err.message });
            });

            proxyReq.write(payloadString);
            proxyReq.end();

        } else {
            // General Payroll (No FSE, Local recording only)
            const genCode = "local-" + crypto.randomUUID();
            const batch = db.batch();

            const payrollRecord = {
                empleado_id: id,
                vendedor_email: emp.correo,
                vendedor_nombre: emp.nombre,
                tipo_contratacion: tipoContrat,
                fecha_inicio,
                fecha_fin,
                orderIds: orderIds,
                monto_bruto: gross,
                retencion_renta: 0,
                monto_neto: gross,
                metodo_pago: metodo_pago || "Transferencia",
                referencia: referencia || "",
                registrado_por: registrado_por || "admin",
                estado_pago: "Pagado",
                id_fact: genCode,
                generationCode: genCode,
                controlNumber: null,
                pdfUrl: null,
                createdAt: Date.now()
            };

            const payRef = db.collection('payroll_payments').doc(genCode);
            batch.set(payRef, payrollRecord);

            ordersToUpdate.forEach(o => {
                const oRef = db.collection('orders').doc(o.id);
                batch.update(oRef, {
                    estado_comision: 'Pagada',
                    id_pago_comision: genCode
                });
            });

            const commPayRef = db.collection('commission_payments').doc(`weekly-${genCode}`);
            const commissionRecord = {
                vendedor_email: emp.correo,
                vendedor_nombre: emp.nombre,
                monto_pagado: gross,
                fecha_pago: new Date().toISOString().split('T')[0],
                metodo_pago: metodo_pago || "Transferencia",
                referencia: `Planilla Semanal Local (${fecha_inicio} a ${fecha_fin})`,
                registrado_por: registrado_por || "admin",
                createdAt: Date.now()
            };
            batch.set(commPayRef, commissionRecord);

            await batch.commit();

            res.status(200).json({ success: true, payment: payrollRecord });
        }

    } catch (err) {
        console.error("Exception in payWeeklyPayroll:", err);
        res.status(500).json({ error: err.message });
    }
};
