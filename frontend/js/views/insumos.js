// View: Productos para Compra (Insumos)
async function renderInsumos(container) {
    // Keep active tab state
    window.currentInsumosTab = window.currentInsumosTab || 'pending';

    const isPendingActive = window.currentInsumosTab === 'pending';
    const isReadyActive = window.currentInsumosTab === 'ready';

    container.innerHTML = `
        <div class="fade-in">
            <!-- Tabs Navigation -->
            <div class="tabs-container" style="display: flex; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
                <button id="tab-pending-insumos" class="btn ${isPendingActive ? 'btn-primary' : 'btn-secondary'}" onclick="switchInsumosTab('pending')" style="border-radius: 4px; padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
                    <i class="fa-solid fa-list-check"></i> Insumos Pendientes
                </button>
                <button id="tab-ready-orders" class="btn ${isReadyActive ? 'btn-primary' : 'btn-secondary'}" onclick="switchInsumosTab('ready')" style="border-radius: 4px; padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
                    <i class="fa-solid fa-boxes-packing"></i> Pedidos Listos (Insumos Comprados)
                </button>
            </div>

            <!-- PANEL 1: Pending Insumos -->
            <div id="panel-pending-insumos" style="display: ${isPendingActive ? 'block' : 'none'};">
                <!-- Summary Consolidated Card -->
                <div class="card" style="margin-bottom: 1.5rem;">
                    <h3 style="margin-bottom: 1rem;"><i class="fa-solid fa-calculator"></i> Consolidador de Compra (Insumos Pendientes)</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;" id="insumos-consolidated">
                        <div style="text-align: center; color: var(--text-secondary); padding: 1rem; grid-column: 1 / -1;">
                            Calculando insumos consolidados...
                        </div>
                    </div>
                </div>

                <!-- Detailed Table Card -->
                <div class="card">
                    <h3 style="margin-bottom: 1rem;"><i class="fa-solid fa-list-check"></i> Listado de Productos Pendientes</h3>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>ID Detalle</th>
                                    <th>ID Pedido</th>
                                    <th>Fragancia</th>
                                    <th>Versión</th>
                                    <th>Precio</th>
                                    <th>Vendedor</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="insumos-list">
                                <tr>
                                    <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                                        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                                        Cargando listado de insumos pendientes...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- PANEL 2: Ready Orders -->
            <div id="panel-ready-orders" style="display: ${isReadyActive ? 'block' : 'none'};">
                <div class="card">
                    <h3 style="margin-bottom: 1rem;"><i class="fa-solid fa-boxes-packing"></i> Pedidos Listos para Despacho</h3>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>ID Pedido</th>
                                    <th>Fecha</th>
                                    <th>Cliente</th>
                                    <th>Monto Total</th>
                                    <th>Factura (FacturaLlama)</th>
                                    <th>Despacho (C807)</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="ready-orders-list">
                                <tr>
                                    <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                                        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                                        Cargando listado de pedidos listos...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Load detailed data concurrently
    const [details, orders, clients] = await Promise.all([
        api.getOrderDetails(),
        api.getOrders(),
        api.getClients()
    ]);

    // Map order status and client names for quick check
    const orderMap = {};
    orders.forEach(o => {
        orderMap[o.id] = o.estado;
    });

    const clientMap = {};
    clients.forEach(c => {
        clientMap[c.id] = c.nombre;
    });

    // 1. Process Pending Details Tab
    const pendingDetails = details.filter(d => 
        (d.estado === 'Registrado' || d.estado === 'registrado') && 
        orderMap[d.pedido_id] !== 'Cancelado'
    );

    // Calculate Consolidated Summary
    const consolidatedMap = {};
    pendingDetails.forEach(d => {
        const key = d.contratipo || `Código: ${d.kodigo}`;
        consolidatedMap[key] = (consolidatedMap[key] || 0) + 1;
    });

    const consolidatedContainer = document.getElementById('insumos-consolidated');
    if (consolidatedContainer) {
        consolidatedContainer.innerHTML = '';
        const consolidatedItems = Object.entries(consolidatedMap).sort((a,b) => b[1] - a[1]);
        if (consolidatedItems.length === 0) {
            consolidatedContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 1.5rem; grid-column: 1 / -1;">
                    <i class="fa-solid fa-circle-check" style="font-size: 2rem; color: var(--color-entregado); margin-bottom: 0.5rem; display: block;"></i>
                    No hay productos pendientes de compra. ¡Todo surtido!
                </div>
            `;
        } else {
            consolidatedItems.forEach(([name, count]) => {
                const div = document.createElement('div');
                div.style.background = 'rgba(255,255,255,0.02)';
                div.style.border = '1px solid var(--border-color)';
                div.style.borderRadius = '0.5rem';
                div.style.padding = '1rem';
                div.style.display = 'flex';
                div.style.flexDirection = 'column';
                div.style.alignItems = 'center';
                div.style.justifyContent = 'center';
                div.innerHTML = `
                    <span style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; margin-bottom: 0.25rem;">${name}</span>
                    <span style="font-size: 1.5rem; font-weight: 700; color: var(--color-insumos);">${count} ${count === 1 ? 'ud' : 'uds'}</span>
                `;
                consolidatedContainer.appendChild(div);
            });
        }
    }

    const tableBody = document.getElementById('insumos-list');
    if (tableBody) {
        tableBody.innerHTML = '';
        if (pendingDetails.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                        No hay productos pendientes de compra.
                    </td>
                </tr>
            `;
        } else {
            pendingDetails.forEach(d => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${d.id}</strong></td>
                    <td><a href="/pedidos" onclick="routeTo(event, 'pedidos')"><strong class="order-id-Registrado">${d.pedido_id}</strong></a></td>
                    <td><strong>${d.kodigo}</strong> - ${d.contratipo || 'Desconocido'}</td>
                    <td><span class="badge ${d.version === 'Plus' ? 'badge-insumos' : 'badge-enviado'}">${d.version || 'Normal'}</span></td>
                    <td><strong>$${(parseFloat(d.precio) || 20.0).toFixed(2)}</strong></td>
                    <td>${d.usuario || 'N/A'}</td>
                    <td style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-warning btn-sm" onclick="markInsumoStatus('${d.id}', 'Insumos Comprados')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
                            <i class="fa-solid fa-dolly"></i> Comprado
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="markInsumoStatus('${d.id}', 'Sacado del Stock')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-color: var(--color-entregado); color: var(--color-entregado);">
                            <i class="fa-solid fa-box-open"></i> Sacar del Stock
                        </button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
    }

    // 2. Process Ready Orders Tab
    const readyOrders = orders.filter(o => 
        o.estado === 'Insumos comprados' || o.estado === 'Insumos Comprados'
    );

    const readyOrdersBody = document.getElementById('ready-orders-list');
    if (readyOrdersBody) {
        readyOrdersBody.innerHTML = '';
        if (readyOrders.length === 0) {
            readyOrdersBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                        No hay pedidos en estado "Insumos Comprados".
                    </td>
                </tr>
            `;
        } else {
            readyOrders.forEach(o => {
                const tr = document.createElement('tr');
                
                // DTE (FacturaLlama) Column
                let dteHtml = '';
                if (o.estado_fact === 'Generada') {
                    dteHtml = `
                        <a href="${o.mhDteUrl}" target="_blank" class="badge badge-entregado" style="display:inline-flex; align-items:center; gap:0.25rem;">
                            <i class="fa-solid fa-file-invoice"></i> Generada
                        </a>
                    `;
                } else {
                    dteHtml = `
                        <button class="btn btn-secondary btn-sm" onclick="openFacturaModal('${o.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                            <i class="fa-solid fa-file-invoice-dollar" style="color:var(--primary);"></i> Emitir DTE
                        </button>
                    `;
                }

                // C807 Dispatch Column
                let despachoHtml = '';
                if (o.estado_guia === 'Generada') {
                    const liveStatus = o.estado_c807 ? `<span style="font-size:0.72rem; font-weight:600; color:#f59e0b; display:inline-flex; align-items:center; gap:0.2rem; margin-top:0.1rem;"><i class="fa-solid fa-clock-rotate-left" style="font-size:0.65rem;"></i> ${o.estado_c807}</span>` : '';
                    despachoHtml = `
                        <div style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.8rem;">
                            <a href="${o.link_rastreo}" target="_blank" style="font-weight:700; color:var(--color-enviado); text-decoration:none;">
                                <i class="fa-solid fa-truck-fast"></i> ${o.num_rastreo}
                            </a>
                            <span style="font-size:0.7rem; color:var(--text-muted);">C807 Express</span>
                            ${liveStatus}
                        </div>
                    `;
                } else {
                    despachoHtml = `
                        <button class="btn btn-secondary btn-sm" onclick="generateC807Guia('${o.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                            <i class="fa-solid fa-arrow-up-right-from-square" style="color:var(--color-enviado);"></i> Generar Guía
                        </button>
                    `;
                }

                // Actions Column
                const actionsHtml = `
                    <div style="display:flex; gap:0.25rem;">
                        <button class="btn btn-secondary btn-sm" onclick="changeOrderStatusFromInsumos('${o.id}', 'Enviado')" style="padding: 0.25rem 0.5rem;" title="Marcar como Enviado">
                            <i class="fa-solid fa-truck-ramp-box" style="color:var(--color-enviado);"></i>
                        </button>
                        <select onchange="changeOrderStatusFromInsumos('${o.id}', this.value)" class="form-control" style="padding:0.2rem; font-size:0.75rem; width:auto; height:30px;">
                            <option value="">Estado...</option>
                            <option value="Enviado">Enviado</option>
                            <option value="Entregado">Entregado</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>
                `;

                tr.innerHTML = `
                    <td><strong class="order-id-Registrado">${o.id}</strong></td>
                    <td>${o.fecha_pedido ? new Date(o.fecha_pedido).toLocaleDateString() : 'N/A'}</td>
                    <td><strong>${clientMap[o.cliente_id] || 'Desconocido'}</strong></td>
                    <td><strong>$${(o.monto_total || 0).toFixed(2)}</strong></td>
                    <td>${dteHtml}</td>
                    <td>${despachoHtml}</td>
                    <td>${actionsHtml}</td>
                `;
                readyOrdersBody.appendChild(tr);
            });
        }
    }
}

window.switchInsumosTab = function(tabName) {
    window.currentInsumosTab = tabName;
    renderInsumos(document.getElementById('main-content'));
};

window.markInsumoStatus = async function(detailId, newStatus) {
    try {
        const res = await api.markDetailStatus(detailId, newStatus);
        showToast(`Insumo marcado como: ${newStatus}`, "success");
        if (res.orderUpdated) {
            showToast(`¡El pedido ${res.orderId} cambió su estado a Insumos Comprados!`, "warning");
        }
        await renderInsumos(document.getElementById('main-content'));
    } catch (err) {
        showToast(`Error al actualizar estado: ${err.message}`, "danger");
    }
};

window.changeOrderStatusFromInsumos = async function(orderId, newStatus) {
    if (!newStatus) return;
    try {
        await api.updateOrder(orderId, { estado: newStatus });
        showToast(`El pedido ${orderId} fue marcado como ${newStatus}`, "success");
        await renderInsumos(document.getElementById('main-content'));
    } catch(err) {
        showToast(`Error al cambiar estado: ${err.message}`, "danger");
    }
};
