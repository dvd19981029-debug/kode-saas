const { db } = require('../config/firebase');

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
        const { comision_porcentaje } = req.body;
        
        if (comision_porcentaje === undefined) {
            return res.status(400).json({ error: "comision_porcentaje es requerido" });
        }

        await db.collection('employees').doc(id).update({
            comision_porcentaje: parseFloat(comision_porcentaje)
        });
        
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
