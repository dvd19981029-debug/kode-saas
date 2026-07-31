// View: Configuracion settings
async function renderConfiguracion(container) {
    // Keep active tab state
    window.activeConfigTab = window.activeConfigTab || 'conexiones';

    container.innerHTML = `
        <div class="fade-in" style="max-width: 1000px; margin: 0 auto;">
            <!-- Top Tab Menu -->
            <div style="display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                <button class="btn btn-tab ${window.activeConfigTab === 'conexiones' ? 'active' : ''}" onclick="switchConfigTab('conexiones')" id="tab-conexiones" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; padding: 0.5rem 1rem; border-radius: 4px; background: transparent; color: var(--text-secondary); border: none; cursor: pointer; transition: all 0.2s;">
                    <i class="fa-solid fa-circle-nodes"></i> Conexión y Metas
                </button>
                <button class="btn btn-tab ${window.activeConfigTab === 'pagos' ? 'active' : ''}" onclick="switchConfigTab('pagos')" id="tab-pagos" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; padding: 0.5rem 1rem; border-radius: 4px; background: transparent; color: var(--text-secondary); border: none; cursor: pointer; transition: all 0.2s;">
                    <i class="fa-solid fa-credit-card"></i> Formas de Pago
                </button>
                <button class="btn btn-tab ${window.activeConfigTab === 'roles' ? 'active' : ''}" onclick="switchConfigTab('roles')" id="tab-roles" style="display: flex; align-items: center; gap: 0.35rem; font-size: 0.85rem; padding: 0.5rem 1rem; border-radius: 4px; background: transparent; color: var(--text-secondary); border: none; cursor: pointer; transition: all 0.2s;">
                    <i class="fa-solid fa-users-gear"></i> Roles y Usuarios
                </button>
            </div>

            <!-- Tab Content Area -->
            <div id="config-tab-content" class="fade-in"></div>
        </div>
    `;

    // Inject active styles dynamically if not present
    const styleId = 'config-tabs-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            .btn-tab.active {
                background: var(--primary) !important;
                color: #fff !important;
                font-weight: 600;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .btn-tab:hover:not(.active) {
                background: rgba(255, 255, 255, 0.05) !important;
                color: #fff !important;
            }
        `;
        document.head.appendChild(style);
    }

    // Call dynamic switch tab loader
    await switchConfigTab(window.activeConfigTab);
}

window.switchConfigTab = async function(tabName) {
    window.activeConfigTab = tabName;
    
    // Update active tab buttons
    document.querySelectorAll('.btn-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.getElementById(`tab-${tabName}`);
    if (activeBtn) activeBtn.classList.add('active');

    const contentDiv = document.getElementById('config-tab-content');
    if (!contentDiv) return;

    contentDiv.innerHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 3rem;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>`;

    try {
        if (tabName === 'conexiones') {
            await renderConexionesTab(contentDiv);
        } else if (tabName === 'pagos') {
            await renderPagosTab(contentDiv);
        } else if (tabName === 'roles') {
            await renderRolesTab(contentDiv);
        }
    } catch (err) {
        contentDiv.innerHTML = `<div class="card" style="color: var(--color-registrado);">Error al cargar pestaña: ${err.message}</div>`;
    }
};

async function renderConexionesTab(container) {
    const config = await api.getConfig();

    container.innerHTML = `
        <div class="card fade-in" style="max-width: 650px; margin: 0 auto;">
            <h3 style="margin-bottom: 1.5rem;"><i class="fa-solid fa-circle-nodes"></i> Parámetros de Operación SaaS</h3>
            
            <form id="frm-config">
                <h4 style="margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem; color: var(--primary);">
                    Metas Comerciales
                </h4>
                <div class="form-group">
                    <label for="cfg-goal">Meta de Venta Mensual ($) *</label>
                    <input type="number" id="cfg-goal" class="form-control" required min="0" step="100" value="${config.monthly_sales_goal || 5000}">
                </div>

                <h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem; color: var(--primary);">
                    Integración FacturaLlama DTE
                </h4>
                <div class="form-group">
                    <label for="cfg-llama-key">FacturaLlama API Key</label>
                    <div style="position: relative; display: flex; align-items: center;">
                        <input type="password" id="cfg-llama-key" class="form-control" placeholder="E.g. simulado_kode_saas_llama_key" style="padding-right: 2.75rem;" value="${config.facturallama_api_key || ''}">
                        <button type="button" onclick="toggleApiKeyVisibility()" style="position: absolute; right: 0.75rem; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.25rem; font-size: 1.1rem; display: flex; align-items: center; justify-content: center; outline: none;">
                            <i class="fa-solid fa-eye" id="llama-key-eye-icon"></i>
                        </button>
                    </div>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">
                        Deja "simulado_..." para usar respuestas simuladas locales sin cargos a servidores oficiales.
                    </p>
                </div>

                <h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem; color: var(--primary);">
                    Integración C807 Express
                </h4>
                <div class="form-group">
                    <label for="cfg-c807-sim">Modo Simulación C807</label>
                    <select id="cfg-c807-sim" class="form-control">
                        <option value="true" ${config.c807_simulado !== false ? 'selected' : ''}>Sí (Genera tracking provisional y no envía a C807)</option>
                        <option value="false" ${config.c807_simulado === false ? 'selected' : ''}>No (Envía peticiones reales y dinámicas al API de C807)</option>
                    </select>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 2rem;">
                    <button type="button" class="btn btn-secondary" onclick="loadRoute('dashboard')">Regresar</button>
                    <button type="submit" class="btn btn-primary">Guardar Configuración</button>
                </div>
            </form>
        </div>
    `;

    const form = document.getElementById('frm-config');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const configData = {
            monthly_sales_goal: parseFloat(document.getElementById('cfg-goal').value),
            facturallama_api_key: document.getElementById('cfg-llama-key').value,
            c807_simulado: document.getElementById('cfg-c807-sim').value === 'true'
        };

        try {
            await api.updateConfig(configData);
            showToast("¡Configuración guardada exitosamente!", "success");
        } catch (err) {
            showToast(`Error al guardar configuración: ${err.message}`, "danger");
        }
    };
}

async function renderPagosTab(container) {
    const paymentMethods = await api.getPaymentMethods();

    container.innerHTML = `
        <div class="card fade-in" style="max-width: 650px; margin: 0 auto;">
            <h3 style="margin-bottom: 1.5rem;"><i class="fa-solid fa-credit-card"></i> Formas de Pago Registradas</h3>
            
            <div style="margin-bottom: 1.5rem;">
                <div class="table-responsive">
                    <table class="table" style="min-width: 100%;">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th style="width: 80px; text-align: center;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="payment-methods-list">
                            <!-- Populated below -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Form to add new payment method -->
            <form id="frm-add-payment-method" onsubmit="handleAddPaymentMethod(event)" style="display: flex; gap: 0.5rem; align-items: flex-end; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                <div class="form-group" style="flex-grow: 1; margin: 0;">
                    <label for="new-payment-method-name" style="font-size: 0.8rem;">Nueva Forma de Pago</label>
                    <input type="text" id="new-payment-method-name" class="form-control" placeholder="E.g. Cuenta Agrícola" required style="height: 38px;">
                </div>
                <button type="submit" class="btn btn-primary" style="height: 38px; padding: 0 1rem; display: flex; align-items: center; justify-content: center; gap: 0.25rem;">
                    <i class="fa-solid fa-plus"></i> Agregar
                </button>
            </form>
        </div>
    `;

    const methodsBody = document.getElementById('payment-methods-list');
    if (methodsBody) {
        methodsBody.innerHTML = '';
        if (paymentMethods.length === 0) {
            methodsBody.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
                        No hay formas de pago registradas.
                    </td>
                </tr>
            `;
        } else {
            paymentMethods.forEach(pm => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-size: 0.85rem; font-weight: 500;">${pm.nombre}</td>
                    <td style="text-align: center;">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="handleDeletePaymentMethod('${pm.id}', '${pm.nombre}')" style="padding: 0.25rem 0.5rem;" title="Eliminar">
                            <i class="fa-solid fa-trash-can" style="color: var(--color-registrado);"></i>
                        </button>
                    </td>
                `;
                methodsBody.appendChild(tr);
            });
        }
    }
}

async function renderRolesTab(container) {
    const [roles, employees] = await Promise.all([
        api.getRoles(),
        api.getEmployees()
    ]);

    // Keep track of currently selected role in window context
    window.selectedRoleIdForPerms = window.selectedRoleIdForPerms || (roles[0] ? roles[0].id : null);
    const activeRole = roles.find(r => r.id === window.selectedRoleIdForPerms) || roles[0];

    if (activeRole) {
        window.selectedRoleIdForPerms = activeRole.id;
    }

    // System view permissions list map
    const systemViews = [
        { key: 'dashboard', label: 'Dashboard de Gestión', icon: 'fa-chart-pie' },
        { key: 'pedidos', label: 'Gestión de Pedidos', icon: 'fa-boxes-packing' },
        { key: 'insumos', label: 'Productos Compra (Insumos)', icon: 'fa-vials' },
        { key: 'clientes', label: 'Clientes', icon: 'fa-users' },
        { key: 'empleados', label: 'Personal (Empleados y Asesores)', icon: 'fa-user-tie' },
        { key: 'planilla', label: 'Planilla FSE', icon: 'fa-file-invoice-dollar' },
        { key: 'configuracion', label: 'Configuración del Sistema', icon: 'fa-gears' }
    ];

    // Left sidebar of roles list
    const rolesListHtml = roles.map(r => `
        <div class="role-list-item ${r.id === window.selectedRoleIdForPerms ? 'active' : ''}" onclick="selectRoleForPerms('${r.id}')" style="padding: 0.75rem 1rem; border-radius: 4px; margin-bottom: 0.5rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; background: ${r.id === window.selectedRoleIdForPerms ? 'var(--primary)' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${r.id === window.selectedRoleIdForPerms ? 'var(--primary)' : 'var(--border-color)'}; color: ${r.id === window.selectedRoleIdForPerms ? '#fff' : 'var(--text-secondary)'}; transition: all 0.2s;">
            <span style="font-weight: 600; font-size: 0.85rem;"><i class="fa-solid fa-user-tag"></i> ${r.nombre}</span>
            ${['Administrador', 'Vendedor'].includes(r.nombre) ? '' : `
                <button type="button" class="btn btn-sm" onclick="handleDeleteRole(event, '${r.id}', '${r.nombre}')" style="padding: 0.1rem 0.3rem; background: transparent; border: none;" title="Eliminar Rol">
                    <i class="fa-solid fa-trash-can" style="color: ${r.id === window.selectedRoleIdForPerms ? '#fff' : 'var(--color-registrado)'}; font-size: 0.8rem;"></i>
                </button>
            `}
        </div>
    `).join('');

    // Checkboxes list of views permissions for the active role
    const permissionsCheckboxesHtml = systemViews.map(v => {
        const isChecked = activeRole && activeRole.vistas && activeRole.vistas.includes(v.key);
        return `
            <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.8rem; background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; transition: background 0.2s;">
                <input type="checkbox" name="role-view-perm" value="${v.key}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--primary);">
                <span style="font-size: 0.82rem; color: #fff; font-weight: 500;">
                    <i class="fa-solid ${v.icon}" style="color: var(--text-muted); margin-right: 0.35rem; width: 16px;"></i>
                    ${v.label}
                </span>
            </label>
        `;
    }).join('');

    // Users (employees) list table
    const employeesTableRowsHtml = employees.map(emp => {
        const currentRole = emp.role || ((emp.area === 'Gerencia' || (emp.correo && emp.correo.includes('admin'))) ? 'Administrador' : 'Vendedor');
        
        const roleOptionsHtml = roles.map(r => `
            <option value="${r.nombre}" ${r.nombre.toLowerCase() === currentRole.toLowerCase() ? 'selected' : ''}>${r.nombre}</option>
        `).join('');

        return `
            <tr>
                <td><strong>${emp.nombre || 'Colaborador'}</strong></td>
                <td>${emp.correo || 'N/A'}</td>
                <td>
                    <select onchange="updateUserRole('${emp.id}', this.value)" class="form-control" style="padding: 0.2rem 0.4rem; font-size: 0.8rem; height: 28px; width: 150px; margin: 0;">
                        ${roleOptionsHtml}
                    </select>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="fade-in">
            <div class="grid" style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 1.5rem; margin-bottom: 2rem;">
                
                <!-- Left Panel: Roles Management -->
                <div class="card" style="margin: 0;">
                    <h3 style="margin-bottom: 1rem; font-size: 1rem;"><i class="fa-solid fa-users"></i> Roles Disponibles</h3>
                    
                    <div style="margin-bottom: 1.5rem; max-height: 250px; overflow-y: auto; padding-right: 0.25rem;">
                        ${rolesListHtml}
                    </div>

                    <form id="frm-add-role" onsubmit="handleAddRole(event)" style="border-top: 1px solid var(--border-color); padding-top: 1rem;">
                        <div class="form-group" style="margin-bottom: 0.75rem;">
                            <label for="new-role-name" style="font-size: 0.78rem;">Nuevo Rol</label>
                            <input type="text" id="new-role-name" class="form-control" placeholder="E.g. Supervisor" required style="height: 34px; font-size: 0.8rem;">
                        </div>
                        <button type="submit" class="btn btn-primary" style="height: 34px; font-size: 0.8rem; width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.25rem;">
                            <i class="fa-solid fa-plus"></i> Crear Rol
                        </button>
                    </form>
                </div>

                <!-- Right Panel: Permissions Configuration -->
                <div class="card" style="margin: 0;">
                    <h3 style="margin-bottom: 1rem; font-size: 1rem;">
                        <i class="fa-solid fa-shield-halved"></i> Permisos de Acceso: 
                        <span style="color: var(--primary); font-weight: 700;">${activeRole ? activeRole.nombre : 'Selecciona un rol'}</span>
                    </h3>

                    ${activeRole ? `
                        <form id="frm-role-permissions" onsubmit="handleSaveRolePermissions(event)" style="display: flex; flex-direction: column; height: 100%;">
                            <div style="display: grid; grid-template-columns: 1fr; gap: 0.5rem; margin-bottom: 1.5rem;">
                                ${permissionsCheckboxesHtml}
                            </div>
                            <div style="margin-top: auto; display: flex; justify-content: flex-end;">
                                <button type="submit" class="btn btn-success" style="padding: 0.5rem 1.5rem; font-size: 0.82rem;">
                                    <i class="fa-solid fa-floppy-disk"></i> Guardar Permisos de Vista
                                </button>
                            </div>
                        </form>
                    ` : `
                        <div style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                            Selecciona un rol de la lista de la izquierda para configurar sus permisos de vista.
                        </div>
                    `}
                </div>
            </div>

            <!-- Users Section: Role Assignment to Users -->
            <div class="card" style="margin: 0;">
                <h3 style="margin-bottom: 1rem; font-size: 1rem;"><i class="fa-solid fa-user-check"></i> Asignación de Roles a Usuarios</h3>
                <div class="table-responsive">
                    <table class="table" style="min-width: 100%;">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Correo</th>
                                <th>Rol Asignado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${employeesTableRowsHtml || `
                                <tr>
                                    <td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 1.5rem;">
                                        No hay usuarios registrados.
                                    </td>
                                </tr>
                            `}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

window.selectRoleForPerms = function(roleId) {
    window.selectedRoleIdForPerms = roleId;
    switchConfigTab('roles');
};

window.handleAddRole = async function(event) {
    event.preventDefault();
    const input = document.getElementById('new-role-name');
    if (!input || !input.value.trim()) return;

    const nombre = input.value.trim();
    try {
        const res = await api.createRole(nombre, ["dashboard", "pedidos", "clientes"]);
        showToast(`Rol "${nombre}" creado exitosamente`, "success");
        window.selectedRoleIdForPerms = res.id;
        switchConfigTab('roles');
    } catch (err) {
        showToast("Error al crear rol: " + err.message, "danger");
    }
};

window.handleDeleteRole = async function(event, id, nombre) {
    event.stopPropagation(); // Avoid selecting the deleted item
    if (confirm(`¿Estás seguro de que deseas eliminar el rol "${nombre}"?`)) {
        try {
            await api.deleteRole(id);
            showToast(`Rol "${nombre}" eliminado`, "success");
            if (window.selectedRoleIdForPerms === id) {
                window.selectedRoleIdForPerms = null;
            }
            switchConfigTab('roles');
        } catch (err) {
            showToast("Error al eliminar rol: " + err.message, "danger");
        }
    }
};

window.handleSaveRolePermissions = async function(event) {
    event.preventDefault();
    if (!window.selectedRoleIdForPerms) return;

    const checkboxes = document.querySelectorAll('input[name="role-view-perm"]:checked');
    const vistas = Array.from(checkboxes).map(cb => cb.value);

    try {
        await api.updateRole(window.selectedRoleIdForPerms, { vistas });
        showToast("¡Permisos guardados y sincronizados correctamente!", "success");
        
        // If current user is using this role, update their localStorage views immediately!
        const profileStr = localStorage.getItem('kode_current_profile');
        if (profileStr) {
            const profile = JSON.parse(profileStr);
            const roles = await api.getRoles();
            const activeRole = roles.find(r => r.id === window.selectedRoleIdForPerms);
            if (activeRole && profile.role.toLowerCase() === activeRole.nombre.toLowerCase()) {
                localStorage.setItem('kode_allowed_views', JSON.stringify(vistas));
                // Reload sidebar menu link highlights immediately
                loadRoute(window.currentRoute, true);
            }
        }
        
        switchConfigTab('roles');
    } catch (err) {
        showToast("Error al guardar permisos: " + err.message, "danger");
    }
};

window.updateUserRole = async function(empId, newRole) {
    try {
        await api.updateEmployee(empId, { role: newRole });
        showToast(`Rol del colaborador actualizado a: ${newRole}`, "success");
        
        // If current logged-in employee profile role is updated, refresh cache immediately!
        if (window.currentProfile && window.currentProfile.id === empId) {
            window.currentProfile.role = newRole;
            window.userRole = newRole;
            localStorage.setItem('kode_current_profile', JSON.stringify(window.currentProfile));
            
            // Re-fetch allowed views for this new role and reload route
            const roles = await api.getRoles();
            const found = roles.find(r => r.nombre.toLowerCase() === newRole.toLowerCase());
            if (found) {
                localStorage.setItem('kode_allowed_views', JSON.stringify(found.vistas));
            }
            loadRoute(window.currentRoute, true);
        }
    } catch (err) {
        showToast("Error al actualizar rol del colaborador: " + err.message, "danger");
    }
};

window.handleAddPaymentMethod = async function(event) {
    event.preventDefault();
    const input = document.getElementById('new-payment-method-name');
    if (!input || !input.value.trim()) return;

    const nombre = input.value.trim();
    try {
        await api.createPaymentMethod(nombre);
        showToast(`Forma de pago "${nombre}" agregada`, "success");
        switchConfigTab('pagos');
    } catch (err) {
        showToast("Error al agregar forma de pago: " + err.message, "danger");
    }
};

window.handleDeletePaymentMethod = async function(id, nombre) {
    if (confirm(`¿Estás seguro de que deseas eliminar la forma de pago "${nombre}"?`)) {
        try {
            await api.deletePaymentMethod(id);
            showToast(`Forma de pago "${nombre}" eliminada`, "success");
            switchConfigTab('pagos');
        } catch (err) {
            showToast("Error al eliminar forma de pago: " + err.message, "danger");
        }
    }
};

window.toggleApiKeyVisibility = function() {
    const input = document.getElementById('cfg-llama-key');
    const icon = document.getElementById('llama-key-eye-icon');
    if (input && icon) {
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fa-solid fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fa-solid fa-eye';
        }
    }
};
