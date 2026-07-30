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
        // 1. Fetch data from Firestore
        const employees = await api.getEmployees();
        
        let dashboardMetrics = { advisors: [] };
        try {
            dashboardMetrics = await api.getDashboardMetrics();
        } catch (e) {
            console.warn("Could not fetch metrics (Firestore quota block). Using local computation fallbacks.", e);
        }

        let allPayments = [];
        try {
            allPayments = await api.getCommissionPayments();
        } catch (e) {
            console.warn("Could not fetch payments (Firestore quota block).", e);
        }

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
                <td><strong>${emp.nombre}</strong><br><small style="color: var(--text-secondary);">${emp.area || 'Ventas'}</small></td>
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
                        <button class="btn btn-secondary btn-sm" onclick="openEditCommissionModal('${emp.id}', '${emp.nombre.replace(/'/g, "\\'")}', ${emp.comision_porcentaje || 5})" title="Editar Porcentaje">
                            <i class="fa-solid fa-pen-to-square"></i> Editar %
                        </button>
                        <button class="btn btn-primary btn-sm" style="background-color: var(--color-entregado); border-color: var(--color-entregado);" onclick="openPayCommissionModal('${emp.correo.replace(/'/g, "\\'")}', '${emp.nombre.replace(/'/g, "\\'")}', ${pending})" title="Registrar Pago">
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

// Modal to edit Commission Percentage
window.openEditCommissionModal = function(id, name, currentPercent) {
    const bodyHTML = `
        <div class="form-group">
            <p style="margin-bottom: 1.25rem; color: var(--text-secondary);">Ajusta el porcentaje de comisión para la asesora <strong>${name}</strong>.</p>
            <label for="emp-percent">Porcentaje de Comisión (%)</label>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                <input type="number" id="emp-percent" class="form-control" value="${currentPercent}" step="0.5" min="0" max="100" style="font-size: 1.5rem; font-weight: 700; text-align: center; width: 120px;">
                <span style="font-size: 1.5rem; font-weight: 700;">%</span>
            </div>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="submitEditCommissionForm('${id}')">Guardar Ajuste</button>
    `;

    openModal('Ajustar Porcentaje de Comisión', bodyHTML, footerHTML);
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
        <button class="btn btn-primary" style="background-color: var(--color-entregado); border-color: var(--color-entregado);" onclick="submitPayCommissionForm('${email.replace(/'/g, "\\'")}', '${name.replace(/'/g, "\\'")}')">Registrar Pago</button>
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
