// auth.js - Funciones de autenticación reutilizables
export function verificarSesion() {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
    
    if (!usuario) {
        console.log("🔐 No hay usuario logueado, redirigiendo a login...");
        // Usar replace para evitar que el usuario pueda volver atrás
        window.location.replace("login.html");
        return null;
    }
    
    // Verificar que el usuario esté activo
    if (usuario.ESTADO !== "ACTIVO") {
        console.log("⚠️ Usuario inactivo");
        localStorage.removeItem("usuarioLogueado");
        window.location.replace("login.html");
        return null;
    }
    
    console.log("✅ Usuario autenticado:", usuario.USUARIO);
    return usuario;
}

export function cerrarSesion() {
    if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
        localStorage.removeItem("usuarioLogueado");
        window.location.replace("login.html");
    }
}

export function obtenerUsuarioActual() {
    return JSON.parse(localStorage.getItem("usuarioLogueado"));
}

export function verificarRol(rolesPermitidos) {
    const usuario = obtenerUsuarioActual();
    
    if (!usuario) {
        window.location.replace("login.html");
        return false;
    }
    
    if (!rolesPermitidos.includes(usuario.ROL)) {
        alert("No tienes permisos para acceder a esta página");
        window.location.replace("index.html"); // O a una página de error
        return false;
    }
    
    return true;
}
