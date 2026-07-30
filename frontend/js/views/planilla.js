// View: Planilla (Payroll and Sujeto Excluido FSE Billing)
async function renderPlanilla(container) {
    // Default to current month (YYYY-MM)
    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7); // "YYYY-MM"
    
    // Check if there is a selected month in memory, otherwise set current
    if (!window.selectedPayrollMonth) {
        window.selectedPayrollMonth = currentMonthStr;
    }

    container.innerHTML = `
        <div class="fade-in">
            <!-- Filter Bar -->
            <div class="card" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; padding: 1.25rem 1.5rem;">
                <div>
                    <h3 style="margin: 0; font-weight: 700;"><i class="fa-solid fa-file-invoice-dollar"></i> Módulo Planillero</h3>
                    <p style="color: var(--text-secondary); margin: 0.25rem 0 0 0; font-size: 0.85rem;">Pago de Servicios Profesionales con emisión de Factura de Sujeto Excluido (FSE)</p>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <label for="payroll-month" style="font-weight: 500; white-space: nowrap; margin: 0;">Periodo Planilla:</label>
                    <select id="payroll-month" class="form-control" style="width: auto; min-width: 160px; font-weight: 600;" onchange="changePayrollMonth(this.value)">
                        <!-- Generar opciones de meses -->
                    </select>
                </div>
            </div>

            <!-- Stats Bar -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="card" style="display: flex; align-items: center; gap: 1rem; padding: 1.25rem;">
                    <div style="width: 45px; height: 45px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <i class="fa-solid fa-calculator"></i>
                    </div>
                    <div>
                        <h5 style="color: var(--text-secondary); margin-bottom: 0.20rem; font-size: 0.85rem;">Total Honorarios (Bruto)</h5>
                        <h3 id="plan-bruto" style="font-weight: 700; margin: 0;">$0.00</h3>
                    </div>
                </div>
                <div class="card" style="display: flex; align-items: center; gap: 1rem; padding: 1.25rem;">
                    <div style="width: 45px; height: 45px; border-radius: 50%; background: rgba(239, 68, 6 red, 0.1); color: var(--color-registrado); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <i class="fa-solid fa-percent"></i>
                    </div>
                    <div>
                        <h5 style="color: var(--text-secondary); margin-bottom: 0.20rem; font-size: 0.85rem;">Retención Renta (10%)</h5>
                        <h3 id="plan-renta" style="font-weight: 700; margin: 0; color: var(--color-registrado);">$0.00</h3>
                    </div>
                </div>
                <div class="card" style="display: flex; align-items: center; gap: 1rem; padding: 1.25rem;">
                    <div style="width: 45px; height: 45px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); color: var(--color-entregado); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <i class="fa-solid fa-money-check-dollar"></i>
                    </div>
                    <div>
                        <h5 style="color: var(--text-secondary); margin-bottom: 0.20rem; font-size: 0.85rem;">Monto Neto a Pagar</h5>
                        <h3 id="plan-neto" style="font-weight: 700; margin: 0; color: var(--color-entregado);">$0.00</h3>
                    </div>
                </div>
                <div class="card" style="display: flex; align-items: center; gap: 1rem; padding: 1.25rem;">
                    <div style="width: 45px; height: 45px; border-radius: 50%; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <i class="fa-solid fa-signature"></i>
                    </div>
                    <div>
                        <h5 style="color: var(--text-secondary); margin-bottom: 0.20rem; font-size: 0.85rem;">FSE Emitidas (Hacienda)</h5>
                        <h3 id="plan-fse-count" style="font-weight: 700; margin: 0; color: #8b5cf6;">0 / 0</h3>
                    </div>
                </div>
            </div>

            <!-- Payroll List Card -->
            <div class="card">
                <h3 style="margin-bottom: 1.5rem;"><i class="fa-solid fa-list-check"></i> Detalle de Liquidaciones</h3>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Colaborador</th>
                                <th>Salario Fijo</th>
                                <th>Comisiones del Mes</th>
                                <th>Monto Bruto</th>
                                <th>Retención (10%)</th>
                                <th>Neto a Pagar</th>
                                <th>Estado</th>
                                <th>Comprobante / DTE 14</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="payroll-list-body">
                            <tr>
                                <td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                                    Calculando planilla de periodos...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Render Period Selection Dropdown
    populateMonthOptions();
    await loadPayrollData();
}

function populateMonthOptions() {
    const select = document.getElementById('payroll-month');
    if (!select) return;
    
    // Generate options for the last 6 months and next 2 months
    const months = [];
    const now = new Date();
    
    // Start from 6 months ago
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    
    for (let i = 0; i < 8; i++) {
        const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
        const val = d.toISOString().slice(0, 7); // "YYYY-MM"
        
        // Month name in Spanish
        const label = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);
        
        months.push({ val, label: capitalizedLabel });
    }
    
    select.innerHTML = '';
    months.forEach(m => {
        const isSelected = m.val === window.selectedPayrollMonth ? 'selected' : '';
        select.innerHTML += `<option value="${m.val}" ${isSelected}>${m.label}</option>`;
    });
}

window.changePayrollMonth = async function(monthVal) {
    window.selectedPayrollMonth = monthVal;
    await loadPayrollData();
};

async function loadPayrollData() {
    const listBody = document.getElementById('payroll-list-body');
    if (!listBody) return;

    try {
        const employees = await api.getEmployees();
        const orders = await api.getOrders();
        
        // Fetch payroll payments registered for this month
        let payrollPayments = [];
        try {
            payrollPayments = await api.getPayrollPayments(window.selectedPayrollMonth);
        } catch (e) {
            console.warn("Could not fetch payroll payments (Firestore quota block).", e);
        }

        listBody.innerHTML = '';

        if (employees.length === 0) {
            listBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                        No se encontraron colaboradores registrados en la base de datos.
                    </td>
                </tr>
            `;
            return;
        }

        let totalBruto = 0;
        let totalRenta = 0;
        let totalNeto = 0;
        let paidCount = 0;

        employees.forEach(emp => {
            const baseSalary = parseFloat(emp.salario_base) || 0.00;

            // Calculate commissions for this employee in the selected month
            // Filter completed/non-cancelled orders for this employee and month
            const empMonthOrders = orders.filter(o => 
                o.usuario === emp.correo && 
                o.estado !== 'Cancelado' && 
                o.fecha_pedido && 
                o.fecha_pedido.startsWith(window.selectedPayrollMonth)
            );

            const commRate = parseFloat(emp.comision_porcentaje || 5.0) / 100.0;
            const monthCommission = empMonthOrders.reduce((sum, o) => sum + (parseFloat(o.monto_total || 0) * commRate), 0);

            const bruto = baseSalary + monthCommission;
            const renta = bruto * 0.10;
            const neto = bruto - renta;

            // Check if already paid
            const payment = payrollPayments.find(p => p.vendedor_email === emp.correo && p.mes === window.selectedPayrollMonth);
            const isPaid = !!payment;

            if (isPaid) {
                paidCount++;
            }

            totalBruto += bruto;
            totalRenta += renta;
            totalNeto += neto;

            const tr = document.createElement('tr');
            
            // Document status tag
            let docStatusHTML = `<span style="color: var(--text-secondary); font-size: 0.85rem;">Sin Emitir</span>`;
            if (isPaid) {
                if (payment.controlNumber) {
                    const linkUrl = payment.pdfUrl || `https://admin.facturallama.com/dte/pdf/${payment.generationCode}`;
                    docStatusHTML = `
                        <div style="display: flex; flex-direction: column; gap: 0.15rem;">
                            <span style="font-size: 0.75rem; font-family: monospace; color: var(--primary); font-weight: bold;">${payment.controlNumber}</span>
                            <a href="${linkUrl}" target="_blank" style="color: var(--color-entregado); font-size: 0.8rem; display: flex; align-items: center; gap: 0.25rem; text-decoration: none;">
                                <i class="fa-solid fa-file-pdf"></i> Descargar PDF
                            </a>
                        </div>
                    `;
                } else {
                    docStatusHTML = `
                        <div style="display: flex; flex-direction: column;">
                            <span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--color-entregado); font-size: 0.75rem;">Registrado Local</span>
                            <small style="color: var(--text-secondary); font-size: 0.75rem; font-family: monospace;">${payment.generationCode.slice(0, 8)}</small>
                        </div>
                    `;
                }
            }

            // Action buttons
            let actionBtnHTML = '';
            if (!isPaid) {
                const missingTaxData = !emp.documento_tipo || !emp.documento_numero || !emp.departamento_codigo || !emp.municipio_codigo || !emp.direccion_complemento;
                
                if (missingTaxData) {
                    actionBtnHTML = `
                        <button class="btn btn-secondary btn-sm" onclick="routeTo(null, 'empleados')" style="background-color: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3); color: #f59e0b; padding: 0.4rem 0.75rem; font-size: 0.75rem;">
                            <i class="fa-solid fa-triangle-exclamation"></i> Completar Ficha
                        </button>
                    `;
                } else {
                    actionBtnHTML = `
                        <button class="btn btn-primary btn-sm" style="background-color: var(--color-entregado); border-color: var(--color-entregado); padding: 0.4rem 0.75rem; font-size: 0.75rem;" onclick="payEmployeeModal('${emp.id}', '${emp.nombre.replace(/'/g, "\\'")}', ${baseSalary}, ${monthCommission})">
                            <i class="fa-solid fa-credit-card"></i> Pagar y Emitir FSE
                        </button>
                    `;
                }
            } else {
                actionBtnHTML = `
                    <button class="btn btn-secondary btn-sm" disabled style="opacity: 0.6; padding: 0.4rem 0.75rem; font-size: 0.75rem;">
                        <i class="fa-solid fa-check-double"></i> Liquidado
                    </button>
                `;
            }

            tr.innerHTML = `
                <td>
                    <strong>${emp.nombre}</strong><br>
                    <small style="color: var(--text-secondary);">${emp.correo}</small>
                </td>
                <td>$${baseSalary.toFixed(2)}</td>
                <td>$${monthCommission.toFixed(2)}</td>
                <td><strong style="color: #f59e0b;">$${bruto.toFixed(2)}</strong></td>
                <td><span style="color: var(--color-registrado); font-weight: 500;">$${renta.toFixed(2)}</span></td>
                <td><strong style="color: var(--color-entregado); font-size: 1.05rem;">$${neto.toFixed(2)}</strong></td>
                <td>
                    <span class="badge ${isPaid ? 'badge-entregado' : 'badge-registrado'}">
                        ${isPaid ? 'Pagado' : 'Pendiente'}
                    </span>
                </td>
                <td>${docStatusHTML}</td>
                <td>${actionBtnHTML}</td>
            `;

            listBody.appendChild(tr);
        });

        // Update summaries card values
        document.getElementById('plan-bruto').innerText = `$${totalBruto.toFixed(2)}`;
        document.getElementById('plan-renta').innerText = `$${totalRenta.toFixed(2)}`;
        document.getElementById('plan-neto').innerText = `$${totalNeto.toFixed(2)}`;
        document.getElementById('plan-fse-count').innerText = `${paidCount} / ${employees.length}`;

    } catch (err) {
        showToast("Error al cargar la planilla: " + err.message, "danger");
    }
}

// Confirmation Pay Modal
window.payEmployeeModal = function(id, name, baseSalary, commission) {
    const gross = baseSalary + commission;
    const renta = gross * 0.10;
    const net = gross - renta;

    const bodyHTML = `
        <div style="text-align: left;">
            <p style="margin-bottom: 1.25rem; color: var(--text-secondary);">
                Estás a punto de liquidar los honorarios por servicios profesionales de <strong>${name}</strong> para el periodo <strong>${window.selectedPayrollMonth}</strong>.
            </p>
            
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 1.25rem; border-radius: 6px; margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Honorarios de Ventas (Comisiones):</span>
                    <span style="font-weight: 600;">$${commission.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                    <span>Sueldo Base Fijo:</span>
                    <span style="font-weight: 600;">$${baseSalary.toFixed(2)}</span>
                </div>
                <div style="height: 1px; background: var(--border-color); margin: 0.75rem 0;"></div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-weight: 600;">
                    <span>Monto Bruto Total:</span>
                    <span style="color: #f59e0b;">$${gross.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: var(--color-registrado);">
                    <span>Retención Renta (10%):</span>
                    <span>-$${renta.toFixed(2)}</span>
                </div>
                <div style="height: 1px; background: var(--border-color); margin: 0.75rem 0;"></div>
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.2rem;">
                    <span>Líquido a Depositar (Neto):</span>
                    <span style="color: var(--color-entregado);">$${net.toFixed(2)}</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div class="form-group">
                    <label for="p-pay-method">Método de Pago</label>
                    <select id="p-pay-method" class="form-control">
                        <option value="Transferencia">Transferencia Bancaria</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Pago Móvil">Pago Móvil</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="p-pay-ref">Referencia de Transferencia</label>
                    <input type="text" id="p-pay-ref" class="form-control" placeholder="Ej. Ref #992819">
                </div>
            </div>
            
            <p style="font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: flex-start; gap: 0.5rem; background: rgba(59,130,246,0.05); padding: 0.75rem; border-radius: 4px; margin: 0;">
                <i class="fa-solid fa-circle-info" style="color: var(--primary); margin-top: 0.15rem;"></i>
                Al confirmar, se enviarán automáticamente los datos fiscales a FacturaLlama para emitir la <strong>Factura de Sujeto Excluido (FSE)</strong> autorizada por el Ministerio de Hacienda de El Salvador.
            </p>
        </div>
    `;

    const footerHTML = `
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary" style="background-color: var(--color-entregado); border-color: var(--color-entregado);" onclick="executePayrollPayment('${id}', ${commission}, ${baseSalary})">Confirmar y Emitir FSE</button>
    `;

    openModal('Confirmar Liquidación Planilla', bodyHTML, footerHTML);
};

window.executePayrollPayment = async function(id, commission, base) {
    const methodSelect = document.getElementById('p-pay-method');
    const refInput = document.getElementById('p-pay-ref');

    const method = methodSelect.value;
    const ref = refInput.value.trim();

    // Show loading in modal
    openModal('Procesando Liquidación', `
        <div style="text-align: center; padding: 2rem;">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 1.5rem; display: block; margin-left: auto; margin-right: auto;"></i>
            <h3>Comunicándose con Hacienda...</h3>
            <p style="color: var(--text-secondary); margin-top: 0.5rem;">Emitiendo y firmando DTE de Sujeto Excluido en FacturaLlama Sandbox.</p>
        </div>
    `, '');

    try {
        const payload = {
            mes: window.selectedPayrollMonth,
            monto_comision: commission,
            monto_salario_base: base,
            metodo_pago: method,
            referencia: ref,
            registrado_por: window.currentProfile ? window.currentProfile.nombre : "admin"
        };

        const response = await api.payPayroll(id, payload);
        
        closeModal();
        showToast("Planilla liquidada y FSE emitida con éxito", "success");
        await loadPayrollData();
    } catch(err) {
        // Show error details inside modal
        const bodyHTML = `
            <div style="text-align: center; padding: 1.5rem;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: var(--color-registrado); margin-bottom: 1rem; display: block;"></i>
                <h3>Error de Emisión FSE</h3>
                <p style="color: var(--text-secondary); margin-top: 0.5rem; text-align: left; background: rgba(0,0,0,0.15); padding: 1rem; border-radius: 4px; font-family: monospace; font-size: 0.85rem;">
                    ${err.message}
                </p>
            </div>
        `;
        const footerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        `;
        openModal('Fallo en la Operación', bodyHTML, footerHTML);
    }
};
