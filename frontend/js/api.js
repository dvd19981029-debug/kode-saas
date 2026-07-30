// API client wrapper for KODE SaaS
const API_BASE = '/api';

const api = {
    // Check if network is available
    isOnline: () => navigator.onLine,

    // Generic fetch wrapper
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            if (!response.ok) {
                const errText = await response.text();
                let errJSON;
                try {
                    errJSON = JSON.parse(errText);
                } catch(e) {}
                throw new Error(errJSON?.error || errJSON?.message || `Error HTTP: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Request failed for ${endpoint}:`, error);
            throw error;
        }
    },

    // Catalog endpoints
    async getCatalog() {
        if (!this.isOnline()) {
            const cached = await localforage.getItem('cached_catalog');
            return cached || [];
        }
        const data = await this.request('/catalog');
        await localforage.setItem('cached_catalog', data);
        return data;
    },

    // Client endpoints
    async getClients() {
        if (!this.isOnline()) {
            const cached = await localforage.getItem('cached_clients');
            return cached || [];
        }
        const data = await this.request('/clients');
        await localforage.setItem('cached_clients', data);
        return data;
    },

    async createClient(client) {
        if (!this.isOnline()) {
            // Queue for offline sync
            const offlineQueue = await localforage.getItem('offline_clients_queue') || [];
            const tempId = `CLIENTE-TEMP-${Date.now()}`;
            const tempClient = { ...client, id: tempId, isOfflineTemp: true };
            offlineQueue.push(tempClient);
            await localforage.setItem('offline_clients_queue', offlineQueue);
            
            // Also add to cached clients for immediate visual feedback
            const cached = await this.getClients();
            cached.push(tempClient);
            await localforage.setItem('cached_clients', cached);
            
            return tempClient;
        }
        return await this.request('/clients', {
            method: 'POST',
            body: JSON.stringify(client)
        });
    },

    // Orders endpoints
    async getOrders() {
        if (!this.isOnline()) {
            const cached = await localforage.getItem('cached_orders') || [];
            return cached;
        }
        const data = await this.request('/orders');
        await localforage.setItem('cached_orders', data);
        return data;
    },

    async createOrder(order, details) {
        if (!this.isOnline()) {
            // Queue for offline sync
            const offlineQueue = await localforage.getItem('offline_orders_queue') || [];
            const tempId = `PED-TEMP-${Date.now()}`;
            const tempOrder = {
                order: { ...order, id: tempId, isOfflineTemp: true, estado: 'Registrado', fecha_pedido: new Date().toISOString() },
                details: details.map((d, i) => ({ ...d, id: `DETPED-TEMP-${Date.now()}-${i}`, pedido_id: tempId, estado: 'Registrado' }))
            };
            offlineQueue.push(tempOrder);
            await localforage.setItem('offline_orders_queue', offlineQueue);
            
            // Add to cached orders
            const cached = await this.getOrders();
            cached.unshift(tempOrder.order);
            await localforage.setItem('cached_orders', cached);
            
            // Add to cached details
            const cachedDetails = await this.getOrderDetails();
            cachedDetails.push(...tempOrder.details);
            await localforage.setItem('cached_order_details', cachedDetails);

            return { success: true, orderId: tempId, order: tempOrder.order, offline: true };
        }
        return await this.request('/orders', {
            method: 'POST',
            body: JSON.stringify({ order, details })
        });
    },

    async updateOrder(id, orderData) {
        return await this.request(`/orders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(orderData)
        });
    },

    // Order details endpoints
    async getOrderDetails() {
        if (!this.isOnline()) {
            const cached = await localforage.getItem('cached_order_details') || [];
            return cached;
        }
        const data = await this.request('/order-details');
        await localforage.setItem('cached_order_details', data);
        return data;
    },

    async markDetailStatus(detailId, estado) {
        if (!this.isOnline()) {
            throw new Error("Esta operación requiere conexión a internet.");
        }
        return await this.request('/order-details/mark-status', {
            method: 'POST',
            body: JSON.stringify({ detailId, estado })
        });
    },

    // Invoices & Shipping labels
    async generateFactura(orderId, dteConfig) {
        if (!this.isOnline()) {
            throw new Error("La facturación electrónica requiere conexión a internet.");
        }
        return await this.request(`/orders/${orderId}/factura`, {
            method: 'POST',
            body: JSON.stringify(dteConfig)
        });
    },

    async generateGuia(orderId) {
        if (!this.isOnline()) {
            throw new Error("La generación de guías requiere conexión a internet.");
        }
        return await this.request(`/orders/${orderId}/guia`, {
            method: 'POST'
        });
    },

    // Payments
    async getPayments() {
        if (!this.isOnline()) {
            return await localforage.getItem('cached_payments') || [];
        }
        const data = await this.request('/payments');
        await localforage.setItem('cached_payments', data);
        return data;
    },

    async createPayment(payment) {
        if (!this.isOnline()) {
            throw new Error("El registro de pagos en línea requiere conexión a internet.");
        }
        return await this.request('/payments', {
            method: 'POST',
            body: JSON.stringify(payment)
        });
    },

    // Employees / Vendedores
    async getEmployees() {
        if (!this.isOnline()) {
            return await localforage.getItem('cached_employees') || [];
        }
        const data = await this.request('/employees');
        await localforage.setItem('cached_employees', data);
        return data;
    },

    async updateEmployee(id, employeeData) {
        return await this.request(`/employees/${id}`, {
            method: 'PUT',
            body: JSON.stringify(employeeData)
        });
    },

    async getCommissionPayments(email) {
        const qs = email ? `?email=${encodeURIComponent(email)}` : '';
        return await this.request(`/employees/commission-payments${qs}`);
    },

    async registerCommissionPayment(payment) {
        return await this.request('/employees/commission-payments', {
            method: 'POST',
            body: JSON.stringify(payment)
        });
    },

    // Settings Configuration
    async getConfig() {
        if (!this.isOnline()) {
            return await localforage.getItem('cached_config') || { monthly_sales_goal: 5000.0 };
        }
        const data = await this.request('/config');
        await localforage.setItem('cached_config', data);
        return data;
    },

    async updateConfig(configData) {
        return await this.request('/config', {
            method: 'PUT',
            body: JSON.stringify(configData)
        });
    },

    // Departments / Municipalities Catalogs
    async getDepartments() {
        if (!this.isOnline()) {
            return await localforage.getItem('cached_departments') || [];
        }
        const data = await this.request('/departments');
        await localforage.setItem('cached_departments', data);
        return data;
    },

    async getMunicipalities() {
        if (!this.isOnline()) {
            return await localforage.getItem('cached_municipalities') || [];
        }
        const data = await this.request('/municipalities');
        await localforage.setItem('cached_municipalities', data);
        return data;
    },

    // Dashboard Metrics
    async getDashboardMetrics() {
        if (!this.isOnline()) {
            // Compute mockup metrics offline or load cached
            return await localforage.getItem('cached_dashboard_metrics') || null;
        }
        const data = await this.request('/dashboard');
        await localforage.setItem('cached_dashboard_metrics', data);
        return data;
    },

    // Offline Sychronization Queue handler
    async syncOfflineData() {
        if (!this.isOnline()) return;

        // 1. Sync clients
        const clientsQueue = await localforage.getItem('offline_clients_queue') || [];
        if (clientsQueue.length > 0) {
            console.log(`Sincronizando ${clientsQueue.length} clientes creados fuera de línea...`);
            const syncedClients = [];
            for (const client of clientsQueue) {
                try {
                    delete client.id; // Let backend generate correct sequential ID
                    delete client.isOfflineTemp;
                    const synced = await this.createClient(client);
                    syncedClients.push(synced);
                } catch (e) {
                    console.error("Error al sincronizar cliente fuera de línea:", e);
                }
            }
            await localforage.setItem('offline_clients_queue', []);
        }

        // 2. Sync orders
        const ordersQueue = await localforage.getItem('offline_orders_queue') || [];
        if (ordersQueue.length > 0) {
            console.log(`Sincronizando ${ordersQueue.length} pedidos creados fuera de línea...`);
            for (const item of ordersQueue) {
                try {
                    const orderData = item.order;
                    const detailsData = item.details;
                    delete orderData.id;
                    delete orderData.isOfflineTemp;
                    detailsData.forEach(d => {
                        delete d.id;
                        delete d.pedido_id;
                    });
                    await this.createOrder(orderData, detailsData);
                } catch (e) {
                    console.error("Error al sincronizar pedido fuera de línea:", e);
                }
            }
            await localforage.setItem('offline_orders_queue', []);
        }

        // Refresh caching
        await this.getCatalog();
        await this.getClients();
        await this.getOrders();
        await this.getOrderDetails();
    }
};

// Monitor online status
window.addEventListener('online', () => {
    document.body.classList.remove('is-offline');
    api.syncOfflineData().then(() => {
        showToast("¡De vuelta en línea! Sincronización completada.", "success");
        if (window.currentRoute) {
            loadRoute(window.currentRoute);
        }
    });
});

window.addEventListener('offline', () => {
    document.body.classList.add('is-offline');
    showToast("Conexión perdida. Trabajando fuera de línea.", "warning");
});

// Real-time synchronization mapping
const cacheKeyMap = {
    'clients': 'cached_clients',
    'orders': 'cached_orders',
    'order_details': 'cached_order_details',
    'catalog': 'cached_catalog',
    'payments': 'cached_payments',
    'employees': 'cached_employees',
    'config': 'cached_config'
};

api.initRealtimeSync = function() {
    if (typeof EventSource === 'undefined') {
        console.warn("EventSource is not supported in this browser. Real-time sync disabled.");
        return;
    }

    const source = new EventSource('/api/sync');

    source.onmessage = async (event) => {
        try {
            const payload = JSON.parse(event.data);
            if (payload.connected) return;

            const { collection, type, id, data } = payload;
            const cacheKey = cacheKeyMap[collection];
            if (!cacheKey) return;

            if (collection === 'config') {
                await localforage.setItem(cacheKey, data);
            } else {
                let cachedData = await localforage.getItem(cacheKey);
                if (!Array.isArray(cachedData)) cachedData = [];
                
                // Keep ID format matching
                const itemWithId = { ...data, id };
                const index = cachedData.findIndex(item => item.id === id);

                if (type === 'removed') {
                    if (index !== -1) {
                        cachedData.splice(index, 1);
                    }
                } else {
                    if (index !== -1) {
                        if (JSON.stringify(cachedData[index]) === JSON.stringify(itemWithId)) {
                            return; // No change, skip rendering
                        }
                        cachedData[index] = itemWithId;
                    } else {
                        cachedData.unshift(itemWithId);
                    }
                }
                await localforage.setItem(cacheKey, cachedData);
            }

            // Trigger visual refresh without reloading the page
            if (typeof window.smartRefreshView === 'function') {
                window.smartRefreshView(collection);
            }
        } catch (err) {
            console.error("Error processing sync message:", err);
        }
    };

    source.onerror = (err) => {
        console.warn("SSE connection lost. Retrying in 5 seconds...");
        source.close();
        setTimeout(() => api.initRealtimeSync(), 5000);
    };
};
