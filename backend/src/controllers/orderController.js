const { db } = require('../config/firebase');

exports.getOrders = async (req, res) => {
    try {
        let orders = [];
        if (global.localCache && global.localCache.orders && global.localCache.orders.length > 0) {
            orders = [...global.localCache.orders];
        } else {
            const snapshot = await db.collection('orders').get();
            snapshot.forEach(doc => {
                orders.push(doc.data());
            });
        }
        // Sort by date descending
        orders.sort((a, b) => new Date(b.fecha_pedido) - new Date(a.fecha_pedido));
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const { order, details, payments } = req.body;
        
        if (!order || !details || details.length === 0) {
            return res.status(400).json({ error: "Datos del pedido o productos incompletos" });
        }

        const todayStr = new Date().toISOString().slice(0,10).replace(/-/g,"");
        
        // Count orders today for sequential ID PED-YYYYMMDD-X
        const ordersRef = db.collection('orders');
        const countSnap = await ordersRef.get();
        let todayCount = 1;
        countSnap.forEach(doc => {
            if (doc.id.includes(todayStr)) {
                todayCount++;
            }
        });
        
        const orderId = `PED-${todayStr}-${todayCount}`;
        
        // Calculate order total
        let total = 0;
        const detailsBatch = db.batch();
        const detailIds = [];
        
        details.forEach((det, idx) => {
            const detailId = `${orderId}-DET-${idx + 1}`;
            det.id = detailId;
            det.pedido_id = orderId;
            det.fecha_registro = new Date().toISOString();
            det.estado = det.estado || 'Registrado';
            
            // Validate version price: Plus is base + 5
            det.version = det.version || 'Normal';
            const basePrice = parseFloat(det.precio) || 20.0;
            det.precio = det.version === 'Plus' ? basePrice + 5.0 : basePrice;
            
            total += det.precio;
            detailIds.push(detailId);
            
            const detailRef = db.collection('order_details').doc(detailId);
            detailsBatch.set(detailRef, det);
        });

        // Save order
        order.id = orderId;
        order.estado = 'Registrado';
        order.fecha_pedido = new Date().toISOString();
        order.estado_guia = 'Pendiente';
        order.estado_fact = 'Pendiente';
        order.estado_c807 = 'Pendiente';
        order.monto_total = total;
        // Default COD (monto_cobrar) to total, unless paid otherwise
        order.monto_cobrar = order.monto_cobrar !== undefined ? parseFloat(order.monto_cobrar) : total;

        // Save payments if present
        if (payments && payments.length > 0) {
            const paymentsRef = db.collection('payments');
            const paymentsSnap = await paymentsRef.get();
            let pCount = paymentsSnap.size + 1;
            
            payments.forEach((p, pIdx) => {
                const paymentId = `PAG-${todayStr}-${pCount + pIdx}`;
                const paymentDoc = {
                    id: paymentId,
                    pedido_id: orderId,
                    forma_pago: p.forma_pago,
                    monto_pago: parseFloat(p.monto_pago) || 0.0,
                    fecha_registro: new Date().toISOString()
                };
                detailsBatch.set(paymentsRef.doc(paymentId), paymentDoc);
            });
        }

        await db.collection('orders').doc(orderId).set(order);
        await detailsBatch.commit();

        res.status(201).json({ success: true, orderId, order, detailIds });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('orders').doc(id).set(req.body, { merge: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getOrderDetails = async (req, res) => {
    try {
        let details = [];
        if (global.localCache && global.localCache.order_details && global.localCache.order_details.length > 0) {
            details = [...global.localCache.order_details];
        } else {
            const snapshot = await db.collection('order_details').get();
            snapshot.forEach(doc => {
                details.push(doc.data());
            });
        }
        res.json(details);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.markDetailStatus = async (req, res) => {
    try {
        const { detailId, estado, part } = req.body;
        if (!detailId || !estado) {
            return res.status(400).json({ error: "Faltan parámetros" });
        }

        const detailRef = db.collection('order_details').doc(detailId);
        const detailDoc = await detailRef.get();
        if (!detailDoc.exists) {
            return res.status(404).json({ error: "Detalle de pedido no encontrado" });
        }

        const detailData = detailDoc.data();
        const updateData = {};

        if (part === '1oz') {
            updateData.estado_1oz = estado;
        } else if (part === '05oz') {
            updateData.estado_05oz = estado;
        } else {
            // Standard update (Normal version, or full update)
            updateData.estado = estado;
            updateData.estado_1oz = estado;
            updateData.estado_05oz = estado;
        }

        // Determine the overall state of the detail item
        // If version is Plus, it needs both parts to be bought/sacado
        const v = detailData.version || 'Normal';
        const e1 = part === '1oz' ? estado : (detailData.estado_1oz || detailData.estado || 'Registrado');
        const e2 = part === '05oz' ? estado : (detailData.estado_05oz || detailData.estado || 'Registrado');

        const isE1Done = e1 === 'Insumos Comprados' || e1 === 'Sacado del Stock';
        const isE2Done = e2 === 'Insumos Comprados' || e2 === 'Sacado del Stock';

        if (v === 'Plus') {
            if (isE1Done && isE2Done) {
                updateData.estado = 'Insumos Comprados';
            } else {
                updateData.estado = 'Registrado'; // Still pending overall
            }
        } else {
            // Normal version only needs e1
            if (isE1Done) {
                updateData.estado = 'Insumos Comprados';
            } else {
                updateData.estado = 'Registrado';
            }
        }

        await detailRef.update(updateData);

        // Check if all other details in the same order are "Insumos Comprados" or "Sacado del Stock"
        const orderId = detailData.pedido_id;
        const detailsSnap = await db.collection('order_details').where('pedido_id', '==', orderId).get();
        
        let allBought = true;
        detailsSnap.forEach(doc => {
            const d = doc.data();
            // If checking the current modified detail, use the new overall status
            const currentStatus = doc.id === detailId ? updateData.estado : d.estado;
            if (currentStatus !== 'Insumos comprados' && currentStatus !== 'Insumos Comprados' && currentStatus !== 'Sacado del Stock') {
                allBought = false;
            }
        });

        if (allBought) {
            await db.collection('orders').doc(orderId).update({
                estado: 'Insumos comprados'
            });
        }

        res.json({ success: true, orderUpdated: allBought, orderId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getDashboardMetrics = async (req, res) => {
    try {
        // 1. Load configuration goal from cache or DB
        let config = {};
        if (global.localCache && global.localCache.config && global.localCache.config.monthly_sales_goal) {
            config = global.localCache.config;
        } else {
            const configDoc = await db.collection('config').doc('settings').get();
            config = configDoc.exists ? configDoc.data() : { monthly_sales_goal: 5000.0 };
        }
        const monthlyGoal = parseFloat(config.monthly_sales_goal) || 5000.0;

        // 2. Fetch orders and employees from cache or DB
        let orders = [];
        if (global.localCache && global.localCache.orders) {
            orders = global.localCache.orders;
        } else {
            const ordersSnap = await db.collection('orders').get();
            ordersSnap.forEach(doc => {
                orders.push(doc.data());
            });
        }

        let employees = [];
        if (global.localCache && global.localCache.employees) {
            employees = global.localCache.employees;
        } else {
            const employeesSnap = await db.collection('employees').get();
            employeesSnap.forEach(doc => {
                employees.push(doc.data());
            });
        }
        
        const employeesMap = {};
        employees.forEach(emp => {
            employeesMap[emp.correo] = {
                nombre: emp.nombre,
                comision_porcentaje: parseFloat(emp.comision_porcentaje) || 10.0,
                ventas: 0.0,
                comision: 0.0
            };
        });

        let totalSales = 0.0;
        const dailySales = {};
        const paymentMethods = {};
        const orderSizes = {
            '1 Perfume': 0,
            '2 Perfumes': 0,
            '3+ Perfumes': 0
        };

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        orders.forEach(order => {
            if (order.estado === 'Cancelado') return;

            const orderDate = new Date(order.fecha_pedido);
            const total = parseFloat(order.monto_total) || 0.0;

            // Check if order belongs to current month & year
            if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
                totalSales += total;

                // Daily sales accumulation
                const dayStr = orderDate.toISOString().slice(0, 10);
                dailySales[dayStr] = (dailySales[dayStr] || 0.0) + total;
            }

            // Sales by advisor (all time or current month, let's do all time but filterable, here we do all time for employee data)
            if (order.usuario && employeesMap[order.usuario]) {
                const comRate = employeesMap[order.usuario].comision_porcentaje / 100.0;
                employeesMap[order.usuario].ventas += total;
                employeesMap[order.usuario].comision += total * comRate;
            }
        });

        // 3. Payments info (distribute payments by method) from cache or DB
        let payments = [];
        if (global.localCache && global.localCache.payments) {
            payments = global.localCache.payments;
        } else {
            const paymentsSnap = await db.collection('payments').get();
            paymentsSnap.forEach(doc => {
                payments.push(doc.data());
            });
        }

        payments.forEach(p => {
            if (p.estado_pago !== 'Cancelado' && p.monto_pago) {
                const method = p.metodo_pago || 'Desconocido';
                paymentMethods[method] = (paymentMethods[method] || 0.0) + parseFloat(p.monto_pago);
            }
        });

        // 4. Products size per order & Top Perfumes from cache or DB
        let order_details = [];
        if (global.localCache && global.localCache.order_details) {
            order_details = global.localCache.order_details;
        } else {
            const detailsSnap = await db.collection('order_details').get();
            detailsSnap.forEach(doc => {
                order_details.push(doc.data());
            });
        }
        
        const perfumeCounts = {};
        const orderDetailGroups = {};

        order_details.forEach(d => {
            // Count perfumes
            if (d.contratipo) {
                perfumeCounts[d.contratipo] = (perfumeCounts[d.contratipo] || 0) + 1;
            }
            // Group by order
            if (d.pedido_id) {
                orderDetailGroups[d.pedido_id] = (orderDetailGroups[d.pedido_id] || 0) + 1;
            }
        });

        // Aggregate promos (order sizes) using the orders array
        orders.forEach(order => {
            const orderId = order.id;
            const count = orderDetailGroups[orderId] || 0;
            if (count === 1) {
                orderSizes['1 Perfume']++;
            } else if (count === 2) {
                orderSizes['2 Perfumes']++;
            } else if (count >= 3) {
                orderSizes['3+ Perfumes']++;
            }
        });

        // Format top perfumes
        const topPerfumes = Object.entries(perfumeCounts)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 10);

        // Daily sales formatting (sorted keys)
        const sortedDailySales = Object.entries(dailySales)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({
            goal: monthlyGoal,
            current_month_sales: totalSales,
            compliance_percentage: monthlyGoal > 0 ? (totalSales / monthlyGoal) * 100 : 0,
            daily_sales: sortedDailySales,
            advisors: Object.values(employeesMap),
            payment_methods: paymentMethods,
            top_perfumes: topPerfumes,
            promos: orderSizes
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
