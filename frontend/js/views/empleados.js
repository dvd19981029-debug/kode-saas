// View: Empleados (Vendedores and Commission Payments)
async function renderEmpleados(container) {
    container.innerHTML = `
        <div class="fade-in">
            <!-- Summary Stats Card -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="card" style="display: flex; align-items: center; gap: 1rem; padding: 1.5rem;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <div>
                        <h5 style="color: var(--text-secondary); margin-bottom: 0.25rem;">Total Vendedores</h5>
                        <h2 id="total-sellers-count" style="font-weight: 700; margin: 0;">0</h2>
                    </div>
                </div>
                <div class="card" style="display: flex; align-items: center; gap: 1rem; padding: 1.5rem;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(245, 158, 11, 0.1); color: #f59e0b; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="fa-solid fa-wallet"></i>
                    </div>
                    <div>
                        <h5 style="color: var(--text-secondary); margin-bottom: 0.25rem;">Comisiones Acumuladas</h5>
                        <h2 id="total-commissions-accumulated" style="font-weight: 700; margin: 0; color: #f59e0b;">$0.00</h2>
                    </div>
                </div>
                <div class="card" style="display: flex; align-items: center; gap: 1rem; padding: 1.5rem;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); color: var(--color-entregado); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>
                    <div>
                        <h5 style="color: var(--text-secondary); margin-bottom: 0.25rem;">Comisiones Pagadas</h5>
                        <h2 id="total-commissions-paid" style="font-weight: 700; margin: 0; color: var(--color-entregado);">$0.00</h2>
                    </div>
                </div>
                <div class="card" style="display: flex; align-items: gap: 1rem; padding: 1.5rem; display: flex; align-items: center;">
                    <div style="width: 50px; height: 50px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); color: var(--color-registrado); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                    </div>
                    <div>
                        <h5 style="color: var(--text-secondary); margin-bottom: 0.25rem;">Saldo Pendiente</h5>
                        <h2 id="total-commissions-pending" style="font-weight: 700; margin: 0; color: var(--color-registrado);">$0.00</h2>
                    </div>
                </div>
            </div>

            <!-- Vendedores List Section -->
            <div class="card" style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1.5rem;"><i class="fa-solid fa-user-gear"></i> Control de Comisiones por Asesor</h3>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Asesor</th>
                                <th>Correo</th>
                                <th>% Comisión</th>
                                <th>Ventas Totales</th>
                                <th>Comisión Acumulada</th>
                                <th>Comisión Pagada</th>
                                <th>Saldo Pendiente</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="employees-list">
                            <tr>
                                <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                                    Cargando datos de comisiones...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Payments History Section -->
            <div class="card">
                <h3 style="margin-bottom: 1.5rem;"><i class="fa-solid fa-receipt"></i> Historial de Pagos de Comisión</h3>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Asesor</th>
                                <th>Monto Pagado</th>
                                <th>Método de Pago</th>
                                <th>Referencia</th>
                                <th>Registrado Por</th>
                            </tr>
                        </thead>
                        <tbody id="payments-history-list">
                            <tr>
                                <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                                    No hay registros de pagos.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    try {
        // 1. Fetch data concurrently
        const [employees, dashboardMetricsRes, allPaymentsRes] = await Promise.all([
            api.getEmployees(),
            api.getDashboardMetrics().catch(e => {
                console.warn("Could not fetch metrics. Using local computation fallbacks.", e);
                return { advisors: [] };
            }),
            api.getCommissionPayments().catch(e => {
                console.warn("Could not fetch payments.", e);
                return [];
            })
        ]);
        
        const dashboardMetrics = dashboardMetricsRes || { advisors: [] };
        const allPayments = allPaymentsRes || [];

        const listBody = document.getElementById('employees-list');
        const historyBody = document.getElementById('payments-history-list');
        listBody.innerHTML = '';
        historyBody.innerHTML = '';

        if (employees.length === 0) {
            listBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                        No se encontraron registros de vendedores.
                    </td>
                </tr>
            `;
            return;
        }

        document.getElementById('total-sellers-count').innerText = employees.length;

        let accumTotal = 0;
        let paidTotal = 0;

        // Render Vendedores Table
        employees.forEach(emp => {
            // Find metrics for this employee
            const advisorMetric = dashboardMetrics.advisors.find(a => a.nombre === emp.nombre) || { ventas: 0, comision: 0 };
            
            // Calculate total paid to this employee
            const empPayments = allPayments.filter(p => p.vendedor_email === emp.correo);
            const empPaid = empPayments.reduce((sum, p) => sum + parseFloat(p.monto_pagado || 0), 0);

            const pending = Math.max(0, advisorMetric.comision - empPaid);

            accumTotal += advisorMetric.comision;
            paidTotal += empPaid;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${emp.nombre}</strong><br><small style="color: var(--text-secondary);">${emp.area || 'Ventas'} | ${emp.tipo_contratacion || 'Servicios Profesionales'}</small></td>
                <td>${emp.correo || 'N/A'}</td>
                <td>
                    <span style="font-size: 1.05rem; font-weight: 700; color: var(--primary);">
                        ${(emp.comision_porcentaje || 5).toFixed(1)}%
                    </span>
                </td>
                <td>$${advisorMetric.ventas.toFixed(2)}</td>
                <td><span style="color: #f59e0b; font-weight: 600;">$${advisorMetric.comision.toFixed(2)}</span></td>
                <td><span style="color: var(--color-entregado); font-weight: 600;">$${empPaid.toFixed(2)}</span></td>
                <td><span style="color: var(--color-registrado); font-weight: 700;">$${pending.toFixed(2)}</span></td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-secondary btn-sm" onclick="openEditCommissionModal('${emp.id}', '${(emp.nombre || '').replace(/'/g, "\\'")}')" title="Editar Ficha de Colaborador">
                            <i class="fa-solid fa-user-pen"></i> Editar Ficha
                        </button>
                        <button class="btn btn-primary btn-sm" style="background-color: var(--color-entregado); border-color: var(--color-entregado);" onclick="openPayCommissionModal('${(emp.correo || '').replace(/'/g, "\\'")}', '${(emp.nombre || '').replace(/'/g, "\\'")}', ${pending})" title="Registrar Pago">
                            <i class="fa-solid fa-money-bill-wave"></i> Registrar Pago
                        </button>
                    </div>
                </td>
            `;
            listBody.appendChild(tr);
        });

        // Update overall summary statistics
        document.getElementById('total-commissions-accumulated').innerText = `$${accumTotal.toFixed(2)}`;
        document.getElementById('total-commissions-paid').innerText = `$${paidTotal.toFixed(2)}`;
        document.getElementById('total-commissions-pending').innerText = `$${Math.max(0, accumTotal - paidTotal).toFixed(2)}`;

        // Render Payments History Table
        if (allPayments.length === 0) {
            historyBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                        No hay pagos de comisión registrados.
                    </td>
                </tr>
            `;
        } else {
            allPayments.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${p.fecha_pago}</td>
                    <td><strong>${p.vendedor_nombre}</strong><br><small style="color: var(--text-secondary);">${p.vendedor_email}</small></td>
                    <td><strong style="color: var(--color-entregado);">$${p.monto_pagado.toFixed(2)}</strong></td>
                    <td><span class="badge" style="background: rgba(255,255,255,0.08); color: #fff; padding: 0.25rem 0.5rem;">${p.metodo_pago}</span></td>
                    <td>${p.referencia || '<span style="color: var(--text-secondary);">-</span>'}</td>
                    <td><small>${p.registrado_por || 'admin'}</small></td>
                `;
                historyBody.appendChild(tr);
            });
        }

    } catch (err) {
        showToast("Error al cargar datos de comisiones: " + err.message, "danger");
    }
}

// Modal to edit Employee Profile & FSE Details
window.openEditCommissionModal = async function(id, name) {
    openModal('Editar Ficha del Colaborador', `
        <div style="text-align: center; padding: 2rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
            Cargando datos fiscales y catálogos...
        </div>
    `, '');

    try {
        const depts = await api.getDepartments();
        const munis = await api.getMunicipalities();
        const employees = await api.getEmployees();
        const emp = employees.find(e => e.id === id) || {};

        const percent = emp.comision_porcentaje !== undefined ? emp.comision_porcentaje : 5.0;
        const baseSalary = emp.salario_base !== undefined ? emp.salario_base : 0.00;
        const docTipo = emp.documento_tipo || 'DUI';
        const docNum = emp.documento_numero || '';
        const selectedDept = emp.departamento_codigo || '';
        const selectedMuni = emp.municipio_codigo || '';
        const addressComp = emp.direccion_complemento || '';
        const tipoContrat = emp.tipo_contratacion || 'Servicios Profesionales';

        let deptOpts = `<option value="">-- Seleccionar Departamento --</option>`;
        depts.forEach(d => {
            deptOpts += `<option value="${d.id}" ${d.id === selectedDept ? 'selected' : ''}>${d.nombre}</option>`;
        });

        const bodyHTML = `
            <div style="max-height: 60vh; overflow-y: auto; padding-right: 0.5rem; text-align: left;">
                <p style="margin-bottom: 1.25rem; color: var(--text-secondary); font-size: 0.9rem;">
                    Completa los datos fiscales de <strong>${name}</strong> para habilitar la liquidación en Planilla y emisión de Facturas de Sujeto Excluido (FSE).
                </p>

                <div class="form-group" style="margin-bottom: 1rem;">
                    <label for="emp-contract">Tipo de Contratación</label>
                    <select id="emp-contract" class="form-control">
                        <option value="Servicios Profesionales" ${tipoContrat === 'Servicios Profesionales' ? 'selected' : ''}>Servicios Profesionales (Emite FSE)</option>
                        <option value="Planilla General" ${tipoContrat === 'Planilla General' ? 'selected' : ''}>Planilla General (Sin FSE)</option>
                    </select>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label for="emp-percent">Comisión de Ventas (%)</label>
                        <input type="number" id="emp-percent" class="form-control" value="${percent}" step="0.5" min="0" max="100">
                    </div>
                    <div class="form-group">
                        <label for="emp-salary">Salario Base Fijo ($)</label>
                        <input type="number" id="emp-salary" class="form-control" value="${baseSalary}" step="0.01" min="0">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label for="emp-doc-tipo">Tipo de Documento</label>
                        <select id="emp-doc-tipo" class="form-control">
                            <option value="DUI" ${docTipo === 'DUI' ? 'selected' : ''}>DUI</option>
                            <option value="NIT" ${docTipo === 'NIT' ? 'selected' : ''}>NIT</option>
                            <option value="PASAPORTE" ${docTipo === 'PASAPORTE' ? 'selected' : ''}>Pasaporte</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="emp-doc-num">Número de Documento</label>
                        <input type="text" id="emp-doc-num" class="form-control" value="${docNum}" placeholder="00000000-0">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label for="emp-dept">Departamento (Hacienda)</label>
                        <select id="emp-dept" class="form-control" onchange="filterEmpMunicipalities()">
                            ${deptOpts}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="emp-muni">Municipio (Hacienda)</label>
                        <select id="emp-muni" class="form-control">
                            <option value="">-- Seleccionar --</option>
                        </select>
                    </div>
                </div>

                <div class="form-group">
                    <label for="emp-address">Dirección Detallada (Lugar de Habitación/Servicio)</label>
                    <textarea id="emp-address" class="form-control" rows="2" style="resize: vertical;" placeholder="Pasaje, block, número de casa, colonia, etc.">${addressComp}</textarea>
                </div>
            </div>
        `;

        const footerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button class="btn btn-primary" onclick="submitEditEmployeeForm('${id}')">Guardar Ficha</button>
        `;

        window.localMunis = munis;
        window.selectedMuniCode = selectedMuni;

        openModal('Editar Ficha de Colaborador', bodyHTML, footerHTML);
        filterEmpMunicipalities();

    } catch (err) {
        showToast("Error al abrir ficha: " + err.message, "danger");
        closeModal();
    }
};

window.filterEmpMunicipalities = function() {
    const deptSelect = document.getElementById('emp-dept');
    const muniSelect = document.getElementById('emp-muni');
    if (!deptSelect || !muniSelect || !window.localMunis) return;

    const selectedDept = deptSelect.value;
    muniSelect.innerHTML = `<option value="">-- Seleccionar Municipio --</option>`;

    if (!selectedDept) return;

    const filtered = window.localMunis.filter(m => m.depto_id === selectedDept);
    filtered.forEach(m => {
        const isSelected = m.id === window.selectedMuniCode ? 'selected' : '';
        muniSelect.innerHTML += `<option value="${m.id}" ${isSelected}>${m.nombre}</option>`;
    });
};

window.submitEditEmployeeForm = async function(id) {
    const percent = parseFloat(document.getElementById('emp-percent').value);
    const salary = parseFloat(document.getElementById('emp-salary').value);
    const docTipo = document.getElementById('emp-doc-tipo').value;
    const docNum = document.getElementById('emp-doc-num').value.trim();
    const dept = document.getElementById('emp-dept').value;
    const muni = document.getElementById('emp-muni').value;
    const address = document.getElementById('emp-address').value.trim();
    const contract = document.getElementById('emp-contract').value;

    if (isNaN(percent) || percent < 0 || percent > 100) {
        showToast("Porcentaje de comisión inválido", "warning");
        return;
    }
    if (isNaN(salary) || salary < 0) {
        showToast("Salario base inválido", "warning");
        return;
    }

    try {
        const payload = {
            comision_porcentaje: percent,
            salario_base: salary,
            documento_tipo: docTipo,
            documento_numero: docNum,
            departamento_codigo: dept,
            municipio_codigo: muni,
            direccion_complemento: address,
            tipo_contratacion: contract
        };

        await api.updateEmployee(id, payload);
        closeModal();
        showToast("Ficha del colaborador actualizada con éxito.", "success");
        await renderEmpleados(document.getElementById('main-content'));
    } catch(err) {
        showToast(`Error al guardar: ${err.message}`, "danger");
    }
};

// Modal to Register Commission Payment
window.openPayCommissionModal = function(email, name, pendingAmount) {
    const today = new Date().toISOString().split('T')[0];

    const bodyHTML = `
        <div class="form-group" style="margin-bottom: 1.5rem;">
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">Registrando pago de comisión para: <strong>${name}</strong> (${email})</p>
            <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.2); padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 500;">Saldo Pendiente de Pago:</span>
                <span style="font-size: 1.25rem; font-weight: 700; color: #f59e0b;">$${pendingAmount.toFixed(2)}</span>
            </div>
            
            <label for="pay-amount">Monto a Pagar ($)</label>
            <input type="number" id="pay-amount" class="form-control" value="${pendingAmount.toFixed(2)}" step="0.01" min="0.01" style="font-size: 1.25rem; font-weight: 700; color: var(--color-entregado); padding: 0.6rem;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
            <div class="form-group">
                <label for="pay-date">Fecha de Pago</label>
                <input type="date" id="pay-date" class="form-control" value="${today}">
            </div>
            <div class="form-group">
                <label for="pay-method">Método de Pago</label>
                <select id="pay-method" class="form-control">
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Depósito">Depósito Bancario</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Pago Móvil">Pago Móvil / Chivo Wallet</option>
                </select>
            </div>
        </div>

        <div class="form-group">
            <label for="pay-reference">Referencia / No. Comprobante</label>
            <input type="text" id="pay-reference" class="form-control" placeholder="Ej. Transf #928312 o Recibo #12">
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" style="background-color: var(--color-entregado); border-color: var(--color-entregado);" onclick="submitPayCommissionForm('${(email || '').replace(/'/g, "\\'")}', '${(name || '').replace(/'/g, "\\'")}')">Registrar Pago</button>
    `;

    openModal('Registrar Pago de Comisión', bodyHTML, footerHTML);
};

window.submitPayCommissionForm = async function(email, name) {
    const amountInput = document.getElementById('pay-amount');
    const dateInput = document.getElementById('pay-date');
    const methodInput = document.getElementById('pay-method');
    const refInput = document.getElementById('pay-reference');

    const amount = parseFloat(amountInput.value);
    const date = dateInput.value;
    const method = methodInput.value;
    const ref = refInput.value.trim();

    if (isNaN(amount) || amount <= 0) {
        showToast("El monto debe ser mayor a cero.", "warning");
        return;
    }

    if (!date) {
        showToast("La fecha de pago es requerida.", "warning");
        return;
    }

    const registradoPor = window.currentProfile ? window.currentProfile.nombre : "admin";

    try {
        const paymentPayload = {
            vendedor_email: email,
            vendedor_nombre: name,
            monto_pagado: amount,
            fecha_pago: date,
            metodo_pago: method,
            referencia: ref,
            registrado_por: registradoPor
        };

        await api.registerCommissionPayment(paymentPayload);
        closeModal();
        showToast(`¡Pago de $${amount.toFixed(2)} registrado con éxito!`, "success");
        await renderEmpleados(document.getElementById('main-content'));
    } catch(err) {
        showToast(`Error al registrar el pago: ${err.message}`, "danger");
    }
};
