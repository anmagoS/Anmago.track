// ============================================
// CONFIGURACIÓN
// ============================================
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxIipuPmVAvaTt7_oUQzMLNtXIah19dcq2CWkaoglQvFivqY-wBYEw64tvUmL4-1k62/exec";

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Iniciando generación de guía...');
    cargarDatosEnvio();
});

// ============================================
// FUNCIÓN PRINCIPAL - CARGAR DATOS DEL ENVÍO
// ============================================
async function cargarDatosEnvio() {
    try {
        // Obtener ID del envío
        const envioId = obtenerEnvioId();
        console.log('🔍 Buscando envío ID:', envioId);
        
        if (!envioId) {
            mostrarError('No se encontró ID de envío');
            return;
        }

        // Cargar datos
        let datosEnvio = await cargarDatos(envioId);
        
        if (!datosEnvio) {
            mostrarError('No se pudieron cargar los datos del envío');
            return;
        }

        // Generar guía
        generarGuia(datosEnvio);
        
        // Generar código de barras
        generarCodigoBarras(envioId);
        
        console.log('✅ Guía generada exitosamente');

    } catch (error) {
        console.error('❌ Error cargando datos:', error);
        mostrarError('Error al cargar datos: ' + error.message);
    }
}

// ============================================
// OBTENER ID DEL ENVÍO
// ============================================
function obtenerEnvioId() {
    // 1. Intentar desde localStorage
    let envioId = localStorage.getItem('envioParaGuia');
    
    if (envioId) {
        console.log('📋 ID obtenido de localStorage:', envioId);
        return envioId;
    }
    
    // 2. Intentar desde URL
    const urlParams = new URLSearchParams(window.location.search);
    envioId = urlParams.get('envio');
    
    if (envioId) {
        console.log('📋 ID obtenido de URL:', envioId);
        return envioId;
    }
    
    // 3. Intentar desde datos completos
    const datosCompletos = localStorage.getItem('ultimoEnvioCompleto');
    if (datosCompletos) {
        try {
            const datos = JSON.parse(datosCompletos);
            envioId = datos.envioId || datos["ENVIO ID"];
            console.log('📋 ID obtenido de datos completos:', envioId);
            return envioId;
        } catch (e) {
            console.error('Error parseando datos completos:', e);
        }
    }
    
    console.error('❌ No se pudo obtener ID del envío');
    return null;
}

// ============================================
// CARGAR DATOS DEL ENVÍO
// ============================================
async function cargarDatos(envioId) {
    console.log('📡 Cargando datos para ID:', envioId);
    
    // 1. Intentar desde localStorage (datos completos)
    const datosCompletos = localStorage.getItem('ultimoEnvioCompleto');
    if (datosCompletos) {
        try {
            const datos = JSON.parse(datosCompletos);
            if (datos.envioId === envioId || datos["ENVIO ID"] === envioId) {
                console.log('✅ Datos cargados desde localStorage');
                return procesarDatos(datos);
            }
        } catch (e) {
            console.error('Error parseando datos locales:', e);
        }
    }
    
    // 2. Intentar desde Web App
    try {
        console.log('🌐 Intentando cargar desde Web App...');
        const response = await fetch(`${WEB_APP_URL}?action=getEnvio&envioId=${encodeURIComponent(envioId)}`);
        
        if (response.ok) {
            const datos = await response.json();
            console.log('✅ Datos cargados desde Web App:', datos);
            return procesarDatos(datos);
        }
    } catch (error) {
        console.log('⚠️ No se pudo cargar desde Web App:', error.message);
    }
    
    // 3. Intentar desde historial en localStorage
    try {
        const historial = JSON.parse(localStorage.getItem('historialCompleto')) || [];
        const envio = historial.find(e => e["ENVIO ID"] === envioId || e.id === envioId);
        
        if (envio) {
            console.log('✅ Datos cargados desde historial local');
            return procesarDatos(envio);
        }
    } catch (e) {
        console.error('Error buscando en historial:', e);
    }
    
    // 4. Crear datos de ejemplo
    console.log('⚠️ Usando datos de ejemplo');
    return {
        "ENVIO ID": envioId,
        "REMITE": "CLIENTE DE EJEMPLO",
        "TELEFONO": "3001234567",
        "CIUDAD": "Bogotá D.C.",
        "DESTINO": "DESTINATARIO EJEMPLO",
        "TELEFONOCLIENTE": "3109876543",
        "DIRECCION DESTINO": "Calle 123 #45-67",
        "BARRIO": "Barrio Ejemplo",
        "COMPLEMENTO DE DIR": "Oficina 202",
        "CIUDAD DESTINO": "Bogotá D.C.",
        "FORMA DE PAGO": "Contraentrega",
        "VALOR A RECAUDAR": "10000",
        "LOCALIDAD": "NORTE",
        "MENSAJERO": "CARLOS",
        "OBS": "Entregar antes de las 6 PM",
        fecha: new Date().toISOString()
    };
}

// ============================================
// PROCESAR DATOS
// ============================================
function procesarDatos(datos) {
    console.log('🔧 Procesando datos:', datos);
    
    // Calcular zona y mensajero si no están
    if (!datos.LOCALIDAD || !datos.MENSAJERO) {
        const { zona, mensajero } = calcularZonaYMensajero(datos.BARRIO);
        datos.LOCALIDAD = datos.LOCALIDAD || zona;
        datos.MENSAJERO = datos.MENSAJERO || mensajero;
    }
    
    // Formatear valor a recaudar
    if (datos["VALOR A RECAUDAR"]) {
        const valor = parseFloat(datos["VALOR A RECAUDAR"]);
        if (!isNaN(valor)) {
            datos.valorFormateado = `$${valor.toLocaleString('es-CO')}`;
        }
    }
    
    // Formatear fecha
    if (datos.fecha) {
        const fecha = new Date(datos.fecha);
        datos.fechaFormateada = fecha.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
    
    return datos;
}

// ============================================
// GENERAR CÓDIGO DE BARRAS
// ============================================
function generarCodigoBarras(envioId) {
    try {
        console.log('📊 Generando código de barras para:', envioId);
        
        // Verificar que tenemos el elemento SVG
        const svgElement = document.getElementById('codigoBarras');
        if (!svgElement) {
            console.error('❌ No se encontró el elemento SVG para código de barras');
            return;
        }
        
        // Verificar que JsBarcode está disponible
        if (typeof JsBarcode === 'undefined') {
            console.error('❌ JsBarcode no está disponible');
            mostrarError('No se pudo cargar la librería de código de barras');
            return;
        }
        
        // Generar código de barras
        JsBarcode("#codigoBarras", envioId, {
            format: "CODE128",
            width: 1.2,
            height: 28,
            displayValue: false,
            background: "transparent",
            lineColor: "#000000",
            margin: 2
        });
        
        console.log('✅ Código de barras generado');
        
        // También mostrar el número debajo
        const numeroElement = document.getElementById('numeroGuiaBarras');
        if (numeroElement) {
            numeroElement.textContent = envioId;
        }
        
    } catch (error) {
        console.error('❌ Error generando código de barras:', error);
        // Mostrar el número aunque falle el código de barras
        const numeroElement = document.getElementById('numeroGuiaBarras');
        if (numeroElement) {
            numeroElement.textContent = envioId;
            numeroElement.style.color = '#000';
            numeroElement.style.fontWeight = 'bold';
        }
    }
}

// ============================================
// GENERAR GUÍA
// ============================================
function generarGuia(datos) {
    console.log('🎨 Generando interfaz de guía...');
    
    // Actualizar elementos de la guía
    actualizarElemento('guiaId', datos["ENVIO ID"] || datos.envioId || 'N/A');
    actualizarElemento('fecha', datos.fechaFormateada || new Date().toLocaleDateString('es-CO'));
    actualizarElemento('fechaGeneracion', new Date().toLocaleString('es-CO'));
    
    // Forma de pago
    const formaPago = datos["FORMA DE PAGO"] || datos.formaPago || '';
    let formaPagoTexto = '';
    switch(formaPago.toLowerCase()) {
        case 'contado': formaPagoTexto = 'Contado'; break;
        case 'contraentrega': formaPagoTexto = 'Contraentrega'; break;
        case 'contraentrega_recaudo': 
        case 'con recaudo':
            formaPagoTexto = 'Con Recaudo'; 
            break;
        default: formaPagoTexto = formaPago || 'N/A';
    }
    actualizarElemento('formaPago', formaPagoTexto);
    
    // Remitente
    actualizarElemento('remitenteNombre', datos["REMITE"] || datos.remite || 'N/A');
    actualizarElemento('remitenteTelefono', datos["TELEFONO"] || datos.telefono || 'N/A');
    actualizarElemento('remitenteCiudad', datos["CIUDAD"] || datos.ciudad || 'Bogotá D.C.');
    
    // Destinatario
    actualizarElemento('destinatarioNombre', datos["DESTINO"] || datos.destino || 'N/A');
    actualizarElemento('destinatarioTelefono', datos["TELEFONOCLIENTE"] || datos.telefonoCliente || 'N/A');
    actualizarElemento('destinatarioDireccion', datos["DIRECCION DESTINO"] || datos.direccionDestino || 'N/A');
    actualizarElemento('destinatarioBarrio', datos["BARRIO"] || datos.barrio || 'N/A');
    actualizarElemento('destinatarioCiudad', datos["CIUDAD DESTINO"] || datos.ciudadDestino || 'Bogotá D.C.');
    actualizarElemento('complemento', datos["COMPLEMENTO DE DIR"] || datos.complementoDir || 'Ninguno');
    
    // Información de pago
    actualizarElemento('valorRecaudar', datos.valorFormateado || `$${parseInt(datos["VALOR A RECAUDAR"] || 0).toLocaleString('es-CO')}`);
    
    // Información logística
    actualizarElemento('zona', datos["LOCALIDAD"] || datos.localidad || 'N/A');
    actualizarElemento('mensajero', datos["MENSAJERO"] || datos.mensajero || 'Por asignar');
    actualizarElemento('observaciones', datos["OBS"] || datos.observaciones || '');
    
    console.log('✅ Interfaz de guía actualizada');
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function actualizarElemento(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = valor || '';
    } else {
        console.warn(`⚠️ Elemento no encontrado: ${id}`);
    }
}

function calcularZonaYMensajero(barrio) {
    if (!barrio) return { zona: "NORTE", mensajero: "CARLOS" };
    
    const barrioUpper = barrio.toUpperCase();
    let zona = "NORTE";
    let mensajero = "CARLOS";
    
    if (barrioUpper.includes("SOACHA")) {
        zona = "SUR";
        mensajero = "JUAN";
    } else if (barrioUpper.includes("KENNEDY") || barrioUpper.includes("USAQUÉN")) {
        zona = "";
        mensajero = "";
    } else if (barrioUpper.includes("CHAPINERO")) {
        zona = "ORIENTE";
        mensajero = "ANDRÉS";
    }
    
    return { zona, mensajero };
}

function mostrarError(mensaje) {
    console.error('❌ Error:', mensaje);
    
    // Mostrar mensaje en la guía
    const elementosError = document.querySelectorAll('[id]');
    elementosError.forEach(elemento => {
        if (elemento.id !== 'codigoBarras' && elemento.id !== 'numeroGuiaBarras') {
            elemento.textContent = 'ERROR';
            elemento.style.color = '#ff0000';
        }
    });
    
    // Mensaje específico
    const guiaId = document.getElementById('guiaId');
    if (guiaId) {
        guiaId.textContent = 'ERROR';
        guiaId.style.color = '#ff0000';
    }
    
    alert(`Error: ${mensaje}\n\nPor favor intente nuevamente.`);
}

// ============================================
// INICIALIZAR AUTO-IMPRESIÓN (OPCIONAL)
// ============================================
// Descomenta si quieres que se imprima automáticamente
/*
setTimeout(() => {
    if (window.location.search.includes('autoprint')) {
        console.log('🖨️ Auto-impresión activada');
        window.print();
    }
}, 1000);
*/
