// Main Application Entry Point and SPA Router

// Global State
window.currentRoute = 'dashboard';
window.currentUser = localStorage.getItem('kode_current_user') || null;
window.currentProfile = localStorage.getItem('kode_current_profile') ? JSON.parse(localStorage.getItem('kode_current_profile')) : null;
window.userRole = window.currentProfile ? window.currentProfile.role : 'Vendedor';

// Toast Notification System
function showToast(message, type = 'info') {
    // Remove existing toast container if any
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `fade-in`;
    toast.style.padding = '1rem 1.5rem';
    toast.style.borderRadius = '0.5rem';
    toast.style.color = '#fff';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.3)';
    toast.style.fontSize = '0.9rem';
    toast.style.fontWeight = '600';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '0.5rem';
    toast.style.minWidth = '250px';
    toast.style.backdropFilter = 'blur(10px)';

    // Color schemes
    if (type === 'success') {
        toast.style.backgroundColor = 'rgba(16, 185, 129, 0.9)';
        toast.style.borderLeft = '4px solid #047857';
        toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${message}`;
    } else if (type === 'danger') {
        toast.style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
        toast.style.borderLeft = '4px solid #b91c1c';
        toast.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${message}`;
    } else if (type === 'warning') {
        toast.style.backgroundColor = 'rgba(249, 115, 22, 0.9)';
        toast.style.borderLeft = '4px solid #c2410c';
        toast.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${message}`;
    } else {
        toast.style.backgroundColor = 'rgba(99, 102, 241, 0.9)';
        toast.style.borderLeft = '4px solid #4338ca';
        toast.innerHTML = `<i class="fa-solid fa-circle-info"></i> ${message}`;
    }

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Global Modal Controls
window.openModal = function(title, bodyHTML, footerHTML = '') {
    const modal = document.getElementById('global-modal');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerHTML = bodyHTML;
    document.getElementById('modal-footer').innerHTML = footerHTML;
    modal.classList.add('show');
};

window.closeModal = function() {
    const modal = document.getElementById('global-modal');
    modal.classList.remove('show');
};

// Theme Management (Light / Dark)
window.toggleTheme = function() {
    const current = document.documentElement.style.getPropertyValue('color-scheme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    
    document.documentElement.style.setProperty('color-scheme', next);
    localStorage.setItem('color-scheme', next);
    
    const themeIcon = document.getElementById('theme-icon');
    if (next === 'dark') {
        themeIcon.className = 'fa-solid fa-moon';
        document.body.style.backgroundColor = '#090d16';
    } else {
        themeIcon.className = 'fa-solid fa-sun';
        document.body.style.backgroundColor = '#f8fafc';
    }
    showToast(`Tema cambiado a ${next === 'dark' ? 'Oscuro' : 'Claro'}`, 'info');
};

// SPA Router
window.routeTo = function(event, routeName) {
    if (event) event.preventDefault();
    window.location.hash = routeName;
};

async function loadRoute(routeName) {
    // Redirect to login if not authenticated
    if (!window.currentUser && routeName !== 'login') {
        window.location.hash = 'login';
        return;
    }

    // Redirect to profile selector if authenticated but no profile chosen
    if (window.currentUser && !window.currentProfile && routeName !== 'profiles') {
        window.location.hash = 'profiles';
        return;
    }

    // Role-based route protection: Vendedores cannot access configuracion or empleados views
    if (window.currentProfile && window.currentProfile.role === 'Vendedor') {
        if (routeName === 'configuracion' || routeName === 'empleados') {
            showToast("Acceso restringido para asesores.", "warning");
            window.location.hash = 'dashboard';
            return;
        }
    }

    // Toggle navigation UI elements visibility
    const sidebar = document.querySelector('.sidebar');
    const mainWrapper = document.querySelector('.main-wrapper');
    const headerBar = document.querySelector('.header-bar');
    
    if (!window.currentUser || !window.currentProfile) {
        if (sidebar) sidebar.style.display = 'none';
        if (headerBar) headerBar.style.display = 'none';
        if (mainWrapper) {
            mainWrapper.style.marginLeft = '0';
            mainWrapper.style.width = '100%';
            mainWrapper.style.paddingLeft = '0';
        }
    } else {
        if (sidebar) sidebar.style.display = 'flex';
        if (headerBar) headerBar.style.display = 'flex';
        if (mainWrapper) {
            mainWrapper.style.marginLeft = '';
            mainWrapper.style.width = '';
            mainWrapper.style.paddingLeft = '';
        }
        const userDisplay = document.getElementById('user-display');
        if (userDisplay && window.currentProfile) {
            userDisplay.innerText = `${window.currentProfile.nombre} (${window.currentUser})`;
        }
    }

    window.currentRoute = routeName;
    
    // Highlight sidebar menu items and hide unauthorized views from Vendedores
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => {
        const itemRoute = item.getAttribute('data-route');
        
        // Hide config and employees from Vendedores
        if (window.userRole === 'Vendedor' && (itemRoute === 'empleados' || itemRoute === 'configuracion')) {
            item.style.display = 'none';
        } else {
            item.style.display = '';
        }

        if (itemRoute === routeName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    const mainContent = document.getElementById('main-content');
    const viewTitle = document.getElementById('view-title');

    // Fade out effect
    mainContent.style.opacity = '0';
    mainContent.style.transform = 'translateY(10px)';
    mainContent.style.transition = 'all 0.2s ease';

    setTimeout(async () => {
        try {
            // Match routes
            switch (routeName) {
                case 'login':
                    viewTitle.innerText = 'Iniciar Sesión';
                    await renderLogin(mainContent);
                    break;
                case 'profiles':
                    viewTitle.innerText = 'Seleccionar Perfil';
                    await renderProfiles(mainContent);
                    break;
                case 'dashboard':
                    viewTitle.innerText = 'Dashboard de Gestión';
                    await renderDashboard(mainContent);
                    break;
                case 'pedidos':
                    viewTitle.innerText = 'Gestión de Pedidos';
                    await renderPedidos(mainContent);
                    break;
                case 'nuevo-pedido':
                    viewTitle.innerText = 'Registrar Pedido';
                    await renderNuevoPedido(mainContent);
                    break;
                case 'insumos':
                    viewTitle.innerText = 'Productos Pendientes para Compra';
                    await renderInsumos(mainContent);
                    break;
                case 'clientes':
                    viewTitle.innerText = 'Catálogo de Clientes';
                    await renderClientes(mainContent);
                    break;
                case 'empleados':
                    viewTitle.innerText = 'Porcentaje de Comisión por Asesor';
                    await renderEmpleados(mainContent);
                    break;
                case 'configuracion':
                    viewTitle.innerText = 'Configuración del Sistema';
                    await renderConfiguracion(mainContent);
                    break;
                default:
                    viewTitle.innerText = 'Dashboard';
                    await renderDashboard(mainContent);
            }
        } catch (err) {
            console.error(err);
            mainContent.innerHTML = `
                <div class="card fade-in" style="border-color: var(--color-registrado); text-align: center; padding: 3rem;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: var(--color-registrado); margin-bottom: 1rem;"></i>
                    <h2>Error al Cargar la Vista</h2>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem;">${err.message}</p>
                    <button class="btn btn-primary" onclick="loadRoute('${routeName}')" style="margin-top: 1.5rem;">Reintentar</button>
                </div>
            `;
        }

        // Fade in
        mainContent.style.opacity = '1';
        mainContent.style.transform = 'translateY(0)';
    }, 200);
}

// Listen to Hash Changes
window.addEventListener('hashchange', () => {
    const route = window.location.hash.substring(1) || 'dashboard';
    loadRoute(route);
});

// Smart view refresh: when changes are detected from Firebase via SSE,
// refresh the current route view dynamically without page reload,
// protecting active forms/inputs to avoid interrupting user input.
let _smartRefreshDebounce = null;
window.smartRefreshView = function(changedCollection) {
    clearTimeout(_smartRefreshDebounce);
    _smartRefreshDebounce = setTimeout(() => {
        const currentRoute = window.currentRoute;
        
        const collectionViewMap = {
            'clients': ['clientes', 'nuevo-pedido', 'pedidos'],
            'orders': ['pedidos', 'dashboard', 'insumos'],
            'order_details': ['pedidos', 'insumos', 'dashboard'],
            'catalog': ['nuevo-pedido', 'pedidos'],
            'payments': ['dashboard'],
            'employees': ['empleados', 'dashboard'],
            'config': ['dashboard', 'empleados', 'configuracion']
        };

        const affectedViews = collectionViewMap[changedCollection] || [];
        const viewNeedsRefresh = affectedViews.includes(currentRoute);

        if (viewNeedsRefresh) {
            const activeElement = document.activeElement;
            const isEditing = activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' || 
                activeElement.tagName === 'SELECT'
            );

            if (isEditing) {
                console.log("smartRefreshView: Se omitió el refresco de pantalla para proteger la sesión de edición activa del usuario.");
            } else {
                showToast('🔄 Datos actualizados en tiempo real', 'info');
                loadRoute(currentRoute);
            }
        }
    }, 500);
};

// App Initialization
window.addEventListener('DOMContentLoaded', async () => {
    // Set theme representation
    const savedTheme = localStorage.getItem('color-scheme') || 'dark';
    document.documentElement.style.setProperty('color-scheme', savedTheme);
    const themeIcon = document.getElementById('theme-icon');
    if (savedTheme === 'dark') {
        themeIcon.className = 'fa-solid fa-moon';
        document.body.style.backgroundColor = '#090d16';
    } else {
        themeIcon.className = 'fa-solid fa-sun';
        document.body.style.backgroundColor = '#f8fafc';
    }

    // Set offline class if needed
    if (!navigator.onLine) {
        document.body.classList.add('is-offline');
    }

    // Initial Route load
    const initialRoute = window.location.hash.substring(1) || 'dashboard';
    loadRoute(initialRoute);

    // Run offline syncing if online
    if (navigator.onLine) {
        api.syncOfflineData().catch(err => console.error("Error during initial offline data sync:", err));
    }

    // Initialize real-time listeners connection
    if (typeof api !== 'undefined' && typeof api.initRealtimeSync === 'function') {
        api.initRealtimeSync();
    }
});
