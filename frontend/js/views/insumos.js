// View: Productos para Compra (Insumos)
async function renderInsumos(container) {
    container.innerHTML = `
        <div class="fade-in">
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
    `;

    // Load detailed data
    const details = await api.getOrderDetails();
    const orders = await api.getOrders();

    // Map order status for quick check
    const orderMap = {};
    orders.forEach(o => {
        orderMap[o.id] = o.estado;
    });

    // Filter only details where status is 'Registrado' and parent order is NOT 'Cancelado'
    const pendingDetails = details.filter(d => 
        (d.estado === 'Registrado' || d.estado === 'registrado') && 
        orderMap[d.pedido_id] !== 'Cancelado'
    );

    // 1. Calculate Consolidated Summary
    const consolidatedMap = {};
    pendingDetails.forEach(d => {
        const key = d.contratipo || `Código: ${d.kodigo}`;
        consolidatedMap[key] = (consolidatedMap[key] || 0) + 1;
    });

    const consolidatedContainer = document.getElementById('insumos-consolidated');
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

    // 2. Render Detailed Pending Table
    const tableBody = document.getElementById('insumos-list');
    tableBody.innerHTML = '';

    if (pendingDetails.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                    No hay productos pendientes de compra.
                </td>
            </tr>
        `;
        return;
    }

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
