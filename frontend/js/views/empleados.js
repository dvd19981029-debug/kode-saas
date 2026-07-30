// View: Empleados (Vendedores)
async function renderEmpleados(container) {
    container.innerHTML = `
        <div class="card fade-in">
            <h3 style="margin-bottom: 1.5rem;"><i class="fa-solid fa-user-gear"></i> Gestión de Comisiones de Vendedores</h3>
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID Empleado</th>
                            <th>Nombre</th>
                            <th>Correo Electrónico</th>
                            <th>Área</th>
                            <th>Porcentaje Comisión</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="employees-list">
                        <tr>
                            <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                                <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                                Cargando lista de empleados...
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    try {
        const employees = await api.getEmployees();
        const listBody = document.getElementById('employees-list');
        listBody.innerHTML = '';

        if (employees.length === 0) {
            listBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                        No se encontraron registros de empleados.
                    </td>
                </tr>
            `;
            return;
        }

        employees.forEach(emp => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${emp.id}</strong></td>
                <td>${emp.nombre || 'N/A'}</td>
                <td>${emp.correo || 'N/A'}</td>
                <td>${emp.area || 'Ventas'}</td>
                <td>
                    <span style="font-size: 1.1rem; font-weight: 700; color: var(--primary);">
                        ${(emp.comision_porcentaje || 10).toFixed(1)}%
                    </span>
                </td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="openEditCommissionModal('${emp.id}', '${emp.nombre.replace(/'/g, "\\'")}', ${emp.comision_porcentaje || 10})">
                        <i class="fa-solid fa-pen-to-square"></i> Editar Comisión
                    </button>
                </td>
            `;
            listBody.appendChild(tr);
        });
    } catch (err) {
        showToast("Error al cargar empleados: " + err.message, "danger");
    }
}

window.openEditCommissionModal = function(id, name, currentPercent) {
    const bodyHTML = `
        <div class="form-group">
            <p style="margin-bottom: 1rem; color: var(--text-secondary);">Ajusta el porcentaje de comisión para <strong>${name}</strong>.</p>
            <label for="emp-percent">Porcentaje de Comisión (%)</label>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="number" id="emp-percent" class="form-control" value="${currentPercent}" step="0.5" min="0" max="100" style="font-size: 1.25rem; font-weight: 700; text-align: center; width: 120px;">
                <span style="font-size: 1.5rem; font-weight: 700;">%</span>
            </div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitEditCommissionForm('${id}')">Actualizar Comisión</button>
    `;

    openModal('Editar Porcentaje de Comisión', bodyHTML, footerHTML);
};

window.submitEditCommissionForm = async function(id) {
    const input = document.getElementById('emp-percent');
    const newPercent = parseFloat(input.value);

    if (isNaN(newPercent) || newPercent < 0 || newPercent > 100) {
        showToast("Porcentaje inválido", "warning");
        return;
    }

    try {
        await api.updateEmployee(id, { comision_porcentaje: newPercent });
        closeModal();
        showToast("¡Porcentaje de comisión actualizado!", "success");
        await renderEmpleados(document.getElementById('main-content'));
    } catch(err) {
        showToast(`Error al guardar porcentaje: ${err.message}`, "danger");
    }
};
