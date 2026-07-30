// View: Planilla Semanal de Comisiones y DTE FSE
async function renderPlanilla(container) {
    // Default to current week (Monday to Sunday)
    const range = getDefaultWeekRange();
    if (!window.payrollStartDate) {
        window.payrollStartDate = range.start;
    }
    if (!window.payrollEndDate) {
        window.payrollEndDate = range.end;
    }

    container.innerHTML = `
        <div class="fade-in">
            <!-- Filter Bar -->
            <div class="card" style="margin-bottom: 2rem; padding: 1.25rem 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div>
                        <h3 style="margin: 0; font-weight: 700;"><i class="fa-solid fa-receipt"></i> Planilla Semanal de Comisiones</h3>
                        <p style="color: var(--text-secondary); margin: 0.25rem 0 0 0; font-size: 0.85rem;">
                            Liquidación semanal de comisiones por servicios profesionales y generación de FSE.
                        </p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <label style="font-weight: 500; font-size: 0.9rem; margin: 0; white-space: nowrap;">Desde:</label>
                            <input type="date" id="p-date-start" class="form-control" style="width: auto;" value="${window.payrollStartDate}" onchange="updatePayrollDates()">
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <label style="font-weight: 500; font-size: 0.9rem; margin: 0; white-space: nowrap;">Hasta:</label>
                            <input type="date" id="p-date-end" class="form-control" style="width: auto;" value="${window.payrollEndDate}" onchange="updatePayrollDates()">
                        </div>
                        <button class="btn btn-primary" onclick="loadWeeklyPayrollData()" style="padding: 0.55rem 1rem;">
                            <i class="fa-solid fa-rotate"></i> Calcular
                        </button>
                    </div>
                </div>
            </div>

            <!-- Stats Bar -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="card" style="display: flex; align-items: center; gap: 1rem; padding: 1.25rem;">
                    <div style="width: 45px; height: 45px; border-radius: 50%; background: rgba(59, 130, 246, 0.1); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                        <i class="fa-solid fa-calculator"></i>
                    </div>
                    <div>
                        <h5 style="color: var(--text-secondary); margin-bottom: 0.20rem; font-size: 0.85rem;">Total Comisiones (Bruto)</h5>
                        <h3 id="plan-bruto" style="font-weight: 700; margin: 0;">$0.00</h3>
                    </div>
                </div>
                <div class="card" style="display: flex; align-items: center; gap: 1rem; padding: 1.25rem;">
                    <div style="width: 45px; height: 45px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); color: var(--color-registrado); display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
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
                        <h5 style="color: var(--text-secondary); margin-bottom: 0.20rem; font-size: 0.85rem;">Monto Neto a Liquidar</h5>
                        <h3 id="plan-neto" style="font-weight: 700; margin: 0; color: var(--color-entregado);">$0.00</h3>
                    </div>
                </div>
            </div>

            <!-- Active Weekly Statement Checklist -->
            <div class="card" style="margin-bottom: 2rem;">
                <h3 style="margin-bottom: 1.25rem;"><i class="fa-solid fa-people-carry-hover"></i> Planilla por Pagar del Rango</h3>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Colaborador</th>
                                <th>Tipo Contratación</th>
                                <th>Pedidos Pendientes</th>
                                <th>Comisiones Pendientes</th>
                                <th>Retención (10%)</th>
                                <th>Monto Neto</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody id="payroll-list-body">
                            <tr>
                                <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
                                    Calculando comisiones pendientes...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Historical Log -->
            <div class="card">
                <h3 style="margin-bottom: 1.25rem;"><i class="fa-solid fa-clock-rotate-left"></i> Historial de Liquidaciones Emitidas</h3>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha Pago</th>
                                <th>Colaborador</th>
                                <th>Rango Liquidado</th>
                                <th>Tipo</th>
                                <th>Bruto (Comisión)</th>
                                <th>Retención (10%)</th>
                                <th>Neto Pagado</th>
                                <th>DTE / FSE Emitido</th>
                            </tr>
                        </thead>
                        <tbody id="history-list-body">
                            <tr>
                                <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                                    Cargando historial de pagos...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    await loadWeeklyPayrollData();
}

function getDefaultWeekRange() {
    const today = new Date();
    const day = today.getDay();
    // Monday is index 1. If today is Sunday (0), we go back 6 days. Else go back (day - 1) days.
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.getFullYear(), today.getMonth(), diffToMonday);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
    };
}

window.updatePayrollDates = function() {
    window.payrollStartDate = document.getElementById('p-date-start').value;
    window.payrollEndDate = document.getElementById('p-date-end').value;
};

async function loadWeeklyPayrollData() {
    const listBody = document.getElementById('payroll-list-body');
    const historyBody = document.getElementById('history-list-body');
    if (!listBody) return;

    try {
        const employees = await api.getEmployees();
        const orders = await api.getOrders();
        
        // Fetch all historical payroll payments
        let historicalPayments = [];
        try {
            historicalPayments = await api.getPayrollPayments();
        } catch (e) {
            console.warn("Could not fetch payroll historical payments.", e);
        }

        // Render History Table first
        if (historyBody) {
            historyBody.innerHTML = '';
            if (historicalPayments.length === 0) {
                historyBody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                            No se registran planillas de liquidación anteriores.
                        </td>
                    </tr>
                `;
            } else {
                historicalPayments.forEach(p => {
                    const dateStr = new Date(p.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    
                    let docHTML = `<span style="color: var(--text-secondary); font-size: 0.85rem;">Local (Sin DTE)</span>`;
                    if (p.controlNumber) {
                        const pdfUrl = p.pdfUrl || `https://admin.facturallama.com/dte/pdf/${p.generationCode}`;
                        docHTML = `
                            <div style="display: flex; flex-direction: column; gap: 0.15rem;">
                                <span style="font-family: monospace; font-size: 0.75rem; color: var(--primary); font-weight: bold;">${p.controlNumber}</span>
                                <a href="${pdfUrl}" target="_blank" style="color: var(--color-entregado); font-size: 0.8rem; display: flex; align-items: center; gap: 0.25rem; text-decoration: none;">
                                    <i class="fa-solid fa-file-pdf"></i> DTE PDF
                                </a>
                            </div>
                        `;
                    } else if (p.tipo_contratacion === 'Servicios Profesionales') {
                        docHTML = `<span style="font-family: monospace; font-size: 0.75rem; color: var(--color-registrado);">${p.id_fact.slice(0, 8)} (Fallo FSE)</span>`;
                    }

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${dateStr}</td>
                        <td><strong>${p.vendedor_nombre}</strong><br><small style="color: var(--text-secondary);">${p.vendedor_email}</small></td>
                        <td><small>${p.fecha_inicio} al ${p.fecha_fin}</small></td>
                        <td><span class="badge" style="background: rgba(255,255,255,0.06); color: #fff;">${p.tipo_contratacion}</span></td>
                        <td>$${(p.monto_bruto || 0).toFixed(2)}</td>
                        <td><span style="color: var(--color-registrado);">-$${(p.retencion_renta || 0).toFixed(2)}</span></td>
                        <td><strong style="color: var(--color-entregado); font-size: 1rem;">$${(p.monto_neto || 0).toFixed(2)}</strong></td>
                        <td>${docHTML}</td>
                    `;
                    historyBody.appendChild(tr);
                });
            }
        }

        // Render Active List Table
        listBody.innerHTML = '';
        if (employees.length === 0) {
            listBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                        No hay personal registrado en la base de datos.
                    </td>
                </tr>
            `;
            return;
        }

        let totalBruto = 0;
        let totalRenta = 0;
        let totalNeto = 0;
        let pendingColabs = 0;

        employees.forEach(emp => {
            const contractType = emp.tipo_contratacion || 'Servicios Profesionales';
            const commRate = parseFloat(emp.comision_porcentaje || 5.0) / 100.0;

            // Filter non-cancelled, pending commission orders in the selected date range for this adviser
            const empPendingOrders = orders.filter(o => 
                o.usuario === emp.correo &&
                o.estado !== 'Cancelado' &&
                o.estado_comision !== 'Pagada' &&
                o.fecha_pedido &&
                o.fecha_pedido >= window.payrollStartDate &&
                o.fecha_pedido <= window.payrollEndDate
            );

            if (empPendingOrders.length === 0) {
                // If they have no pending orders in this range, skip them (no payroll statement needed)
                return;
            }

            pendingColabs++;

            const orderComms = empPendingOrders.reduce((sum, o) => sum + (parseFloat(o.monto_total || 0) * commRate), 0);
            const bruto = orderComms; // Weekly is commission only
            const renta = contractType === 'Servicios Profesionales' ? bruto * 0.10 : 0.0;
            const neto = bruto - renta;

            totalBruto += bruto;
            totalRenta += renta;
            totalNeto += neto;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${emp.nombre}</strong><br>
                    <small style="color: var(--text-secondary);">${emp.correo}</small>
                </td>
                <td>
                    <span class="badge" style="background: rgba(59,130,246,0.1); color: var(--primary);">
                        ${contractType}
                    </span>
                </td>
                <td>
                    <strong style="color: #fff; font-size: 1.05rem;">${empPendingOrders.length} pedidos</strong>
                </td>
                <td><strong style="color: #f59e0b;">$${bruto.toFixed(2)}</strong></td>
                <td><span style="color: var(--color-registrado); font-weight: 500;">-$${renta.toFixed(2)}</span></td>
                <td><strong style="color: var(--color-entregado); font-size: 1.05rem;">$${neto.toFixed(2)}</strong></td>
                <td>
                    <button class="btn btn-primary btn-sm" style="padding: 0.45rem 0.8rem; font-size: 0.8rem;" onclick="openWeeklyBoletaModal('${emp.id}', '${emp.nombre.replace(/'/g, "\\'")}', '${contractType}')">
                        <i class="fa-solid fa-receipt"></i> Ver Boleta
                    </button>
                </td>
            `;
            listBody.appendChild(tr);
        });

        if (pendingColabs === 0) {
            listBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                        No hay comisiones pendientes de pago registradas en el rango de fechas seleccionado.
                    </td>
                </tr>
            `;
        }

        // Update statistics cards
        document.getElementById('plan-bruto').innerText = `$${totalBruto.toFixed(2)}`;
        document.getElementById('plan-renta').innerText = `$${totalRenta.toFixed(2)}`;
        document.getElementById('plan-neto').innerText = `$${totalNeto.toFixed(2)}`;

    } catch (err) {
        showToast("Error al cargar planilla: " + err.message, "danger");
    }
}

// Open Boleta Statement Receipt Modal
window.openWeeklyBoletaModal = async function(id, name, contractType) {
    // Show spinner inside modal first
    openModal('Cargando Boleta...', `
        <div style="text-align: center; padding: 2rem;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
            Buscando pedidos y calculando honorarios...
        </div>
    `, '');

    try {
        const employees = await api.getEmployees();
        const orders = await api.getOrders();
        const emp = employees.find(e => e.id === id) || {};

        const commRate = parseFloat(emp.comision_porcentaje || 5.0) / 100.0;
        
        // Filter orders
        const empPendingOrders = orders.filter(o => 
            o.usuario === emp.correo &&
            o.estado !== 'Cancelado' &&
            o.estado_comision !== 'Pagada' &&
            o.fecha_pedido &&
            o.fecha_pedido >= window.payrollStartDate &&
            o.fecha_pedido <= window.payrollEndDate
        );

        if (empPendingOrders.length === 0) {
            openModal('Boleta de Liquidación', `<p>No hay pedidos pendientes en este rango.</p>`, `<button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>`);
            return;
        }

        // Build list of orders rows
        let ordersRowsHTML = '';
        let grossTotal = 0;

        empPendingOrders.forEach(o => {
            const sale = parseFloat(o.monto_total || 0);
            const comm = sale * commRate;
            grossTotal += comm;

            ordersRowsHTML += `
                <tr>
                    <td><small style="font-family: monospace;">${o.numero_pedido || o.id.slice(0, 8)}</small></td>
                    <td><small>${o.fecha_pedido}</small></td>
                    <td><small>${o.cliente_nombre || 'S/N'}</small></td>
                    <td>$${sale.toFixed(2)}</td>
                    <td>${(commRate * 100).toFixed(1)}%</td>
                    <td style="font-weight: 600; color: #f59e0b;">$${comm.toFixed(2)}</td>
                </tr>
            `;
        });

        const renta = contractType === 'Servicios Profesionales' ? grossTotal * 0.10 : 0.0;
        const net = grossTotal - renta;

        // Is there missing tax information?
        const isTaxProfessional = contractType === 'Servicios Profesionales';
        const missingTaxData = isTaxProfessional && (!emp.documento_tipo || !emp.documento_numero || !emp.departamento_codigo || !emp.municipio_codigo || !emp.direccion_complemento);

        let alertHTML = '';
        if (missingTaxData) {
            alertHTML = `
                <div style="background: rgba(239,68,68,0.1); color: var(--color-registrado); padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid rgba(239,68,68,0.3); font-size: 0.85rem; margin-bottom: 1rem;">
                    <i class="fa-solid fa-triangle-exclamation"></i> <strong>Datos fiscales incompletos:</strong> El colaborador debe tener registrado su DUI, Dirección y Códigos de Ubicación antes de emitir la FSE en Hacienda. Edita su ficha en la pestaña Personal.
                </div>
            `;
        }

        const bodyHTML = `
            <div style="max-height: 65vh; overflow-y: auto; padding-right: 0.5rem; text-align: left;">
                <div style="text-align: center; margin-bottom: 1.5rem; border-bottom: 2px dashed var(--border-color); padding-bottom: 1rem;">
                    <h4 style="margin: 0; font-weight: bold; color: var(--primary);">KODE PERFUMERÍA</h4>
                    <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">Boleta Dominical de Liquidación de Comisiones</p>
                    <p style="margin: 0.15rem 0 0 0; font-size: 0.75rem; font-family: monospace;">Rango: ${window.payrollStartDate} al ${window.payrollEndDate}</p>
                </div>

                ${alertHTML}

                <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div>
                        <h5 style="margin-bottom: 0.5rem; font-size: 0.85rem; text-transform: uppercase; color: var(--text-secondary);">Receptor</h5>
                        <p style="margin: 0; font-weight: bold;">${name}</p>
                        <p style="margin: 0.15rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">${emp.correo}</p>
                        <p style="margin: 0.15rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">Contratación: ${contractType}</p>
                    </div>
                    <div>
                        <h5 style="margin-bottom: 0.5rem; font-size: 0.85rem; text-transform: uppercase; color: var(--text-secondary);">Detalles Fiscales</h5>
                        <p style="margin: 0; font-size: 0.8rem;"><strong>Doc:</strong> ${emp.documento_tipo || '-'}: ${emp.documento_numero || '-'}</p>
                        <p style="margin: 0.15rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary);"><strong>Ubicación:</strong> ${emp.direccion_complemento ? 'Registrada' : 'Pendiente'}</p>
                    </div>
                </div>

                <h5 style="margin-bottom: 0.5rem; font-size: 0.85rem; text-transform: uppercase; color: var(--text-secondary);"><i class="fa-solid fa-box-open"></i> Pedidos incluidos en esta liquidación</h5>
                <div style="background: rgba(0,0,0,0.2); border-radius: 6px; padding: 0.5rem; margin-bottom: 1.5rem; border: 1px solid var(--border-color);">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;" class="table">
                        <thead>
                            <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                                <th style="padding: 0.4rem;">Ref</th>
                                <th style="padding: 0.4rem;">Fecha</th>
                                <th style="padding: 0.4rem;">Cliente</th>
                                <th style="padding: 0.4rem;">Monto</th>
                                <th style="padding: 0.4rem;">Com%</th>
                                <th style="padding: 0.4rem;">Comisión</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ordersRowsHTML}
                        </tbody>
                    </table>
                </div>

                <!-- Financial calculation -->
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 1.25rem; border-radius: 6px; margin-bottom: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Total Comisiones Brutas (${empPendingOrders.length} pedidos):</span>
                        <span style="font-weight: 600;">$${grossTotal.toFixed(2)}</span>
                    </div>
                    ${isTaxProfessional ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: var(--color-registrado);">
                        <span>Retención I.S.R. (10% Ley de Servicios Profesionales):</span>
                        <span>-$${renta.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div style="height: 1px; background: var(--border-color); margin: 0.75rem 0;"></div>
                    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.15rem;">
                        <span>Líquido Neto a Depositar:</span>
                        <span style="color: var(--color-entregado);">$${net.toFixed(2)}</span>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                    <div class="form-group">
                        <label for="w-pay-method">Método de Pago</label>
                        <select id="w-pay-method" class="form-control">
                            <option value="Transferencia">Transferencia Bancaria</option>
                            <option value="Efectivo">Efectivo</option>
                            <option value="Pago Móvil">Pago Móvil</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="w-pay-ref">Referencia de Pago</label>
                        <input type="text" id="w-pay-ref" class="form-control" placeholder="Ej. Ref #0012">
                    </div>
                </div>

                <div style="background: rgba(16,185,129,0.05); padding: 0.75rem; border-radius: 6px; border: 1px solid rgba(16,185,129,0.15); display: flex; align-items: flex-start; gap: 0.5rem;">
                    <input type="checkbox" id="w-verify-chk" style="margin-top: 0.25rem; transform: scale(1.15);" onchange="toggleBoletaSubmitButton()">
                    <label for="w-verify-chk" style="font-size: 0.85rem; font-weight: 500; cursor: pointer; color: var(--text-secondary); margin: 0;">
                        He verificado los pedidos enlistados, montos de comisiones y confirmo que los importes de esta boleta de liquidación son correctos.
                    </label>
                </div>
            </div>
        `;

        const submitDisabledAttr = 'disabled';
        const submitStyle = 'opacity: 0.5; background-color: var(--color-entregado); border-color: var(--color-entregado); cursor: not-allowed;';

        const footerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
            <button id="w-pay-btn" class="btn btn-primary" style="${submitStyle}" ${submitDisabledAttr} onclick="executeWeeklyPayrollPayment('${id}', '${contractType}', '${empPendingOrders.map(o => o.id).join(',')}', ${grossTotal})">
                <i class="fa-solid fa-check"></i> Registrar y Emitir FSE
            </button>
        `;

        openModal('Boleta de Liquidación Semanal', bodyHTML, footerHTML);

    } catch (err) {
        showToast("Error al cargar boleta: " + err.message, "danger");
        closeModal();
    }
};

window.toggleBoletaSubmitButton = function() {
    const chk = document.getElementById('w-verify-chk');
    const btn = document.getElementById('w-pay-btn');
    if (!chk || !btn) return;

    if (chk.checked) {
        btn.removeAttribute('disabled');
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
    } else {
        btn.setAttribute('disabled', 'true');
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    }
};

window.executeWeeklyPayrollPayment = async function(id, contractType, orderIdsStr, totalGross) {
    const orderIds = orderIdsStr.split(',');
    const method = document.getElementById('w-pay-method').value;
    const ref = document.getElementById('w-pay-ref').value.trim();

    openModal('Procesando Liquidación', `
        <div style="text-align: center; padding: 2rem;">
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 3rem; color: var(--primary); margin-bottom: 1.5rem; display: block; margin-left: auto; margin-right: auto;"></i>
            <h3>Procesando Boleta de Liquidación...</h3>
            <p style="color: var(--text-secondary); margin-top: 0.5rem;">
                ${contractType === 'Servicios Profesionales' ? 'Comunicándose con Hacienda para firmar y emitir DTE de Sujeto Excluido.' : 'Registrando planilla local en la base de datos.'}
            </p>
        </div>
    `, '');

    try {
        const payload = {
            orderIds,
            fecha_inicio: window.payrollStartDate,
            fecha_fin: window.payrollEndDate,
            metodo_pago: method,
            referencia: ref,
            registrado_por: window.currentProfile ? window.currentProfile.nombre : 'admin'
        };

        const res = await api.payWeeklyPayroll(id, payload);
        closeModal();

        const successMsg = contractType === 'Servicios Profesionales' 
            ? "Boleta de liquidación procesada y DTE FSE emitido correctamente." 
            : "Boleta de liquidación registrada con éxito (sin DTE).";

        showToast(successMsg, "success");
        await loadWeeklyPayrollData();

    } catch (err) {
        const bodyHTML = `
            <div style="text-align: center; padding: 1.5rem;">
                <i class="fa-solid fa-circle-xmark" style="font-size: 3rem; color: var(--color-registrado); margin-bottom: 1rem; display: block;"></i>
                <h3>Fallo al Registrar Boleta</h3>
                <p style="color: var(--text-secondary); margin-top: 0.5rem; text-align: left; background: rgba(0,0,0,0.15); padding: 1rem; border-radius: 4px; font-family: monospace; font-size: 0.85rem;">
                    ${err.message}
                </p>
            </div>
        `;
        const footerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        `;
        openModal('Error de Liquidación', bodyHTML, footerHTML);
    }
};
