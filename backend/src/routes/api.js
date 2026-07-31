const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const dteController = require('../controllers/dteController');
const c807Controller = require('../controllers/c807Controller');
const employeeController = require('../controllers/employeeController');
const { db } = require('../config/firebase');

// Generic lists/configs
router.get('/catalog', async (req, res) => {
    try {
        if (global.localCache && global.localCache.catalog && global.localCache.catalog.length > 0) {
            return res.json(global.localCache.catalog);
        }
        const snapshot = await db.collection('catalog').get();
        const items = [];
        snapshot.forEach(doc => items.push(doc.data()));
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/clients', async (req, res) => {
    try {
        if (global.localCache && global.localCache.clients && global.localCache.clients.length > 0) {
            return res.json(global.localCache.clients);
        }
        const snapshot = await db.collection('clients').get();
        const items = [];
        snapshot.forEach(doc => items.push(doc.data()));
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/clients', async (req, res) => {
    try {
        const clientData = req.body;
        if (!clientData.nombre) {
            return res.status(400).json({ error: "Nombre completo es requerido" });
        }
        const todayStr = new Date().toISOString().slice(0,10).replace(/-/g,"");
        // Count clients registered today to make a unique ID e.g. CLIENTE-29012026-X
        const clientsRef = db.collection('clients');
        const snapshot = await clientsRef.get();
        let todayCount = 1;
        snapshot.forEach(doc => {
            if (doc.id.includes(todayStr)) {
                todayCount++;
            }
        });
        const id = `CLIENTE-${todayStr}-${todayCount}`;
        clientData.id = id;
        clientData.marcaTemp = new Date().toISOString();
        await clientsRef.doc(id).set(clientData);
        res.status(201).json(clientData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/departments', async (req, res) => {
    try {
        const snapshot = await db.collection('departments').get();
        const items = [];
        snapshot.forEach(doc => items.push(doc.data()));
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/municipalities', async (req, res) => {
    try {
        const snapshot = await db.collection('municipalities').get();
        const items = [];
        snapshot.forEach(doc => items.push(doc.data()));
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Orders & Details
router.get('/orders', orderController.getOrders);
router.post('/orders', orderController.createOrder);
router.put('/orders/:id', orderController.updateOrder);
router.get('/order-details', orderController.getOrderDetails);
router.post('/order-details/mark-status', orderController.markDetailStatus);

// Payments
router.get('/payments', async (req, res) => {
    try {
        if (global.localCache && global.localCache.payments && global.localCache.payments.length > 0) {
            return res.json(global.localCache.payments);
        }
        const snapshot = await db.collection('payments').get();
        const items = [];
        snapshot.forEach(doc => items.push(doc.data()));
        res.json(items);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/payments', async (req, res) => {
    try {
        const payment = req.body;
        const todayStr = new Date().toISOString().slice(0,10).replace(/-/g,"");
        const paymentsRef = db.collection('payments');
        const snapshot = await paymentsRef.get();
        let count = snapshot.size + 1;
        const id = `PAG-${todayStr}-${count}`;
        payment.id = id;
        payment.fecha_registro = new Date().toISOString();
        await paymentsRef.doc(id).set(payment);

        // Optional: Update order payment state if fully paid
        res.status(201).json(payment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Payment Methods (Formas de Pago)
router.get('/payment-methods', async (req, res) => {
    try {
        const snapshot = await db.collection('payment_methods').get();
        let list = [];
        snapshot.forEach(doc => {
            list.push({ id: doc.id, ...doc.data() });
        });
        if (list.length === 0) {
            const defaults = ["Contra entrega", "Cuenta BAC", "Cuenta Agrícola", "Link Nequi"];
            for (const name of defaults) {
                const docRef = await db.collection('payment_methods').add({ nombre: name });
                list.push({ id: docRef.id, nombre: name });
            }
        }
        res.json(list);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/payment-methods', async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) {
            return res.status(400).json({ error: "El nombre es obligatorio" });
        }
        const docRef = await db.collection('payment_methods').add({ nombre });
        res.status(201).json({ id: docRef.id, nombre });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/payment-methods/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('payment_methods').doc(id).delete();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Employees & Commissions
router.get('/employees', employeeController.getEmployees);
router.put('/employees/:id', employeeController.updateEmployee);
router.get('/employees/commission-payments', employeeController.getCommissionPayments);
router.post('/employees/commission-payments', employeeController.registerCommissionPayment);
router.get('/employees/payroll-payments', employeeController.getPayrollPayments);
router.post('/employees/:id/pay-payroll', employeeController.payPayroll);
router.post('/employees/:id/pay-weekly-payroll', employeeController.payWeeklyPayroll);

// Config
router.get('/config', async (req, res) => {
    try {
        const doc = await db.collection('config').doc('settings').get();
        res.json(doc.exists ? doc.data() : {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/config', async (req, res) => {
    try {
        await db.collection('config').doc('settings').set(req.body, { merge: true });
        res.json({ success: true, settings: req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// FacturaLlama DTE & C807 Shipping
router.post('/orders/:id/factura', dteController.generateFactura);
router.post('/orders/:id/guia', c807Controller.generateGuia);
router.post('/webhook/dte', dteController.receiveIncomingDte);
router.post('/webhook/c807', c807Controller.receiveIncomingC807);

// Initialize global memory cache to optimize and save Firestore reads
global.localCache = {
    orders: [],
    order_details: [],
    clients: [],
    catalog: [],
    employees: [],
    payments: [],
    config: {},
    payroll_payments: [],
    commission_payments: []
};

// Real-time synchronization active clients
let clients = [];
const collectionsToListen = ['orders', 'order_details', 'clients', 'catalog', 'employees', 'payments', 'config', 'payroll_payments', 'commission_payments'];

// Register real-time Firestore listeners for each collection
if (db) {
    collectionsToListen.forEach(col => {
        let isInitial = true;
        
        db.collection(col).onSnapshot(snapshot => {
            // Update local memory cache on any snapshot change
            const items = [];
            snapshot.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() });
            });

            if (col === 'config') {
                const settingsDoc = items.find(i => i.id === 'settings');
                global.localCache[col] = settingsDoc || {};
            } else {
                global.localCache[col] = items;
            }

            // If it is the initial load, populate cache and skip broadcasting
            if (isInitial) {
                isInitial = false;
                return;
            }
            
            snapshot.docChanges().forEach(change => {
                const data = change.doc.data();
                const docId = change.doc.id;
                
                const payload = {
                    collection: col,
                    type: change.type, // 'added', 'modified', 'removed'
                    id: docId,
                    data: data
                };
                
                // Broadcast to all connected clients
                clients.forEach(client => {
                    try {
                        client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
                    } catch (e) {
                        console.error("Error writing to client SSE connection:", e);
                    }
                });
            });
        }, error => {
            console.error(`Error in Firestore listener for ${col}:`, error);
        });
    });
}

// SSE Connection Endpoint
router.get('/sync', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now() + Math.random().toString().slice(2, 6);
    const newClient = {
        id: clientId,
        res
    };
    clients.push(newClient);

    // Initial ping to confirm connection
    res.write('data: {"connected": true}\n\n');

    // Keep-alive ping every 30 seconds
    const pingInterval = setInterval(() => {
        try {
            res.write(': ping\n\n');
        } catch (e) {}
    }, 30000);

    req.on('close', () => {
        clearInterval(pingInterval);
        clients = clients.filter(c => c.id !== clientId);
    });
});

// Dashboard
router.get('/dashboard', orderController.getDashboardMetrics);

module.exports = router;
