// View: Profiles (Netflix-style profile selector)
async function renderProfiles(container) {
    // If not logged in as company, redirect to login
    if (!window.currentUser) {
        window.location.hash = 'login';
        return;
    }

    container.innerHTML = `
        <div class="fade-in" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; text-align: center; padding: 2rem;">
            <h1 style="font-size: 2.5rem; font-weight: 700; margin-bottom: 2.5rem; color: #fff; letter-spacing: -0.5px;">¿Quién está usando KODE?</h1>
            
            <div id="profiles-grid" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 2.5rem; margin-bottom: 4rem; max-width: 800px;">
                <div style="color: var(--text-secondary);"><i class="fa-solid fa-spinner fa-spin"></i> Cargando perfiles...</div>
            </div>

            <button class="btn btn-secondary" onclick="handleLogout()" style="padding: 0.6rem 1.5rem; border-radius: 4px; font-size: 0.85rem;">
                <i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión de la cuenta
            </button>
        </div>
    `;

    const grid = document.getElementById('profiles-grid');

    // Default local fallbacks
    const defaultProfiles = [
        { id: 'admin', nombre: 'Administrador', correo: 'admin@kodescents.com', area: 'Gerencia', role: 'Administrador', color: '#f59e0b' },
        { id: 'virgi', nombre: 'Virgen Cerna', correo: 'virgicerna@gmail.com', area: 'Ventas', role: 'Vendedor', color: '#ec4899' },
        { id: 'patricia', nombre: 'Patricia', correo: 'patricia@gmail.com', area: 'Ventas', role: 'Vendedor', color: '#10b981' }
    ];

    try {
        let employees = [];
        try {
            employees = await api.getEmployees();
        } catch (e) {
            console.warn("Error calling getEmployees (likely quota limit), using defaults:", e);
        }

        let profiles = [];
        // Always include Admin first
        profiles.push(defaultProfiles[0]);

        if (employees && employees.length > 0) {
            employees.forEach(emp => {
                // Skip empty/corrupted records to avoid cluttering Netflix selector
                if (!emp.nombre && !emp.correo) return;

                const empName = emp.nombre || emp.correo || 'Colaborador';
                const empEmail = emp.correo || 'N/A';
                const empArea = emp.area || 'Ventas';
                const empRole = emp.role || ((empArea === 'Gerencia' || (empEmail && empEmail.includes('admin'))) ? 'Administrador' : 'Vendedor');

                // Determine a nice color based on their name hash
                const colors = ['#ec4899', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4'];
                let hash = 0;
                for (let i = 0; i < empName.length; i++) {
                    hash = empName.charCodeAt(i) + ((hash << 5) - hash);
                }
                const color = colors[Math.abs(hash) % colors.length];

                profiles.push({
                    id: emp.id,
                    nombre: empName,
                    correo: empEmail,
                    area: empArea,
                    role: empRole,
                    color: color
                });
            });
        } else {
            // Fallback sellers
            profiles.push(defaultProfiles[1], defaultProfiles[2]);
        }

        // Deduplicate profiles by email
        const uniqueProfiles = [];
        const seenEmails = new Set();
        profiles.forEach(p => {
            if (!seenEmails.has(p.correo)) {
                seenEmails.add(p.correo);
                uniqueProfiles.push(p);
            }
        });

        grid.innerHTML = '';
        uniqueProfiles.forEach(p => {
            const initial = p.nombre.charAt(0).toUpperCase();
            const card = document.createElement('div');
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.alignItems = 'center';
            card.style.cursor = 'pointer';
            card.style.width = '120px';
            card.className = 'profile-card';

            card.innerHTML = `
                <div class="profile-avatar" style="
                    width: 100px;
                    height: 100px;
                    border-radius: 4px;
                    background-color: ${p.color};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 3rem;
                    font-weight: 700;
                    color: #fff;
                    margin-bottom: 0.75rem;
                    border: 3px solid transparent;
                    transition: all 0.2s ease-in-out;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                ">
                    ${initial}
                </div>
                <span class="profile-name" style="
                    font-size: 0.95rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                    transition: color 0.2s ease;
                ">${p.nombre}</span>
            `;

            // Hover effects via JS to maintain style encapsulation
            const avatar = card.querySelector('.profile-avatar');
            const nameSpan = card.querySelector('.profile-name');

            card.onmouseover = () => {
                avatar.style.borderColor = '#fff';
                avatar.style.transform = 'scale(1.05)';
                nameSpan.style.color = '#fff';
            };
            card.onmouseout = () => {
                avatar.style.borderColor = 'transparent';
                avatar.style.transform = 'scale(1)';
                nameSpan.style.color = 'var(--text-secondary)';
            };

            card.onclick = () => {
                selectProfile(p);
            };

            grid.appendChild(card);
        });

    } catch (err) {
        grid.innerHTML = `<div style="color: var(--color-registrado);">Error al construir perfiles: ${err.message}</div>`;
    }
}

async function selectProfile(profile) {
    window.currentProfile = profile;
    window.userRole = profile.role;
    localStorage.setItem('kode_current_profile', JSON.stringify(profile));
    
    // Fetch allowed views for role
    try {
        const roles = await api.getRoles();
        const found = roles.find(r => r.nombre.toLowerCase() === profile.role.toLowerCase());
        if (found) {
            localStorage.setItem('kode_allowed_views', JSON.stringify(found.vistas));
        } else {
            // Default fallbacks
            if (profile.role === 'Administrador') {
                localStorage.setItem('kode_allowed_views', JSON.stringify(["dashboard", "pedidos", "insumos", "clientes", "empleados", "planilla", "configuracion"]));
            } else {
                localStorage.setItem('kode_allowed_views', JSON.stringify(["dashboard", "pedidos", "clientes"]));
            }
        }
    } catch(err) {
        console.warn("Could not sync role permissions, using default fallbacks:", err);
        if (profile.role === 'Administrador') {
            localStorage.setItem('kode_allowed_views', JSON.stringify(["dashboard", "pedidos", "insumos", "clientes", "empleados", "planilla", "configuracion"]));
        } else {
            localStorage.setItem('kode_allowed_views', JSON.stringify(["dashboard", "pedidos", "clientes"]));
        }
    }

    showToast(`Ingresaste como ${profile.nombre}`, "success");

    // Re-verify layouts and route to dashboard
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) {
        userDisplay.innerText = `${profile.nombre} (${window.currentUser})`;
    }

    // Trigger router reload to make sidebar visible
    window.location.hash = 'dashboard';
}
