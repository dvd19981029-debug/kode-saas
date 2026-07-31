// View: Pedidos Management
async function renderPedidos(container) {
    container.innerHTML = `
        <div class="card fade-in">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <!-- Left: Filter Controls -->
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; flex-grow: 1; max-width: 600px;">
                    <div style="position: relative; flex: 2; min-width: 200px;">
                        <input type="text" id="search-orders" class="form-control" placeholder="Buscar por ID, Cliente..." style="padding-left: 2.5rem;">
                        <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                    </div>
                    <select id="filter-status" class="form-control" style="flex: 1; min-width: 150px;">
                        <option value="">Todos los estados</option>
                        <option value="Registrado">Registrado</option>
                        <option value="Insumos comprados">Insumos Comprados</option>
                        <option value="Enviado">Enviado</option>
                        <option value="Entregado">Entregado</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                </div>

                <!-- Right: Buttons -->
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary" onclick="exportOrdersToExcel()">
                        <i class="fa-solid fa-file-excel" style="color: #10b981;"></i> Exportar Excel
                    </button>
                    <button class="btn btn-primary" onclick="routeTo(null, 'nuevo-pedido')">
                        <i class="fa-solid fa-cart-plus"></i> Nuevo Pedido
                    </button>
                </div>
            </div>

            <!-- Table -->
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Estado Envío</th>
                            <th>Estado C807</th>
                            <th>ID Pedido</th>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Teléfono</th>
                            <th>Monto Total</th>
                            <th>Factura (FacturaLlama)</th>
                            <th>Despacho (C807)</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="orders-list">
                        <tr>
                            <td colspan="10" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                                <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                                Cargando pedidos...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <div id="orders-pagination-info" style="font-size: 0.85rem; color: var(--text-secondary);">
                    Mostrando 0 de 0 registros
                </div>
                <div id="orders-pagination-controls" style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-sm" id="btn-prev-orders" disabled>Anterior</button>
                    <button class="btn btn-secondary btn-sm" id="btn-next-orders" disabled>Siguiente</button>
                </div>
            </div>
        </div>
    `;

    // Load Data Concurrently
    const [orders, clients] = await Promise.all([
        api.getOrders(),
        api.getClients()
    ]);

    const clientMap = {};
    const clientPhoneMap = {};
    clients.forEach(c => {
        clientMap[c.id] = c.nombre;
        clientPhoneMap[c.id] = c.telefono || 'N/A';
    });

    const searchInput = document.getElementById('search-orders');
    const statusFilter = document.getElementById('filter-status');

    let currentPage = 1;
    const recordsPerPage = 10;
    let filteredOrders = [...orders];

    // Export function accessible globally
    window.exportOrdersToExcel = function() {
        const exportData = filteredOrders.map(o => ({
            'ID Pedido': o.id,
            'Fecha': o.fecha_pedido ? o.fecha_pedido.slice(0, 10) : '',
            'Cliente ID': o.cliente_id,
            'Cliente Nombre': clientMap[o.cliente_id] || o.cliente_id || 'N/A',
            'Teléfono': o.telefono || '',
            'Dirección': o.direccion || '',
            'Monto Total': o.monto_total || 0,
            'Estado': o.estado,
            'Guía C807': o.num_rastreo || '',
            'DTE MH Código Gen': o.generationCode || '',
            'DTE Enlace': o.mhDteUrl || ''
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, "Pedidos KODE");
        XLSX.writeFile(wb, `Pedidos_KODE_${new Date().toISOString().slice(0,10)}.xlsx`);
        showToast("Archivo Excel generado exitosamente", "success");
    };

    function updateTable() {
        const listBody = document.getElementById('orders-list');
        listBody.innerHTML = '';

        if (filteredOrders.length === 0) {
            listBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                        No se encontraron pedidos.
                    </td>
                </tr>
            `;
            document.getElementById('orders-pagination-info').innerText = 'Mostrando 0 de 0 registros';
            document.getElementById('btn-prev-orders').disabled = true;
            document.getElementById('btn-next-orders').disabled = true;
            return;
        }

        const totalRecords = filteredOrders.length;
        const totalPages = Math.ceil(totalRecords / recordsPerPage);

        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
        const pageData = filteredOrders.slice(startIndex, endIndex);

        pageData.forEach(o => {
            const tr = document.createElement('tr');
            
            // Format color-coding classes
            const cleanStatus = (o.estado || 'Registrado').replace(/\s+/g, '-');
            const idClass = `order-id-${cleanStatus}`;

            // Formatting Date
            const orderDate = o.fecha_pedido ? new Date(o.fecha_pedido).toLocaleDateString('es-SV') : 'N/A';

            // Factura status column
            let factHtml = '';
            if (o.estado_fact === 'Generada') {
                factHtml = `
                    <a href="${o.mhDteUrl}" target="_blank" class="badge badge-entregado" style="display:inline-flex; align-items:center; gap:0.25rem;">
                        <i class="fa-solid fa-file-invoice"></i> Generada
                    </a>
                `;
            } else if (o.estado === 'Cancelado') {
                factHtml = `<span class="badge badge-cancelado">No aplica</span>`;
            } else {
                factHtml = `
                    <button class="btn btn-secondary btn-sm" onclick="openFacturaModal('${o.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                        <i class="fa-solid fa-file-invoice-dollar" style="color:var(--primary);"></i> Emitir DTE
                    </button>
                `;
            }

            // Despacho C807 status column
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
            } else if (o.estado === 'Cancelado') {
                despachoHtml = `<span class="badge badge-cancelado">Cancelado</span>`;
            } else {
                despachoHtml = `
                    <button class="btn btn-secondary btn-sm" onclick="generateC807Guia('${o.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                        <i class="fa-solid fa-arrow-up-right-from-square" style="color:var(--color-enviado);"></i> Generar Guía
                    </button>
                `;
            }

            // Actions dropdown/buttons
            const actionsHtml = `
                <div style="display:flex; gap:0.25rem;">
                    <button class="btn btn-secondary btn-sm" onclick="openPaymentModal('${o.id}', ${o.monto_total || 0})" style="padding: 0.25rem 0.5rem;" title="Registrar Pago">
                        <i class="fa-solid fa-hand-holding-dollar" style="color:var(--color-entregado);"></i>
                    </button>
                    <select onchange="changeOrderStatus('${o.id}', this.value)" class="form-control" style="padding: 0.25rem; font-size: 0.75rem; width: 100px; height: 28px;">
                        <option value="">Estado...</option>
                        <option value="Entregado">Entregado</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                </div>
            `;

            // Build Estado Envío badge/label
            let statusIcon = 'fa-circle-pause';
            let statusColor = '#f59e0b';
            if (o.estado === 'Enviado') {
                statusIcon = 'fa-truck';
                statusColor = 'var(--color-enviado)';
            } else if (o.estado === 'Entregado') {
                statusIcon = 'fa-circle-check';
                statusColor = 'var(--color-entregado)';
            } else if (o.estado === 'Cancelado') {
                statusIcon = 'fa-circle-xmark';
                statusColor = 'var(--color-registrado)';
            } else if (o.estado === 'Insumos comprados' || o.estado === 'Insumos Comprados') {
                statusIcon = 'fa-boxes-packing';
                statusColor = 'var(--color-insumos)';
            }
            const estadoEnvioHtml = `<span style="color: ${statusColor}; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;"><i class="fa-solid ${statusIcon}"></i> ${o.estado || 'Registrado'}</span>`;

            // Build Estado C807 column
            const c807StatusHtml = o.estado_c807 ? `<span style="font-weight: 600; color: #f59e0b; display: inline-flex; align-items: center; gap: 0.2rem;"><i class="fa-solid fa-clock-rotate-left" style="font-size:0.75rem;"></i> ${o.estado_c807}</span>` : '<span style="color:var(--text-muted);">-</span>';

            tr.innerHTML = `
                <td>${estadoEnvioHtml}</td>
                <td>${c807StatusHtml}</td>
                <td><span class="${idClass}">${o.id}</span> ${o.isOfflineTemp ? '<span class="badge badge-insumos">Offline</span>' : ''}</td>
                <td>${orderDate}</td>
                <td><strong>${clientMap[o.cliente_id] || o.cliente_id || 'N/A'}</strong></td>
                <td>${clientPhoneMap[o.cliente_id] || 'N/A'}</td>
                <td><strong>$${(o.monto_total || 0).toFixed(2)}</strong></td>
                <td>${factHtml}</td>
                <td>${despachoHtml}</td>
                <td>${actionsHtml}</td>
            `;
            listBody.appendChild(tr);
        });

        // Pagination updates
        document.getElementById('orders-pagination-info').innerText = `Mostrando ${startIndex + 1}-${endIndex} de ${totalRecords} registros`;
        document.getElementById('btn-prev-orders').disabled = currentPage === 1;
        document.getElementById('btn-next-orders').disabled = currentPage === totalPages || totalPages === 0;
    }

    // Set filters
    const filterFn = () => {
        const query = searchInput.value.toLowerCase().trim();
        const status = statusFilter.value;

        filteredOrders = orders.filter(o => {
            const matchesSearch = 
                (o.id && o.id.toLowerCase().includes(query)) ||
                (o.cliente_id && o.cliente_id.toLowerCase().includes(query)) ||
                (clientMap[o.cliente_id] && clientMap[o.cliente_id].toLowerCase().includes(query)) ||
                (o.telefono && String(o.telefono).includes(query));

            const matchesStatus = !status || o.estado.toLowerCase() === status.toLowerCase();

            return matchesSearch && matchesStatus;
        });

        currentPage = 1;
        updateTable();
    };

    searchInput.oninput = filterFn;
    statusFilter.onchange = filterFn;

    // Pagination events
    document.getElementById('btn-prev-orders').onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            updateTable();
        }
    };

    document.getElementById('btn-next-orders').onclick = () => {
        const totalPages = Math.ceil(filteredOrders.length / recordsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateTable();
        }
    };

    updateTable();
}

// Invoicing Modal logic
window.openFacturaModal = function(orderId) {
    const bodyHTML = `
        <form id="frm-dte-invoice">
            <p style="margin-bottom:1rem; color:var(--text-secondary);">Configura los datos del cliente para la emisión del DTE (MH El Salvador).</p>
            <div class="form-group">
                <label for="dte-doctype">Tipo de DTE</label>
                <select id="dte-doctype" class="form-control">
                    <option value="fc">Factura Consumidor Final (DTE 01)</option>
                    <option value="ccf">Crédito Fiscal (DTE 03)</option>
                </select>
            </div>
            <div class="form-group">
                <label for="dte-client-name">Nombre / Razón Social *</label>
                <input type="text" id="dte-client-name" class="form-control" required placeholder="E.g. Lorena de Cabrera">
            </div>
            <div class="form-group">
                <label for="dte-client-email">Correo para Envío</label>
                <input type="email" id="dte-client-email" class="form-control" placeholder="E.g. lorena@gmail.com">
            </div>
            <div class="row" style="display:flex; gap:1rem;">
                <div class="form-group" style="flex:1;">
                    <label for="dte-client-doctype">Tipo de Identificación</label>
                    <select id="dte-client-doctype" class="form-control">
                        <option value="13">DUI (El Salvador)</option>
                        <option value="36">NIT (El Salvador)</option>
                    </select>
                </div>
                <div class="form-group" style="flex:1;">
                    <label for="dte-client-docnum">Número de Documento *</label>
                    <input type="text" id="dte-client-docnum" class="form-control" required placeholder="00000000-0">
                </div>
            </div>
        </form>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitGenerateFactura('${orderId}')">Emitir Factura</button>
    `;

    openModal('Emitir Factura Electrónica (FacturaLlama)', bodyHTML, footerHTML);
};

window.submitGenerateFactura = async function(orderId) {
    const form = document.getElementById('frm-dte-invoice');
    if (!form.reportValidity()) return;

    const dteConfig = {
        docType: document.getElementById('dte-doctype').value,
        clientDocType: document.getElementById('dte-client-doctype').value,
        clientDocNum: document.getElementById('dte-client-docnum').value,
        clientName: document.getElementById('dte-client-name').value,
        clientEmail: document.getElementById('dte-client-email').value || null
    };

    closeModal();
    showToast("Emitiendo DTE en FacturaLlama...", "info");

    try {
        const res = await api.generateFactura(orderId, dteConfig);
        showToast("¡DTE generado exitosamente!", "success");
        if (window.currentRoute === 'insumos') {
            await renderInsumos(document.getElementById('main-content'));
        } else {
            await renderPedidos(document.getElementById('main-content'));
        }
    } catch(err) {
        showToast(`Error al emitir DTE: ${err.message}`, "danger");
    }
};

// C807 dispatch logic
window.generateC807Guia = async function(orderId) {
    showToast("Generando guía de recolección en C807 Express...", "info");
    try {
        const res = await api.generateGuia(orderId);
        showToast(`¡Guía C807 generada! N/R: ${res.guias[0].guia}`, "success");
        if (window.currentRoute === 'insumos') {
            await renderInsumos(document.getElementById('main-content'));
        } else {
            await renderPedidos(document.getElementById('main-content'));
        }
    } catch(err) {
        showToast(`Error al generar guía: ${err.message}`, "danger");
    }
};

// Payment modal logic
window.openPaymentModal = function(orderId, amount) {
    const bodyHTML = `
        <form id="frm-pay">
            <div class="form-group">
                <label for="pay-method">Método de Pago</label>
                <select id="pay-method" class="form-control">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Pago contra Entrega">Pago contra Entrega (C807 CCE)</option>
                </select>
            </div>
            <div class="form-group">
                <label for="pay-amount">Monto de Pago ($)</label>
                <input type="number" id="pay-amount" class="form-control" value="${amount}" step="0.01" min="0" required>
            </div>
            <div class="form-group">
                <label for="pay-doc">Num. Documento / Autorización</label>
                <input type="text" id="pay-doc" class="form-control" placeholder="E.g. Transf 82920">
            </div>
            <div class="form-group">
                <label for="pay-obs">Observaciones</label>
                <input type="text" id="pay-obs" class="form-control">
            </div>
        </form>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitRegisterPayment('${orderId}')">Registrar Pago</button>
    `;

    openModal('Registrar Pago', bodyHTML, footerHTML);
};

window.submitRegisterPayment = async function(orderId) {
    const form = document.getElementById('frm-pay');
    if (!form.reportValidity()) return;

    const payment = {
        pedido_id: orderId,
        monto_pago: parseFloat(document.getElementById('pay-amount').value),
        metodo_pago: document.getElementById('pay-method').value,
        num_doc_auto: document.getElementById('pay-doc').value || null,
        observaciones: document.getElementById('pay-obs').value || null,
        user: window.currentUser,
        estado_pago: 'Confirmado'
    };

    closeModal();
    try {
        await api.createPayment(payment);
        showToast("¡Pago registrado con éxito!", "success");
    } catch(err) {
        showToast(`Error al guardar pago: ${err.message}`, "danger");
    }
};

// Change state manually
window.changeOrderStatus = async function(orderId, newStatus) {
    if (!newStatus) return;

    try {
        await api.updateOrder(orderId, { estado: newStatus });
        showToast(`El pedido ${orderId} fue marcado como ${newStatus}`, "success");
        await renderPedidos(document.getElementById('main-content'));
    } catch(err) {
        showToast(`Error al cambiar estado: ${err.message}`, "danger");
    }
};
