async function cargarUsuarios() {
  const response = await fetch("usuarios.json");
  const data = await response.json();
  console.log("Usuarios cargados:", data);
  return data;
}

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const usuario = document.getElementById("usuario").value;
  const password = document.getElementById("password").value;

  const usuarios = await cargarUsuarios();

  const user = usuarios.find(u => 
    u.USUARIO === usuario && 
    u.CONTRASEÑA === password && 
    u.ESTADO === "ACTIVO"
  );

  console.log("Usuario encontrado:", user);

  if (user) {
    // Guardar TODOS los datos del usuario en localStorage
    localStorage.setItem("usuarioLogueado", JSON.stringify({
      "USUARIO": user.USUARIO,
      "NOMBRE COMPLETO": user["NOMBRE COMPLETO"],
      "ROL": user.ROL,
      "ESTADO": user.ESTADO,
      "NOMBRE REMITENTE": user["NOMBRE REMITENTE"] || user["NOMBRE COMPLETO"],
      "DIRECCION REMITENTE": user["DIRECCION REMITENTE"] || "",
      "TELEFONO REMITENTE": user["TELEFONO REMITENTE"] || user["TELEFONO"] || "",
      "CIUDAD": user.CIUDAD || "Bogotá D.C.",
      "EMAIL": user.EMAIL || "",
      "FECHA_REGISTRO": user["FECHA_REGISTRO"] || ""
    }));
    
    window.location.href = "index.html";
  } else {
    alert("Usuario o contraseña incorrectos");
  }
});
