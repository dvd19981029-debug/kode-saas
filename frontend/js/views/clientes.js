// View: Clientes Management
async function renderClientes(container) {
    container.innerHTML = `
        <div class="card fade-in">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <div style="position: relative; max-width: 300px; width: 100%;">
                    <input type="text" id="search-clients" class="form-control" placeholder="Buscar clientes..." style="padding-left: 2.5rem;">
                    <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted);"></i>
                </div>
                <button class="btn btn-primary" onclick="openRegisterClientModal()">
                    <i class="fa-solid fa-plus"></i> Registrar Cliente
                </button>
            </div>

            <div class="table-responsive">
                <table class="table" id="clients-table">
                    <thead>
                        <tr>
                            <th>ID Cliente</th>
                            <th>Nombre Completo</th>
                            <th>Teléfono</th>
                            <th>Dirección</th>
                            <th>Documento</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="clients-list">
                        <tr>
                            <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                                <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                                Cargando catálogo de clientes...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <div id="clients-pagination-info" style="font-size: 0.85rem; color: var(--text-secondary);">
                    Mostrando 0 de 0 registros
                </div>
                <div id="clients-pagination-controls" style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-sm" id="btn-prev-clients" disabled>Anterior</button>
                    <button class="btn btn-secondary btn-sm" id="btn-next-clients" disabled>Siguiente</button>
                </div>
            </div>
        </div>
    `;

    // Load Data
    const clients = await api.getClients();
    const searchInput = document.getElementById('search-clients');
    
    // Pagination state
    let currentPage = 1;
    const recordsPerPage = 10;
    let filteredClients = [...clients];

    function updateTable() {
        const clientsList = document.getElementById('clients-list');
        clientsList.innerHTML = '';

        if (filteredClients.length === 0) {
            clientsList.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                        No se encontraron clientes.
                    </td>
                </tr>
            `;
            document.getElementById('clients-pagination-info').innerText = 'Mostrando 0 de 0 registros';
            document.getElementById('btn-prev-clients').disabled = true;
            document.getElementById('btn-next-clients').disabled = true;
            return;
        }

        // Pagination calculations
        const totalRecords = filteredClients.length;
        const totalPages = Math.ceil(totalRecords / recordsPerPage);
        
        // Boundaries
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
        const pageData = filteredClients.slice(startIndex, endIndex);

        pageData.forEach(client => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${client.id || 'N/A'}</strong> ${client.isOfflineTemp ? '<span class="badge badge-insumos">Offline</span>' : ''}</td>
                <td>${client.nombre || 'N/A'}</td>
                <td>${client.telefono || 'N/A'}</td>
                <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${client.direccion || 'N/A'}</td>
                <td>${client.tipo_doc ? `${client.tipo_doc}: ${client.num_doc || ''}` : 'Sin Doc'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.5rem;" onclick="openNewPedidoWithClient('${client.id}')" title="Crear Pedido">
                        <i class="fa-solid fa-cart-plus" style="color: var(--primary);"></i>
                    </button>
                </td>
            `;
            clientsList.appendChild(tr);
        });

        // Update info & buttons
        document.getElementById('clients-pagination-info').innerText = `Mostrando ${startIndex + 1}-${endIndex} de ${totalRecords} registros`;
        document.getElementById('btn-prev-clients').disabled = currentPage === 1;
        document.getElementById('btn-next-clients').disabled = currentPage === totalPages || totalPages === 0;
    }

    // Set pagination event listeners
    document.getElementById('btn-prev-clients').onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            updateTable();
        }
    };

    document.getElementById('btn-next-clients').onclick = () => {
        const totalPages = Math.ceil(filteredClients.length / recordsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            updateTable();
        }
    };

    // Filter listener
    searchInput.oninput = (e) => {
        const query = e.target.value.toLowerCase().trim();
        filteredClients = clients.filter(c => 
            (c.nombre && c.nombre.toLowerCase().includes(query)) ||
            (c.id && c.id.toLowerCase().includes(query)) ||
            (c.telefono && String(c.telefono).includes(query)) ||
            (c.direccion && c.direccion.toLowerCase().includes(query))
        );
        currentPage = 1;
        updateTable();
    };

    updateTable();
}

// Redirect helper to register order with pre-filled client
window.openNewPedidoWithClient = function(clientId) {
    window.preselectedClientId = clientId;
    window.location.hash = 'nuevo-pedido';
};

// Add Client Dialog Modal
window.openRegisterClientModal = async function() {
    const departments = await api.getDepartments();
    const municipalities = await api.getMunicipalities();

    const deptoOptions = departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('');

    const bodyHTML = `
        <form id="frm-register-client">
            <div class="form-group">
                <label for="c-name">Nombre Completo *</label>
                <input type="text" id="c-name" class="form-control" required placeholder="E.g. Lorena de Cabrera">
            </div>
            <div class="form-group">
                <label for="c-phone">Teléfono Wa *</label>
                <input type="text" id="c-phone" class="form-control" required placeholder="E.g. 71189499">
            </div>
            <div class="form-group">
                <label for="c-email">Correo Electrónico</label>
                <input type="email" id="c-email" class="form-control" placeholder="E.g. lorena@gmail.com">
            </div>
            <div class="form-group">
                <label for="c-depto">Departamento</label>
                <select id="c-depto" class="form-control">
                    <option value="">Selecciona Departamento...</option>
                    ${deptoOptions}
                </select>
            </div>
            <div class="form-group">
                <label for="c-municipio">Municipio</label>
                <select id="c-municipio" class="form-control" disabled>
                    <option value="">Selecciona Municipio...</option>
                </select>
            </div>
            <div class="form-group">
                <label for="c-address">Dirección de Entrega *</label>
                <textarea id="c-address" class="form-control" required placeholder="Dirección completa para envío..."></textarea>
            </div>
            <div class="form-group">
                <label for="c-ref">Punto de Referencia</label>
                <input type="text" id="c-ref" class="form-control" placeholder="Frente a parque, etc...">
            </div>
            <div class="form-group">
                <label for="c-contact">Contacto Adicional</label>
                <input type="text" id="c-contact" class="form-control" placeholder="Nombre y telf del familiar...">
            </div>
            <div class="row" style="display: flex; gap: 1rem;">
                <div class="form-group" style="flex: 1;">
                    <label for="c-doctype">Tipo Documento</label>
                    <select id="c-doctype" class="form-control">
                        <option value="DUI">DUI</option>
                        <option value="NIT">NIT</option>
                    </select>
                </div>
                <div class="form-group" style="flex: 1;">
                    <label for="c-docnum">Número Doc</label>
                    <input type="text" id="c-docnum" class="form-control" placeholder="00000000-0">
                </div>
            </div>
        </form>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitRegisterClientForm()">Guardar Cliente</button>
    `;

    openModal('Registrar Nuevo Cliente', bodyHTML, footerHTML);

    // Setup dynamic municipality list filtering
    const deptoSelect = document.getElementById('c-depto');
    const muniSelect = document.getElementById('c-municipio');

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

window.submitRegisterClientForm = async function() {
    const form = document.getElementById('frm-register-client');
    if (!form.reportValidity()) return;

    const client = {
        nombre: document.getElementById('c-name').value,
        telefono: document.getElementById('c-phone').value,
        correo: document.getElementById('c-email').value || null,
        depto: document.getElementById('c-depto').value || null,
        municipio: document.getElementById('c-municipio').value || null,
        direccion: document.getElementById('c-address').value,
        punto_referencia: document.getElementById('c-ref').value || null,
        contacto_adicional: document.getElementById('c-contact').value || null,
        tipo_doc: document.getElementById('c-doctype').value || null,
        num_doc: document.getElementById('c-docnum').value || null,
        usuario: window.currentUser
    };

    try {
        const newClient = await api.createClient(client);
        closeModal();
        showToast("¡Cliente registrado exitosamente!", "success");
        if (window.currentRoute === 'clientes') {
            await loadRoute('clientes');
        }
    } catch(err) {
        showToast(`Error al guardar cliente: ${err.message}`, "danger");
    }
};
