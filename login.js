// login.js - VERSIÓN MEJORADA CON VALIDACIONES
async function cargarUsuarios() {
  try {
    const response = await fetch("usuarios.json");
    const data = await response.json();
    console.log("Usuarios cargados:", data);
    return data;
  } catch (error) {
    console.error("Error cargando usuarios:", error);
    return [];
  }
}

// Función para encriptar (simplificada para demostración)
function encriptarContraseña(password) {
  // En producción, usaría una librería como bcrypt
  return btoa(password + "sistema-envios-2025");
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const usuarioInput = document.getElementById("usuario").value.trim();
  const passwordInput = document.getElementById("password").value.trim();
  
  // Validaciones básicas
  if (!usuarioInput || !passwordInput) {
    alert("Por favor complete ambos campos");
    return;
  }
  
  // Mostrar loading
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = "Verificando...";
  submitBtn.disabled = true;

  try {
    const usuarios = await cargarUsuarios();

    const user = usuarios.find(u => 
      u.USUARIO === usuarioInput && 
      u.CONTRASEÑA === passwordInput && 
      u.ESTADO === "ACTIVO"
    );

    console.log("Usuario encontrado:", user ? "Sí" : "No");

    if (user) {
      // Guardar TODOS los datos del usuario en localStorage
      const datosUsuario = {
        "USUARIO": user.USUARIO,
        "NOMBRE COMPLETO": user["NOMBRE COMPLETO"],
        "ROL": user.ROL,
        "ESTADO": user.ESTADO,
        "NOMBRE REMITENTE": user["NOMBRE REMITENTE"] || user["NOMBRE COMPLETO"],
        "DIRECCION REMITENTE": user["DIRECCION REMITENTE"] || "",
        "TELEFONO REMITENTE": user["TELEFONO REMITENTE"] || user["TELEFONO"] || "",
        "CIUDAD": user.CIUDAD || "Bogotá D.C.",
        "EMAIL": user.EMAIL || "",
        "FECHA_REGISTRO": user["FECHA_REGISTRO"] || "",
        "ULTIMO_LOGIN": new Date().toISOString(),
        "IP": "localhost", // En producción, obtendrías la IP real
        "SESSION_ID": Date.now() + Math.random().toString(36).substr(2)
      };
      
      localStorage.setItem("usuarioLogueado", JSON.stringify(datosUsuario));
      localStorage.setItem("session_start", new Date().toISOString());
      
      console.log("✅ Usuario autenticado:", datosUsuario.USUARIO);
      
      // Redirigir a index.html
      window.location.href = "index.html";
      
    } else {
      alert("Usuario o contraseña incorrectos");
      // Limpiar campo de contraseña
      document.getElementById("password").value = "";
    }
    
  } catch (error) {
    console.error("Error en login:", error);
    alert("Error al conectar con el servidor");
  } finally {
    // Restaurar botón
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// Validar si ya hay sesión activa
document.addEventListener('DOMContentLoaded', function() {
  const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
  
  if (usuario && usuario.ESTADO === "ACTIVO") {
    // Si ya está logueado, redirigir a index.html
    console.log("Ya hay sesión activa, redirigiendo...");
    window.location.href = "index.html";
  }
});
