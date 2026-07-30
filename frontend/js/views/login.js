// View: Login
async function renderLogin(container) {
    // If user is already logged in, route to dashboard
    if (window.currentUser) {
        window.location.hash = 'dashboard';
        return;
    }

    container.innerHTML = `
        <div class="fade-in" style="display: flex; align-items: center; justify-content: center; min-height: 70vh;">
            <div class="card" style="width: 100%; max-width: 400px; padding: 2.5rem; text-align: center; border: 1px solid var(--border-color); box-shadow: var(--shadow-lg);">
                <i class="fa-solid fa-wand-magic-sparkles" style="font-size: 3rem; background: linear-gradient(135deg, var(--primary) 0%, #06b6d4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1.5rem;"></i>
                <h2 style="margin-bottom: 0.5rem; font-weight: 700;">KODE El Salvador</h2>
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 2.5rem;">Ingresa a tu cuenta para tomar pedidos y gestionar despacho</p>

                <form id="frm-login" onsubmit="handleLoginSubmit(event)">
                    <div class="form-group" style="text-align: left;">
                        <label for="l-email">Correo Electrónico</label>
                        <input type="email" id="l-email" class="form-control" required placeholder="virgicerna@gmail.com">
                    </div>
                    <div class="form-group" style="text-align: left; margin-bottom: 2rem;">
                        <label for="l-pass">Contraseña</label>
                        <input type="password" id="l-pass" class="form-control" required placeholder="••••••••">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem;">
                        Iniciar Sesión
                    </button>
                </form>
            </div>
        </div>
    `;
}

window.handleLoginSubmit = function(e) {
    e.preventDefault();
    const email = document.getElementById('l-email').value.trim();
    const pass = document.getElementById('l-pass').value;

    if (!email || !pass) {
        showToast("Por favor ingresa tus datos", "warning");
        return;
    }

    // Firebase Auth / Local Creds validation
    // Allow admin email (pm3923193@gmail.com) and the sales emails
    if (email === 'virgicerna@gmail.com' || email === 'pm3923193@gmail.com' || email.endsWith('@kodescents.com') || email === 'luisundae@gmail.com') {
        window.currentUser = email;
        localStorage.setItem('kode_current_user', email);
        const userDisplay = document.getElementById('user-display');
        if (userDisplay) userDisplay.innerText = email;
        showToast("¡Inicio de sesión exitoso!", "success");
        window.location.hash = 'dashboard';
    } else {
        showToast("Credenciales no válidas. Prueba con tu correo de administrador o asesor.", "danger");
    }
};

window.handleLogout = function() {
    window.currentUser = null;
    localStorage.removeItem('kode_current_user');
    window.location.hash = 'login';
    showToast("Sesión cerrada correctamente", "info");
};
