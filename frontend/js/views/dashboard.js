// View: Dashboard Metrics
async function renderDashboard(container) {
    container.innerHTML = `
        <div class="fade-in">
            <!-- Metrics Cards Grid -->
            <div class="dashboard-grid">
                <!-- Monthly Goal Compliance Card -->
                <div class="card metric-card" style="grid-column: span 2;">
                    <div style="flex-grow: 1; margin-right: 1.5rem;">
                        <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">Cumplimiento Meta Mensual</span>
                        <div style="display: flex; align-items: baseline; gap: 0.5rem; margin: 0.5rem 0;">
                            <h2 style="font-size: 2rem; font-weight: 800;" id="dash-current-sales">$0.00</h2>
                            <span style="color: var(--text-muted); font-size: 0.9rem;">de <span id="dash-goal">$0.00</span></span>
                        </div>
                        <div style="width: 100%; height: 10px; background-color: var(--bg-secondary); border-radius: 5px; margin-top: 0.5rem; overflow: hidden; border: 1px solid var(--border-color);">
                            <div id="dash-goal-progress" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--color-enviado)); transition: width 1s ease-out; border-radius: 5px;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">
                            <span id="dash-progress-percent">0.0% alcanzado</span>
                            <span id="dash-remaining">Faltan $0.00</span>
                        </div>
                    </div>
                    <div class="metric-icon" style="background-color: rgba(99, 102, 241, 0.15); color: var(--primary);">
                        <i class="fa-solid fa-bullseye"></i>
                    </div>
                </div>

                <!-- Total Orders Card -->
                <div class="card metric-card">
                    <div class="metric-info">
                        <h3>Pedidos Registrados</h3>
                        <p id="dash-orders-count">0</p>
                    </div>
                    <div class="metric-icon" style="background-color: rgba(6, 182, 212, 0.15); color: var(--color-enviado);">
                        <i class="fa-solid fa-cart-arrow-down"></i>
                    </div>
                </div>

                <!-- Active Clients Card -->
                <div class="card metric-card">
                    <div class="metric-info">
                        <h3>Clientes Registrados</h3>
                        <p id="dash-clients-count">0</p>
                    </div>
                    <div class="metric-icon" style="background-color: rgba(16, 185, 129, 0.15); color: var(--color-entregado);">
                        <i class="fa-solid fa-users"></i>
                    </div>
                </div>
            </div>

            <!-- Charts Section -->
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                <!-- Daily Sales Line Chart -->
                <div class="card" style="min-height: 350px; display: flex; flex-direction: column;">
                    <h3 style="margin-bottom: 1rem;"><i class="fa-solid fa-chart-area"></i> Ventas Diarias (Mes Actual)</h3>
                    <div style="flex-grow: 1; position: relative; height: 260px;">
                        <canvas id="chart-daily-sales"></canvas>
                    </div>
                </div>

                <!-- Payment Methods Donut Chart -->
                <div class="card" style="min-height: 350px; display: flex; flex-direction: column;">
                    <h3 style="margin-bottom: 1rem;"><i class="fa-solid fa-wallet"></i> Métodos de Pago</h3>
                    <div style="flex-grow: 1; position: relative; height: 260px; display: flex; align-items: center; justify-content: center;">
                        <canvas id="chart-payment-methods"></canvas>
                    </div>
                </div>
            </div>

            <!-- Advisors & Promos Section -->
            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1.5rem; flex-wrap: wrap;">
                <!-- Sales by Advisor -->
                <div class="card">
                    <h3 style="margin-bottom: 1rem;"><i class="fa-solid fa-award"></i> Ventas y Comisiones por Asesor</h3>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Asesor</th>
                                    <th>Total Ventas</th>
                                    <th>% Comis</th>
                                    <th>Comisión</th>
                                </tr>
                            </thead>
                            <tbody id="dash-advisors-list">
                                <tr>
                                    <td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 1.5rem;">
                                        Cargando comisiones...
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Promos & Bundles Sales -->
                <div class="card" style="display: flex; flex-direction: column;">
                    <h3 style="margin-bottom: 1rem;"><i class="fa-solid fa-boxes-stacked"></i> Volumen por Tipo de Pedido</h3>
                    <div style="display: flex; flex-direction: column; gap: 1rem; flex-grow: 1; justify-content: center;">
                        <!-- Promo 1 -->
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.9rem;">
                                <span><strong>Pedidos Individuales</strong> (1 Perfume)</span>
                                <span id="promo-single-count">0 pedidos</span>
                            </div>
                            <div style="width: 100%; height: 8px; background-color: var(--bg-secondary); border-radius: 4px; border: 1px solid var(--border-color); overflow: hidden;">
                                <div id="promo-single-progress" style="width: 0%; height: 100%; background-color: var(--primary); border-radius: 4px;"></div>
                            </div>
                        </div>

                        <!-- Promo 2 -->
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.9rem;">
                                <span><strong>Pedidos Dúos</strong> (2 Perfumes)</span>
                                <span id="promo-double-count">0 pedidos</span>
                            </div>
                            <div style="width: 100%; height: 8px; background-color: var(--bg-secondary); border-radius: 4px; border: 1px solid var(--border-color); overflow: hidden;">
                                <div id="promo-double-progress" style="width: 0%; height: 100%; background-color: var(--color-insumos); border-radius: 4px;"></div>
                            </div>
                        </div>

                        <!-- Promo 3 -->
                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem; font-size: 0.9rem;">
                                <span><strong>Pedidos Tríos+</strong> (3 o más Perfumes)</span>
                                <span id="promo-triple-count">0 pedidos</span>
                            </div>
                            <div style="width: 100%; height: 8px; background-color: var(--bg-secondary); border-radius: 4px; border: 1px solid var(--border-color); overflow: hidden;">
                                <div id="promo-triple-progress" style="width: 0%; height: 100%; background-color: var(--color-entregado); border-radius: 4px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    try {
        const [metrics, clients, orders] = await Promise.all([
            api.getDashboardMetrics(),
            api.getClients(),
            api.getOrders()
        ]);

        if (!metrics) {
            // If offline and no cached metrics exist, render a placeholder message
            document.getElementById('dash-current-sales').innerText = "Offline";
            return;
        }

        // 1. Fill basic numeric cards
        document.getElementById('dash-current-sales').innerText = `$${metrics.current_month_sales.toFixed(2)}`;
        document.getElementById('dash-goal').innerText = `$${metrics.goal.toFixed(2)}`;
        document.getElementById('dash-orders-count').innerText = orders.length;
        document.getElementById('dash-clients-count').innerText = clients.length;

        // Progress bar values
        const pct = Math.min(100, metrics.compliance_percentage);
        document.getElementById('dash-goal-progress').style.width = `${pct}%`;
        document.getElementById('dash-progress-percent').innerText = `${metrics.compliance_percentage.toFixed(1)}% alcanzado`;
        
        const rem = metrics.goal - metrics.current_month_sales;
        document.getElementById('dash-remaining').innerText = rem > 0 ? `Faltan $${rem.toFixed(2)}` : '¡Meta Superada!';

        // 2. Render Advisors table
        const advisorsList = document.getElementById('dash-advisors-list');
        advisorsList.innerHTML = '';
        if (metrics.advisors.length === 0) {
            advisorsList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No hay registros de ventas por asesor.</td></tr>`;
        } else {
            metrics.advisors.sort((a,b) => b.ventas - a.ventas).forEach(adv => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${adv.nombre}</strong></td>
                    <td>$${adv.ventas.toFixed(2)}</td>
                    <td>${adv.comision_porcentaje}%</td>
                    <td><strong style="color: var(--color-entregado);">$${adv.comision.toFixed(2)}</strong></td>
                `;
                advisorsList.appendChild(tr);
            });
        }

        // 3. Render Promo quantities and percentages
        const promos = metrics.promos;
        const totalPromos = (promos['1 Perfume'] || 0) + (promos['2 Perfumes'] || 0) + (promos['3+ Perfumes'] || 0) || 1;

        const singlePct = ((promos['1 Perfume'] || 0) / totalPromos) * 100;
        const doublePct = ((promos['2 Perfumes'] || 0) / totalPromos) * 100;
        const triplePct = ((promos['3+ Perfumes'] || 0) / totalPromos) * 100;

        document.getElementById('promo-single-count').innerText = `${promos['1 Perfume'] || 0} (${singlePct.toFixed(1)}%)`;
        document.getElementById('promo-single-progress').style.width = `${singlePct}%`;

        document.getElementById('promo-double-count').innerText = `${promos['2 Perfumes'] || 0} (${doublePct.toFixed(1)}%)`;
        document.getElementById('promo-double-progress').style.width = `${doublePct}%`;

        document.getElementById('promo-triple-count').innerText = `${promos['3+ Perfumes'] || 0} (${triplePct.toFixed(1)}%)`;
        document.getElementById('promo-triple-progress').style.width = `${triplePct}%`;

        // 4. Create Daily Sales Chart (Chart.js)
        const dailyCtx = document.getElementById('chart-daily-sales').getContext('2d');
        const dailyLabels = metrics.daily_sales.map(d => {
            // E.g. YYYY-MM-DD to DD/MM
            const parts = d.date.split('-');
            return `${parts[2]}/${parts[1]}`;
        });
        const dailyData = metrics.daily_sales.map(d => d.amount);

        new Chart(dailyCtx, {
            type: 'line',
            data: {
                labels: dailyLabels,
                datasets: [{
                    label: 'Ventas ($)',
                    data: dailyData,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: '#6366f1',
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });

        // 5. Create Payment Methods Chart
        const payCtx = document.getElementById('chart-payment-methods').getContext('2d');
        const payMethods = Object.keys(metrics.payment_methods);
        const payValues = Object.values(metrics.payment_methods);

        new Chart(payCtx, {
            type: 'doughnut',
            data: {
                labels: payMethods,
                datasets: [{
                    data: payValues,
                    backgroundColor: ['#6366f1', '#f97316', '#10b981', '#06b6d4', '#6b7280'],
                    borderWidth: 2,
                    borderColor: '#0f172a'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#94a3b8', font: { size: 11 } }
                    }
                }
            }
        });

    } catch (err) {
        showToast("Error al cargar dashboard: " + err.message, "danger");
    }
}
