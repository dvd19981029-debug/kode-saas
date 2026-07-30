// View: Configuracion settings
async function renderConfiguracion(container) {
    container.innerHTML = `
        <div class="card fade-in" style="max-width: 600px; margin: 0 auto;">
            <h3 style="margin-bottom: 1.5rem;"><i class="fa-solid fa-gears"></i> Parámetros de Operación SaaS</h3>
            
            <form id="frm-config">
                <h4 style="margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem; color: var(--primary);">
                    Metas Comerciales
                </h4>
                <div class="form-group">
                    <label for="cfg-goal">Meta de Venta Mensual ($) *</label>
                    <input type="number" id="cfg-goal" class="form-control" required min="0" step="100">
                </div>

                <h4 style="margin-top: 1.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.25rem; color: var(--primary);">
                    Integración FacturaLlama DTE
                </h4>
                <div class="form-group">
                    <label for="cfg-llama-key">FacturaLlama API Key</label>
                    <input type="password" id="cfg-llama-key" class="form-control" placeholder="E.g. simulado_kode_saas_llama_key">
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
                        <option value="true">Sí (Genera tracking provisional y no envía a C807)</option>
                        <option value="false">No (Envía peticiones usando el token de la hoja Auth)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="cfg-c807-user">C807 Usuario API</label>
                    <input type="text" id="cfg-c807-user" class="form-control">
                </div>
                <div class="form-group">
                    <label for="cfg-c807-pass">C807 Contraseña API</label>
                    <input type="password" id="cfg-c807-pass" class="form-control">
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 2rem;">
                    <button type="button" class="btn btn-secondary" onclick="loadRoute('dashboard')">Regresar</button>
                    <button type="submit" class="btn btn-primary">Guardar Configuración</button>
                </div>
            </form>
        </div>
    `;

    try {
        const config = await api.getConfig();
        document.getElementById('cfg-goal').value = config.monthly_sales_goal || 5000;
        document.getElementById('cfg-llama-key').value = config.facturallama_api_key || '';
        document.getElementById('cfg-c807-sim').value = config.c807_simulado !== false ? 'true' : 'false';
        document.getElementById('cfg-c807-user').value = config.c807_username || '';
        document.getElementById('cfg-c807-pass').value = config.c807_password || '';

        const form = document.getElementById('frm-config');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const configData = {
                monthly_sales_goal: parseFloat(document.getElementById('cfg-goal').value),
                facturallama_api_key: document.getElementById('cfg-llama-key').value,
                c807_simulado: document.getElementById('cfg-c807-sim').value === 'true',
                c807_username: document.getElementById('cfg-c807-user').value,
                c807_password: document.getElementById('cfg-c807-pass').value
            };

            try {
                await api.updateConfig(configData);
                showToast("¡Configuración guardada exitosamente!", "success");
                await renderConfiguracion(container);
            } catch (err) {
                showToast(`Error al guardar configuración: ${err.message}`, "danger");
            }
        };
    } catch (err) {
        showToast("Error al cargar configuraciones: " + err.message, "danger");
    }
}
