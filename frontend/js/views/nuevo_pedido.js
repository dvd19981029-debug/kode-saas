// View: Nuevo Pedido
async function renderNuevoPedido(container) {
    const clients = await api.getClients();
    window.currentClients = clients;
    const catalog = await api.getCatalog();
    const departments = await api.getDepartments();
    const municipalities = await api.getMunicipalities();

    // Reset default details list for new order
    window.currentOrderDetails = [];

    // Client options
    const clientOptions = clients.map(c => `<option value="${c.id}" ${window.preselectedClientId === c.id ? 'selected' : ''}>${c.nombre} (${c.telefono || ''})</option>`).join('');

    // Catalog options
    const catalogOptions = catalog.map(p => `<option value="${p.id}">${p.contratipo} (${p.marca || ''}) - $${p.precio.toFixed(2)}</option>`).join('');

    // Depto options
    const deptoOptions = departments.map(d => `<option value="${d.id}"> ${d.name}</option>`).join('');

    container.innerHTML = `
        <div class="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; flex-wrap: wrap;">
            <!-- Left Card: Customer & Details -->
            <div class="card fade-in">
                <h3 style="margin-bottom: 1rem;"><i class="fa-solid fa-user-tag"></i> Datos del Pedido</h3>
                
                <div class="form-group">
                    <label for="o-client">Cliente *</label>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <select id="o-client" class="form-control" required style="flex-grow: 1;">
                            <option value="">Selecciona un cliente...</option>
                            ${clientOptions}
                        </select>
                        <button type="button" class="btn btn-primary" onclick="openRegisterClientFromOrderModal()" style="height: 42px; display: flex; align-items: center; justify-content: center; gap: 0.25rem; white-space: nowrap; padding: 0 0.75rem;">
                            <i class="fa-solid fa-user-plus"></i> + Nuevo
                        </button>
                    </div>
                </div>

                <div class="form-group">
                    <label for="o-phone">Teléfono de Contacto</label>
                    <input type="text" id="o-phone" class="form-control" placeholder="E.g. 71189499">
                </div>

                <div class="form-group">
                    <label for="o-address">Dirección de Envío *</label>
                    <textarea id="o-address" class="form-control" required rows="3" placeholder="Dirección detallada de entrega..."></textarea>
                </div>

                <div class="row" style="display: flex; gap: 1rem;">
                    <div class="form-group" style="flex: 1;">
                        <label for="o-depto">Departamento *</label>
                        <select id="o-depto" class="form-control" required>
                            <option value="">Selecciona Depto...</option>
                            ${deptoOptions}
                        </select>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label for="o-municipio">Municipio *</label>
                        <select id="o-municipio" class="form-control" required disabled>
                            <option value="">Selecciona Municipio...</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="o-obs">Observaciones / Contenido Guía</label>
                    <input type="text" id="o-obs" class="form-control" placeholder="Sin observaciones">
                </div>
            </div>

            <!-- Right Card: Product Selection & Pricing -->
            <div class="card fade-in" style="display: flex; flex-direction: column;">
                <h3 style="margin-bottom: 1rem;"><i class="fa-solid fa-bottle-droplet"></i> Agregar Perfumes</h3>
                
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; align-items: flex-end;">
                    <div class="form-group" style="flex: 3; margin-bottom: 0;">
                        <label for="p-product">Perfume (Fragancia)</label>
                        <select id="p-product" class="form-control">
                            <option value="">Selecciona fragancia...</option>
                            ${catalogOptions}
                        </select>
                    </div>
                    <div class="form-group" style="flex: 1.5; margin-bottom: 0;">
                        <label for="p-version">Versión</label>
                        <select id="p-version" class="form-control">
                            <option value="Normal">Normal (30% - $20)</option>
                            <option value="Plus">Plus (45% - $25)</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="addPerfumeToOrder()" style="height: 42px;">
                        <i class="fa-solid fa-cart-plus"></i>
                    </button>
                </div>

                <h4 style="margin-bottom: 0.5rem;">Detalle del Pedido</h4>
                <div class="table-responsive" style="flex-grow: 1; margin-bottom: 1.5rem; max-height: 250px;">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fragancia</th>
                                <th>Versión</th>
                                <th>Precio</th>
                                <th>Quitar</th>
                            </tr>
                        </thead>
                        <tbody id="order-details-list">
                            <tr>
                                <td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                                    Ningún perfume agregado.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: auto;">
                    <div>
                        <span style="font-size: 0.85rem; color: var(--text-secondary);">Monto Total:</span>
                        <h2 style="color: var(--primary);" id="order-total-price">$0.00</h2>
                    </div>
                    <button class="btn btn-success" onclick="saveOrder()" style="padding: 0.75rem 2rem;">
                        <i class="fa-solid fa-floppy-disk"></i> Registrar Pedido
                    </button>
                </div>
            </div>
        </div>
    `;

    // References
    const clientSelect = document.getElementById('o-client');
    const phoneInput = document.getElementById('o-phone');
    const addressInput = document.getElementById('o-address');
    const deptoSelect = document.getElementById('o-depto');
    const muniSelect = document.getElementById('o-municipio');

    // Dynamic Municipality filtering
    deptoSelect.onchange = (e) => {
        const deptoId = e.target.value;
        if (!deptoId) {
            muniSelect.innerHTML = '<option value="">Selecciona Municipio...</option>';
            muniSelect.disabled = true;
            return;
        }

        const filtered = municipalities.filter(m => String(m.depto_id) === String(deptoId));
        muniSelect.innerHTML = '<option value="">Selecciona Municipio...</option>' + 
            filtered.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
        muniSelect.disabled = false;
    };

    // Client autofill selection change
    clientSelect.onchange = (e) => {
        const clientId = e.target.value;
        if (!clientId) return;

        const client = (window.currentClients || []).find(c => c.id === clientId);
        if (client) {
            phoneInput.value = client.telefono || '';
            addressInput.value = client.direccion || '';
            
            const deptoVal = client.depto || client.depto_id;
            const muniVal = client.municipio || client.municipio_id;
            
            if (deptoVal) {
                deptoSelect.value = deptoVal;
                // Trigger change to load municipalities
                deptoSelect.dispatchEvent(new Event('change'));
                if (muniVal) {
                    setTimeout(() => {
                        muniSelect.value = muniVal;
                    }, 50);
                }
            }
        }
    };

    // Trigger preselected client changes
    if (window.preselectedClientId) {
        clientSelect.dispatchEvent(new Event('change'));
        window.preselectedClientId = null; // Clear preselected state
    }
}

// Add perfume item to the detailed list
window.addPerfumeToOrder = function() {
    const productSelect = document.getElementById('p-product');
    const versionSelect = document.getElementById('p-version');

    const productId = productSelect.value;
    const version = versionSelect.value;

    if (!productId) {
        showToast("Por favor selecciona una fragancia", "warning");
        return;
    }

    // Find product details
    localforage.getItem('cached_catalog').then(catalog => {
        const product = catalog.find(p => p.id === productId);
        if (!product) return;

        const basePrice = parseFloat(product.precio) || 20.0;
        const finalPrice = version === 'Plus' ? basePrice + 5.0 : basePrice;

        const detailItem = {
            kodigo: product.id,
            contratipo: product.contratipo,
            version: version,
            precio: finalPrice,
            usuario: window.currentUser,
            estado: 'Registrado'
        };

        window.currentOrderDetails.push(detailItem);
        updateOrderDetailsTable();
    });
};

function updateOrderDetailsTable() {
    const listContainer = document.getElementById('order-details-list');
    listContainer.innerHTML = '';

    if (window.currentOrderDetails.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                    Ningún perfume agregado.
                </td>
            </tr>
        `;
        document.getElementById('order-total-price').innerText = '$0.00';
        return;
    }

    let total = 0;
    window.currentOrderDetails.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${item.kodigo}</strong> - ${item.contratipo}</td>
            <td><span class="badge ${item.version === 'Plus' ? 'badge-insumos' : 'badge-enviado'}">${item.version}</span></td>
            <td><strong>$${item.precio.toFixed(2)}</strong></td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="removePerfumeFromOrder(${idx})" style="padding:0.25rem 0.5rem;">
                    <i class="fa-solid fa-trash-can" style="color:var(--color-registrado);"></i>
                </button>
            </td>
        `;
        listContainer.appendChild(tr);
        total += item.precio;
    });

    document.getElementById('order-total-price').innerText = `$${total.toFixed(2)}`;
}

window.removePerfumeFromOrder = function(idx) {
    window.currentOrderDetails.splice(idx, 1);
    updateOrderDetailsTable();
};

window.saveOrder = async function() {
    const clientSelect = document.getElementById('o-client');
    const phoneInput = document.getElementById('o-phone');
    const addressInput = document.getElementById('o-address');
    const deptoSelect = document.getElementById('o-depto');
    const muniSelect = document.getElementById('o-municipio');
    const obsInput = document.getElementById('o-obs');

    if (!clientSelect.value || !addressInput.value || !deptoSelect.value || !muniSelect.value) {
        showToast("Completa todos los campos obligatorios (*)", "warning");
        return;
    }

    if (window.currentOrderDetails.length === 0) {
        showToast("Debes agregar al menos una fragancia al pedido", "warning");
        return;
    }

    const orderData = {
        cliente_id: clientSelect.value,
        telefono: phoneInput.value || null,
        direccion: addressInput.value,
        depto_id: deptoSelect.value,
        municipio_id: muniSelect.value,
        observaciones: obsInput.value || null,
        usuario: window.currentUser,
        fecha_pedido: new Date().toISOString()
    };

    try {
        const res = await api.createOrder(orderData, window.currentOrderDetails);
        showToast("¡Pedido registrado exitosamente!", "success");
        window.location.hash = 'pedidos';
    } catch(err) {
        showToast(`Error al guardar el pedido: ${err.message}`, "danger");
    }
};

window.openRegisterClientFromOrderModal = async function() {
    const departments = await api.getDepartments();
    const municipalities = await api.getMunicipalities();

    const deptoOptions = departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

    const bodyHTML = `
        <form id="frm-register-client-order">
            <div class="form-group">
                <label for="co-name">Nombre Completo *</label>
                <input type="text" id="co-name" class="form-control" required placeholder="E.g. Lorena de Cabrera">
            </div>
            <div class="form-group">
                <label for="co-phone">Teléfono Wa *</label>
                <input type="text" id="co-phone" class="form-control" required placeholder="E.g. 71189499">
            </div>
            <div class="form-group">
                <label for="co-email">Correo Electrónico</label>
                <input type="email" id="co-email" class="form-control" placeholder="E.g. lorena@gmail.com">
            </div>
            <div class="form-group">
                <label for="co-depto">Departamento</label>
                <select id="co-depto" class="form-control">
                    <option value="">Selecciona Departamento...</option>
                    ${deptoOptions}
                </select>
            </div>
            <div class="form-group">
                <label for="co-municipio">Municipio</label>
                <select id="co-municipio" class="form-control" disabled>
                    <option value="">Selecciona Municipio...</option>
                </select>
            </div>
            <div class="form-group">
                <label for="co-address">Dirección de Entrega *</label>
                <textarea id="co-address" class="form-control" required placeholder="Dirección completa para envío..."></textarea>
            </div>
            <div class="form-group">
                <label for="co-ref">Punto de Referencia</label>
                <input type="text" id="co-ref" class="form-control" placeholder="Frente a parque, etc...">
            </div>
            <div class="form-group">
                <label for="co-contact">Contacto Adicional</label>
                <input type="text" id="co-contact" class="form-control" placeholder="Nombre y telf del familiar...">
            </div>
            <div class="row" style="display: flex; gap: 1rem;">
                <div class="form-group" style="flex: 1;">
                    <label for="co-doctype">Tipo Documento</label>
                    <select id="co-doctype" class="form-control">
                        <option value="DUI">DUI</option>
                        <option value="NIT">NIT</option>
                    </select>
                </div>
                <div class="form-group" style="flex: 1;">
                    <label for="co-docnum">Número Doc</label>
                    <input type="text" id="co-docnum" class="form-control" placeholder="00000000-0">
                </div>
            </div>
        </form>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitRegisterClientFromOrderForm()">Guardar Cliente</button>
    `;

    openModal('Registrar Nuevo Cliente', bodyHTML, footerHTML);

    // Setup dynamic municipality list filtering
    const deptoSelect = document.getElementById('co-depto');
    const muniSelect = document.getElementById('co-municipio');

    deptoSelect.onchange = (e) => {
        const deptoId = e.target.value;
        if (!deptoId) {
            muniSelect.innerHTML = '<option value="">Selecciona Municipio...</option>';
            muniSelect.disabled = true;
            return;
        }

        const filteredMunis = municipalities.filter(m => String(m.depto_id) === String(deptoId));
        muniSelect.innerHTML = '<option value="">Selecciona Municipio...</option>' + 
            filteredMunis.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
        muniSelect.disabled = false;
    };
};

window.submitRegisterClientFromOrderForm = async function() {
    const form = document.getElementById('frm-register-client-order');
    if (!form.reportValidity()) return;

    const client = {
        nombre: document.getElementById('co-name').value,
        telefono: document.getElementById('co-phone').value,
        correo: document.getElementById('co-email').value || null,
        depto: document.getElementById('co-depto').value || null,
        municipio: document.getElementById('co-municipio').value || null,
        direccion: document.getElementById('co-address').value,
        punto_referencia: document.getElementById('co-ref').value || null,
        contacto_adicional: document.getElementById('co-contact').value || null,
        tipo_doc: document.getElementById('co-doctype').value || null,
        num_doc: document.getElementById('co-docnum').value || null,
        usuario: window.currentUser
    };

    try {
        const newClient = await api.createClient(client);
        closeModal();
        showToast("¡Cliente registrado exitosamente!", "success");

        // Reload clients list in the dropdown
        const updatedClients = await api.getClients();
        window.currentClients = updatedClients;
        const clientSelect = document.getElementById('o-client');
        
        if (clientSelect) {
            // Re-render select options
            clientSelect.innerHTML = '<option value="">Selecciona un cliente...</option>' +
                updatedClients.map(c => `<option value="${c.id}">${c.nombre} (${c.telefono || ''})</option>`).join('');
            
            // Auto-select the newly created client
            clientSelect.value = newClient.id;
            
            // Trigger change event to autofill phone, address, and dropdowns
            clientSelect.dispatchEvent(new Event('change'));
        }
    } catch(err) {
        showToast(`Error al guardar cliente: ${err.message}`, "danger");
    }
};
