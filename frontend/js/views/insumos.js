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

            <!-- PANEL 2: Ready Orders (Netflix/AppSheet split master-detail view) -->
            <div id="panel-ready-orders" style="display: ${isReadyActive ? 'block' : 'none'};">
                <div style="display: grid; grid-template-columns: 2fr 3fr; gap: 1.5rem; align-items: start;">
                    <!-- Left: Orders list -->
                    <div class="card" style="padding: 1.25rem;">
                        <h3 style="margin-bottom: 1rem; font-size: 1.1rem;"><i class="fa-solid fa-list"></i> Pedidos Listos para Fabricar</h3>
                        <div class="table-responsive">
                            <table class="table" style="font-size: 0.85rem;">
                                <thead>
                                    <tr>
                                        <th>ID Pedido</th>
                                        <th>Fecha</th>
                                        <th>Cliente</th>
                                    </tr>
                                </thead>
                                <tbody id="ready-orders-list">
                                    <tr>
                                        <td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                                            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                                            Cargando pedidos...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Right: Perfumes details of the selected order -->
                    <div class="card" id="ready-order-details-card" style="padding: 1.5rem;">
                        <div style="text-align: center; color: var(--text-muted); padding: 3rem;">
                            <i class="fa-solid fa-boxes-packing" style="font-size: 3.5rem; margin-bottom: 1rem; display: block; opacity: 0.5;"></i>
                            <p>Selecciona un pedido de la lista para ver sus fragancias y gestionar el despacho.</p>
                        </div>
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

    // 1. Process Pending Details Tab (Split Plus version into 1 Oz and 0.5 Oz portions)
    const pendingInsumoItems = [];
    details.forEach(d => {
        if (orderMap[d.pedido_id] === 'Cancelado') return;

        // If the overall status is not final
        if (d.estado !== 'Insumos Comprados' && d.estado !== 'Sacado del Stock' && d.estado !== 'Insumos comprados') {
            if (d.version === 'Plus') {
                // Check if the 1 Oz portion is pending
                const e1 = d.estado_1oz || d.estado || 'Registrado';
                const is1ozPending = e1 !== 'Insumos Comprados' && e1 !== 'Sacado del Stock';
                
                // Check if the 0.5 Oz portion is pending
                const e2 = d.estado_05oz || d.estado || 'Registrado';
                const is05ozPending = e2 !== 'Insumos Comprados' && e2 !== 'Sacado del Stock';
                
                if (is1ozPending) {
                    pendingInsumoItems.push({
                        ...d,
                        insumo_id: `${d.id}-1oz`,
                        insumo_tipo: '1 Oz',
                        insumo_part: '1oz',
                        insumo_estado: e1
                    });
                }
                if (is05ozPending) {
                    pendingInsumoItems.push({
                        ...d,
                        insumo_id: `${d.id}-0.5oz`,
                        insumo_tipo: '0.5 Oz',
                        insumo_part: '05oz',
                        insumo_estado: e2
                    });
                }
            } else {
                // Normal version only has 1 Oz portion
                const e1 = d.estado_1oz || d.estado || 'Registrado';
                const is1ozPending = e1 !== 'Insumos Comprados' && e1 !== 'Sacado del Stock';
                if (is1ozPending) {
                    pendingInsumoItems.push({
                        ...d,
                        insumo_id: d.id, // standard detail id
                        insumo_tipo: '1 Oz',
                        insumo_part: '1oz',
                        insumo_estado: e1
                    });
                }
            }
        }
    });

    // Calculate Consolidated Summary
    const consolidatedMap = {};
    pendingInsumoItems.forEach(item => {
        const key = `${item.contratipo || 'Desconocido'} (${item.insumo_tipo})`;
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
        if (pendingInsumoItems.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                        No hay productos pendientes de compra.
                    </td>
                </tr>
            `;
        } else {
            pendingInsumoItems.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${item.insumo_id}</strong></td>
                    <td><a href="/pedidos" onclick="routeTo(event, 'pedidos')"><strong class="order-id-Registrado">${item.pedido_id}</strong></a></td>
                    <td><strong>${item.kodigo}</strong> - ${item.contratipo || 'Desconocido'} (${item.insumo_tipo})</td>
                    <td><span class="badge ${item.version === 'Plus' ? 'badge-insumos' : 'badge-enviado'}">${item.version || 'Normal'}</span></td>
                    <td><strong>$${(parseFloat(item.precio) || 20.0).toFixed(2)}</strong></td>
                    <td>${item.usuario || 'N/A'}</td>
                    <td style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-warning btn-sm" onclick="markInsumoStatus('${item.id}', '${item.insumo_part}', 'Insumos Comprados')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
                            <i class="fa-solid fa-dolly"></i> Comprado
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="markInsumoStatus('${item.id}', '${item.insumo_part}', 'Sacado del Stock')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-color: var(--color-entregado); color: var(--color-entregado);">
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

    // Auto-select first order if none is selected
    if (readyOrders.length > 0) {
        if (!window.selectedInsumosOrderId || !readyOrders.some(o => o.id === window.selectedInsumosOrderId)) {
            window.selectedInsumosOrderId = readyOrders[0].id;
        }
    } else {
        window.selectedInsumosOrderId = null;
    }

    const readyOrdersBody = document.getElementById('ready-orders-list');
    if (readyOrdersBody) {
        readyOrdersBody.innerHTML = '';
        if (readyOrders.length === 0) {
            readyOrdersBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                        No hay pedidos en estado "Insumos Comprados".
                    </td>
                </tr>
            `;
        } else {
            readyOrders.forEach(o => {
                const isSelected = o.id === window.selectedInsumosOrderId;
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                if (isSelected) {
                    tr.style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
                    tr.style.borderLeft = '4px solid var(--primary)';
                }
                tr.onclick = () => {
                    window.selectedInsumosOrderId = o.id;
                    renderInsumos(container); // Quick silent update
                };

                tr.innerHTML = `
                    <td><strong style="color: var(--primary);">${o.id}</strong></td>
                    <td>${o.fecha_pedido ? new Date(o.fecha_pedido).toLocaleDateString() : 'N/A'}</td>
                    <td><strong>${clientMap[o.cliente_id] || 'Desconocido'}</strong></td>
                `;
                readyOrdersBody.appendChild(tr);
            });
        }
    }

    // Render selected order details on the right card
    const readyOrderDetailsCard = document.getElementById('ready-order-details-card');
    if (readyOrderDetailsCard) {
        if (!window.selectedInsumosOrderId) {
            readyOrderDetailsCard.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 3rem;">
                    <i class="fa-solid fa-boxes-packing" style="font-size: 3.5rem; margin-bottom: 1rem; display: block; opacity: 0.5;"></i>
                    <p>Selecciona un pedido de la lista para ver sus fragancias y gestionar el despacho.</p>
                </div>
            `;
        } else {
            const selectedOrder = readyOrders.find(o => o.id === window.selectedInsumosOrderId);
            if (!selectedOrder) return;

            const selectedOrderDetails = details.filter(d => d.pedido_id === selectedOrder.id);

            // DTE Status / Button
            let dteBtnHtml = '';
            if (selectedOrder.estado_fact === 'Generada') {
                dteBtnHtml = `
                    <a href="${selectedOrder.mhDteUrl}" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:0.25rem; background-color: rgba(16, 185, 129, 0.15); border-color: var(--color-entregado); color: var(--color-entregado); font-size: 0.8rem; padding: 0.4rem 0.8rem;">
                        <i class="fa-solid fa-file-invoice"></i> Ver DTE (MH)
                    </a>
                `;
            } else {
                dteBtnHtml = `
                    <button class="btn btn-secondary btn-sm" onclick="openFacturaModal('${selectedOrder.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                        <i class="fa-solid fa-file-invoice-dollar" style="color:var(--primary);"></i> Emitir DTE
                    </button>
                `;
            }

            // C807 Dispatch Status / Button
            let c807BtnHtml = '';
            if (selectedOrder.estado_guia === 'Generada') {
                const liveStatus = selectedOrder.estado_c807 ? ` - ${selectedOrder.estado_c807}` : '';
                c807BtnHtml = `
                    <a href="${selectedOrder.link_rastreo}" target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:0.25rem; font-weight:700; color:var(--color-enviado); border-color: var(--color-enviado); background-color: rgba(99, 102, 241, 0.15); font-size: 0.8rem; padding: 0.4rem 0.8rem; text-decoration: none;">
                        <i class="fa-solid fa-truck-fast"></i> Guía: ${selectedOrder.num_rastreo}${liveStatus}
                    </a>
                `;
            } else {
                c807BtnHtml = `
                    <button class="btn btn-secondary btn-sm" onclick="generateC807Guia('${selectedOrder.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                        <i class="fa-solid fa-arrow-up-right-from-square" style="color:var(--color-enviado);"></i> Generar Guía
                    </button>
                `;
            }

            // Status Actions
            const statusSelectHtml = `
                <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    <button class="btn btn-success btn-sm" onclick="changeOrderStatusFromInsumos('${selectedOrder.id}', 'Enviado')" style="padding: 0.5rem 0.75rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;" title="Marcar como Enviado">
                        <i class="fa-solid fa-truck-ramp-box"></i> Despachado (Enviado)
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="changeOrderStatusFromInsumos('${selectedOrder.id}', 'Entregado')" style="padding: 0.5rem 0.75rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;" title="Marcar como Entregado">
                        <i class="fa-solid fa-circle-check" style="color:var(--color-entregado);"></i> Entregado
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="confirmCancelOrderFromInsumos('${selectedOrder.id}')" style="padding: 0.5rem 0.75rem; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.25rem;" title="Cancelar Pedido">
                        <i class="fa-solid fa-circle-xmark" style="color:var(--color-registrado);"></i> Cancelar
                    </button>
                </div>
            `;

            // Render detailed perfumes list
            let perfumeRowsHtml = '';
            selectedOrderDetails.forEach(d => {
                perfumeRowsHtml += `
                    <tr>
                        <td><strong>${d.kodigo}</strong></td>
                        <td>${d.contratipo || 'Desconocido'}</td>
                        <td><span class="badge ${d.version === 'Plus' ? 'badge-insumos' : 'badge-enviado'}">${d.version || 'Normal'}</span></td>
                        <td><strong>$${(parseFloat(d.precio) || 20.0).toFixed(2)}</strong></td>
                    </tr>
                `;
            });

            readyOrderDetailsCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <span style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Detalle de Fabricación</span>
                        <h3 style="color: #fff; margin: 0.15rem 0 0.25rem 0; font-size: 1.4rem;">${clientMap[selectedOrder.cliente_id] || 'Desconocido'}</h3>
                        <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Pedido: <strong style="color: var(--primary);">${selectedOrder.id}</strong></span>
                    </div>
                    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                        ${dteBtnHtml}
                        ${c807BtnHtml}
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.75rem;"><i class="fa-solid fa-bottle-droplet"></i> Fragancias Listas para Fabricar</h4>
                    <div class="table-responsive">
                        <table class="table" style="font-size: 0.85rem;">
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Fragancia</th>
                                    <th>Versión</th>
                                    <th>Precio</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${perfumeRowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <span style="font-size: 0.8rem; color: var(--text-muted);">Monto Total del Pedido:</span>
                        <h3 style="color: var(--primary); margin: 0; font-weight: 700; font-size: 1.4rem;">$${(selectedOrder.monto_total || 0).toFixed(2)}</h3>
                    </div>
                    ${statusSelectHtml}
                </div>
            `;
        }
    }
}

window.switchInsumosTab = function(tabName) {
    window.currentInsumosTab = tabName;
    renderInsumos(document.getElementById('main-content'));
};

window.markInsumoStatus = async function(detailId, part, newStatus) {
    try {
        const res = await api.markDetailStatus(detailId, newStatus, part);
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

window.confirmCancelOrderFromInsumos = async function(orderId) {
    if (confirm(`¿Estás seguro de que deseas cancelar el pedido ${orderId}?`)) {
        await changeOrderStatusFromInsumos(orderId, 'Cancelado');
    }
};
