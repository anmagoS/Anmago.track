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

        // Cargar datos con depuración extendida
        let datosEnvio = await cargarDatosConDepuracion(envioId);
        
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
    // 1. Intentar desde URL (para reimpresión desde historial)
    const urlParams = new URLSearchParams(window.location.search);
    let envioId = urlParams.get('id') || urlParams.get('envio');
    
    if (envioId) {
        console.log('📋 ID obtenido de URL:', envioId);
        return envioId;
    }
    
    // 2. Intentar desde localStorage
    envioId = localStorage.getItem('envioParaGuia');
    
    if (envioId) {
        console.log('📋 ID obtenido de localStorage:', envioId);
        return envioId;
    }
    
    // 3. Intentar desde datos completos
    const datosCompletos = localStorage.getItem('ultimoEnvioCompleto');
    if (datosCompletos) {
        try {
            const datos = JSON.parse(datosCompletos);
            envioId = datos.envioId || datos["ENVIO ID"] || datos.id || datos.ID || datos.envioId;
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
// CARGAR DATOS DEL ENVÍO CON DEPURACIÓN
// ============================================
async function cargarDatosConDepuracion(envioId) {
    console.log('📡 Cargando datos para ID:', envioId);
    
    // 1. Intentar desde localStorage (datos completos recientes)
    const datosCompletos = localStorage.getItem('ultimoEnvioCompleto');
    if (datosCompletos) {
        try {
            const datos = JSON.parse(datosCompletos);
            if (datos.envioId === envioId || datos["ENVIO ID"] === envioId || datos.id === envioId || datos.ID === envioId) {
                console.log('✅ Datos cargados desde localStorage (recientes)');
                console.log('📊 DEPURACIÓN - Datos completos desde localStorage:');
                console.table(datos);
                return procesarDatos(datos);
            }
        } catch (e) {
            console.error('Error parseando datos locales:', e);
        }
    }
    
    // 2. Intentar desde historial en localStorage
    try {
        const historial = JSON.parse(localStorage.getItem('historialCompleto')) || [];
        console.log(`🔍 Buscando ${envioId} en historial de ${historial.length} envíos`);
        
        // Buscar envío en el historial
        const envio = historial.find(e => {
            const posiblesIds = [
                e["ENVIO ID"],
                e.id,
                e.envioId,
                e.ID,
                e["ID ENVIO"],
                e["Envio ID"]
            ];
            return posiblesIds.some(id => id && id.toString() === envioId.toString());
        });
        
        if (envio) {
            console.log('✅ Datos cargados desde historial local');
            console.log('📊 DEPURACIÓN - Datos desde historial:');
            console.table(envio);
            return procesarDatos(envio);
        } else {
            console.log('⚠️ Envío no encontrado en historial');
            console.log('📋 Primeros 3 envíos del historial:');
            historial.slice(0, 3).forEach((e, i) => {
                console.log(`  ${i + 1}. ID: ${e["ENVIO ID"] || e.id || e.ID} - Destino: ${e.destino || e.DESTINO || e["Nombre Destinatario"]}`);
            });
        }
    } catch (e) {
        console.error('Error buscando en historial:', e);
    }
    
    // 3. Intentar desde Web App
    try {
        console.log('🌐 Intentando cargar desde Web App...');
        const response = await fetch(`${WEB_APP_URL}?action=getEnvio&envioId=${encodeURIComponent(envioId)}`);
        
        if (response.ok) {
            const datos = await response.json();
            console.log('✅ Datos cargados desde Web App');
            console.log('📊 DEPURACIÓN - Datos desde Web App:');
            console.table(datos);
            return procesarDatos(datos);
        }
    } catch (error) {
        console.log('⚠️ No se pudo cargar desde Web App:', error.message);
    }
    
    // 4. Crear datos de ejemplo si todo falla
    console.log('⚠️ Usando datos de ejemplo');
    return crearDatosEjemplo(envioId);
}

// ============================================
// CREAR DATOS DE EJEMPLO
// ============================================
function crearDatosEjemplo(envioId) {
    return {
        "ENVIO ID": envioId,
        "direccionDestino": "Carrera 80 # 12 - 34 (Ejemplo)",
        "destino": "DESTINATARIO EJEMPLO",
        "telefonoCliente": "3109876543",
        "barrio": "Barrio Ejemplo",
        "complementoDir": "Oficina 202",
        "ciudadDestino": "Bogotá D.C.",
        "remite": "CLIENTE DE EJEMPLO",
        "telefono": "3001234567",
        "ciudad": "Bogotá D.C.",
        "formaDePago": "Contraentrega",
        "valorRecaudar": "100000",
        "observaciones": "Entregar antes de las 6 PM",
        fecha: new Date().toISOString()
    };
}

// ============================================
// PROCESAR DATOS - CORREGIDO PARA DIRECCIÓN Y FECHA ORIGINAL
// ============================================
function procesarDatos(datos) {
    console.log('🔧 Procesando datos recibidos:');
    
    // DEPURACIÓN: Mostrar todos los campos
    console.log('📋 CAMPOS DISPONIBLES:');
    Object.keys(datos).forEach(key => {
        console.log(`  "${key}": "${datos[key]}"`);
    });
    
    // ============================================
    // 1. BUSCAR FECHA DE CREACIÓN ORIGINAL
    // ============================================
    let fechaOriginal = datos["FECHA DE CREACION"] || 
                       datos["FECHA CREACION"] || 
                       datos["Fecha de Creacion"] || 
                       datos.fechaCreacion || 
                       datos.fecha || 
                       datos.timestamp || 
                       datos["FECHA ENVIO"] || 
                       datos.fechaEnvio || 
                       new Date().toISOString();
    
    console.log('📅 FECHA ORIGINAL ENCONTRADA:', fechaOriginal);
    
    // ============================================
    // 2. BUSCAR DIRECCIÓN DESTINO
    // ============================================
    let direccionEncontrada = null;
    
    // Lista priorizada de campos a buscar (con el campo real de Google Sheets primero)
    const camposDireccion = [
        // Campo real de Google Sheets
        "DIRECCION DESTINO",           // TU CAMPO REAL en la columna H
        
        // Campos del formulario HTML
        "direccionDestino",            // Campo original (camelCase)
        "Dirección de Entrega",        // Nombre mostrado en label
        "Direccion de Entrega",        // Sin acento
        "DIRECCION DE ENTREGA",        // Mayúsculas sin acento
        
        // Variaciones del campo real
        "Direccion Destino",
        "direccion_destino",
        "DireccionDestino",
        "DIRECCIONDESTINO",
        
        // Campos alternativos
        "DIRECCION",
        "Direccion",
        "direccion",
        "ubicacion",
        "Ubicacion",
        "UBICACION",
        "address",
        "Address",
        "ADDRESS"
    ];
    
    // Buscar en los campos específicos
    for (const campo of camposDireccion) {
        if (datos[campo] && datos[campo].toString().trim() !== "" && datos[campo].toString().trim() !== "N/A") {
            direccionEncontrada = datos[campo];
            console.log(`✅ Dirección encontrada en campo "${campo}": ${direccionEncontrada}`);
            break;
        }
    }
    
    // Si no se encontró, buscar en cualquier campo que contenga "direccion" o "dir"
    if (!direccionEncontrada) {
        const camposConDireccion = Object.keys(datos).filter(key => 
            key.toLowerCase().includes('direccion') || 
            key.toLowerCase().includes('dir') ||
            key.toLowerCase().includes('address') ||
            key.toLowerCase().includes('ubicacion')
        );
        
        for (const campo of camposConDireccion) {
            const valor = datos[campo];
            if (valor && valor.toString().trim() !== "" && valor.toString().trim() !== "N/A") {
                direccionEncontrada = valor;
                console.log(`📍 Dirección encontrada indirectamente en "${campo}": ${direccionEncontrada}`);
                break;
            }
        }
    }
    
    // Si todavía no se encuentra, usar "N/A"
    if (!direccionEncontrada) {
        console.warn('⚠️ No se encontró campo de dirección.');
        direccionEncontrada = "N/A";
    }
    
    // ============================================
    // 3. NORMALIZAR NOMBRES DE CAMPOS
    // ============================================
    const datosNormalizados = {
        // ID
        "ENVIO ID": datos["ENVIO ID"] || datos.envioId || datos.id || datos.ID || "N/A",
        
        // Remitente
        "REMITE": datos["REMITE"] || datos.remite || datos["Remitente"] || "N/A",
        "TELEFONO": datos["TELEFONO"] || datos.telefono || "N/A",
        "CIUDAD": datos["CIUDAD"] || datos.ciudad || "Bogotá D.C.",
        
        // Destinatario
        "DESTINO": datos["DESTINO"] || datos.destino || "N/A",
        "TELEFONOCLIENTE": datos["TELEFONOCLIENTE"] || datos.telefonoCliente || "N/A",
        "DIRECCION DESTINO": direccionEncontrada,
        "BARRIO": datos["BARRIO"] || datos.barrio || "N/A",
        "COMPLEMENTO DE DIR": datos["COMPLEMENTO DE DIR"] || datos.complementoDir || "Ninguno",
        "CIUDAD DESTINO": datos["CIUDAD DESTINO"] || datos.ciudadDestino || "Bogotá D.C.",
        
        // Pago
        "FORMA DE PAGO": datos["FORMA DE PAGO"] || datos.formaPago || "Contraentrega",
        "VALOR A RECAUDAR": datos["VALOR A RECAUDAR"] || datos.valorRecaudar || "0",
        
        // Observaciones
        "OBS": datos["OBS"] || datos.observaciones || "",
        
        // FECHA ORIGINAL - ¡ESTO ES CLAVE PARA EL FOOTER!
        "FECHA DE CREACION": fechaOriginal,
        fecha: fechaOriginal,
        fechaCreacion: fechaOriginal
    };
    
    // ============================================
    // 4. PROCESAR VALOR A RECAUDAR
    // ============================================
    if (datosNormalizados["VALOR A RECAUDAR"]) {
        try {
            const valor = parseFloat(datosNormalizados["VALOR A RECAUDAR"].toString().replace(/[^0-9.-]+/g, ""));
            if (!isNaN(valor)) {
                datosNormalizados.valorFormateado = `$${valor.toLocaleString('es-CO')}`;
                console.log(`💰 Valor formateado: ${datosNormalizados.valorFormateado}`);
            } else {
                datosNormalizados.valorFormateado = "$0";
            }
        } catch (e) {
            console.error('Error formateando valor:', e);
            datosNormalizados.valorFormateado = "$0";
        }
    } else {
        datosNormalizados.valorFormateado = "$0";
    }
    
    // ============================================
    // 5. PROCESAR FECHA PARA MOSTRAR EN GUÍA
    // ============================================
    try {
        // Fecha para mostrar en encabezado (fecha normal)
        const fechaNormal = new Date(fechaOriginal);
        if (!isNaN(fechaNormal.getTime())) {
            datosNormalizados.fechaFormateada = fechaNormal.toLocaleDateString('es-CO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } else {
            datosNormalizados.fechaFormateada = new Date().toLocaleDateString('es-CO');
        }
        
        // Fecha para el FOOTER (fecha original completa)
        const fechaParaFooter = new Date(fechaOriginal);
        if (!isNaN(fechaParaFooter.getTime())) {
            datosNormalizados.fechaFooterFormateada = fechaParaFooter.toLocaleString('es-CO', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } else {
            datosNormalizados.fechaFooterFormateada = new Date().toLocaleString('es-CO');
        }
        
        console.log(`📅 Fecha encabezado: ${datosNormalizados.fechaFormateada}`);
        console.log(`📅 Fecha footer (original): ${datosNormalizados.fechaFooterFormateada}`);
        
    } catch (e) {
        console.error('Error formateando fecha:', e);
        const fechaActual = new Date();
        datosNormalizados.fechaFormateada = fechaActual.toLocaleDateString('es-CO');
        datosNormalizados.fechaFooterFormateada = fechaActual.toLocaleString('es-CO');
    }
    
    console.log('✅ Datos procesados correctamente');
    return datosNormalizados;
}

// ============================================
// GENERAR GUÍA - ACTUALIZADA PARA FECHA ORIGINAL
// ============================================
function generarGuia(datos) {
    console.log('🎨 Generando interfaz de guía...');
    
    // Actualizar elementos de la guía
    actualizarElemento('guiaId', datos["ENVIO ID"]);
    actualizarElemento('fecha', datos.fechaFormateada);
    
    // ¡IMPORTANTE! Usar fecha original para el footer
    actualizarElemento('fechaGeneracion', datos.fechaFooterFormateada || datos.fechaFormateada);
    
    // Forma de pago
    const formaPago = datos["FORMA DE PAGO"] || '';
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
    actualizarElemento('remitenteNombre', datos["REMITE"]);
    actualizarElemento('remitenteTelefono', datos["TELEFONO"]);
    actualizarElemento('remitenteCiudad', datos["CIUDAD"]);
    
    // Destinatario
    actualizarElemento('destinatarioNombre', datos["DESTINO"]);
    actualizarElemento('destinatarioTelefono', datos["TELEFONOCLIENTE"]);
    actualizarElemento('destinatarioDireccion', datos["DIRECCION DESTINO"]);
    actualizarElemento('destinatarioBarrio', datos["BARRIO"]);
    actualizarElemento('destinatarioCiudad', datos["CIUDAD DESTINO"]);
    actualizarElemento('complemento', datos["COMPLEMENTO DE DIR"]);
    
    // Información de pago
    actualizarElemento('valorRecaudar', datos.valorFormateado || `$${parseInt(datos["VALOR A RECAUDAR"] || 0).toLocaleString('es-CO')}`);
    
    console.log('✅ Interfaz de guía actualizada');
    console.log(`📅 Fecha en footer: ${document.getElementById('fechaGeneracion').textContent}`);
}
// ============================================
// FUNCIÓN CARGAR DATOS - CON MEJOR BÚSQUEDA DE FECHA
// ============================================
async function cargarDatos(envioId) {
    console.log('📡 Cargando datos para ID:', envioId);
    
    // 1. Intentar desde localStorage (datos completos recientes)
    const datosCompletos = localStorage.getItem('ultimoEnvioCompleto');
    if (datosCompletos) {
        try {
            const datos = JSON.parse(datosCompletos);
            if (datos.envioId === envioId || datos["ENVIO ID"] === envioId || datos.id === envioId) {
                console.log('✅ Datos cargados desde localStorage (recientes)');
                console.log('📅 Fecha en localStorage:', datos["FECHA DE CREACION"] || datos.fechaCreacion || datos.fecha);
                return procesarDatos(datos);
            }
        } catch (e) {
            console.error('Error parseando datos locales:', e);
        }
    }
    
    // 2. Intentar desde historial en localStorage
    try {
        const historial = JSON.parse(localStorage.getItem('historialCompleto')) || [];
        console.log(`🔍 Buscando ${envioId} en historial de ${historial.length} envíos`);
        
        // Buscar envío en el historial
        const envio = historial.find(e => 
            e["ENVIO ID"] === envioId || 
            e.id === envioId || 
            e.envioId === envioId ||
            (e.ID && e.ID.toString() === envioId.toString())
        );
        
        if (envio) {
            console.log('✅ Datos cargados desde historial local');
            console.log('📅 Fecha en historial:', envio["FECHA DE CREACION"] || envio.fechaCreacion || envio.fecha);
            return procesarDatos(envio);
        }
    } catch (e) {
        console.error('Error buscando en historial:', e);
    }
    
    // 3. Intentar desde Web App
    try {
        console.log('🌐 Intentando cargar desde Web App...');
        const response = await fetch(`${WEB_APP_URL}?action=obtenerGuia&id=${encodeURIComponent(envioId)}`);
        
        if (response.ok) {
            const datos = await response.json();
            console.log('✅ Datos cargados desde Web App');
            console.log('📅 Fecha desde Web App:', datos["FECHA DE CREACION"] || datos.fechaCreacion || datos.fecha);
            return procesarDatos(datos);
        }
    } catch (error) {
        console.log('⚠️ No se pudo cargar desde Web App:', error.message);
    }
    
    // 4. Crear datos de ejemplo si todo falla
    console.log('⚠️ Usando datos de ejemplo');
    return crearDatosEjemplo(envioId);
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
        
        // Limpiar SVG existente
        svgElement.innerHTML = '';
        
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
    actualizarElemento('guiaId', datos["ENVIO ID"]);
    actualizarElemento('fecha', datos.fechaFormateada);
   // Usar fecha del envío en lugar de fecha actual
const fechaGuia = datos.fecha || datos.fechaCreacion || datos["FECHA ENVIO"] || datos["FECHA REGISTRO"] || new Date().toISOString();
const fechaParaFooter = new Date(fechaGuia);
actualizarElemento('fechaGeneracion', fechaParaFooter.toLocaleString('es-CO'));
    
    // Forma de pago
    const formaPago = datos["FORMA DE PAGO"] || '';
    let formaPagoTexto = '';
    switch(formaPago.toLowerCase()) {
        case 'contado': formaPagoTexto = 'Contado'; break;
        case 'contraentrega': formaPagoTexto = 'Contraentrega'; break;
        case 'contraentrega_recaudo': 
        case 'con recaudo':
        case 'contraentrega con recaudo':
            formaPagoTexto = 'Con Recaudo'; 
            break;
        case 'credito':
        case 'crédito':
            formaPagoTexto = 'Crédito';
            break;
        default: formaPagoTexto = formaPago || 'N/A';
    }
    actualizarElemento('formaPago', formaPagoTexto);
    
    // Remitente
    actualizarElemento('remitenteNombre', datos["REMITE"]);
    actualizarElemento('remitenteTelefono', datos["TELEFONO"]);
    actualizarElemento('remitenteCiudad', datos["CIUDAD"]);
    
    // Destinatario
    actualizarElemento('destinatarioNombre', datos["DESTINO"]);
    actualizarElemento('destinatarioTelefono', datos["TELEFONOCLIENTE"]);
    actualizarElemento('destinatarioDireccion', datos["DIRECCION DESTINO"]);
    actualizarElemento('destinatarioBarrio', datos["BARRIO"]);
    actualizarElemento('destinatarioCiudad', datos["CIUDAD DESTINO"]);
    actualizarElemento('complemento', datos["COMPLEMENTO DE DIR"]);
    
    // Información de pago
    actualizarElemento('valorRecaudar', datos.valorFormateado || `$${parseInt(datos["VALOR A RECAUDAR"] || 0).toLocaleString('es-CO')}`);
    
    console.log('✅ Interfaz de guía actualizada');
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function actualizarElemento(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = valor || '';
        console.log(`✓ ${id}: "${valor}"`);
    } else {
        console.warn(`⚠️ Elemento no encontrado: ${id}`);
    }
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
// PARA DEBUGGING AVANZADO
// ============================================
window.debugGuia = function() {
    console.log('=== DEBUG GUÍA COMPLETO ===');
    console.log('URL:', window.location.href);
    console.log('URL Params:', Object.fromEntries(new URLSearchParams(window.location.search)));
    
    const envioId = obtenerEnvioId();
    console.log('ID de envío detectado:', envioId);
    
    // Verificar localStorage
    console.log('LocalStorage - envioParaGuia:', localStorage.getItem('envioParaGuia'));
    
    const ultimoEnvio = localStorage.getItem('ultimoEnvioCompleto');
    console.log('LocalStorage - ultimoEnvioCompleto:', ultimoEnvio ? JSON.parse(ultimoEnvio) : 'No existe');
    
    const historial = localStorage.getItem('historialCompleto');
    console.log('LocalStorage - historialCompleto:', historial ? `(${JSON.parse(historial).length} envíos)` : 'No existe');
    
    // Verificar elementos del DOM
    console.log('Elementos del DOM:');
    const elementosIds = [
        'guiaId', 'fecha', 'formaPago', 'remitenteNombre',
        'remitenteTelefono', 'remitenteCiudad', 'destinatarioNombre',
        'destinatarioTelefono', 'destinatarioDireccion', 'destinatarioBarrio',
        'destinatarioCiudad', 'complemento', 'valorRecaudar'
    ];
    
    elementosIds.forEach(id => {
        const elem = document.getElementById(id);
        console.log(`  ${id}:`, elem ? `"${elem.textContent}"` : 'NO ENCONTRADO');
    });
    
    console.log('=== FIN DEBUG ===');
};

// Función para forzar recarga de datos
window.recargarGuia = function() {
    console.log('🔄 Recargando guía...');
    cargarDatosEnvio();
};

// ============================================
// FUNCIÓN ESPECIAL PARA DEPURAR DIRECCIÓN
// ============================================
window.depurarDireccion = function() {
    console.log('=== DEPURACIÓN ESPECÍFICA DE DIRECCIÓN ===');
    
    const envioId = obtenerEnvioId();
    console.log('ID actual:', envioId);
    
    // Verificar todos los posibles lugares donde podría estar la dirección
    console.log('1. Verificando localStorage...');
    
    // Revisar ultimoEnvioCompleto
    const ultimoEnvio = localStorage.getItem('ultimoEnvioCompleto');
    if (ultimoEnvio) {
        try {
            const datos = JSON.parse(ultimoEnvio);
            console.log('📦 Datos en ultimoEnvioCompleto:');
            Object.keys(datos).forEach(key => {
                if (key.toLowerCase().includes('dir') || key.toLowerCase().includes('direccion') || key.toLowerCase().includes('address')) {
                    console.log(`  🔍 "${key}": "${datos[key]}"`);
                }
            });
        } catch (e) {
            console.error('Error parseando:', e);
        }
    }
    
    // Revisar historial
    const historial = localStorage.getItem('historialCompleto');
    if (historial && envioId) {
        try {
            const historialData = JSON.parse(historial);
            const envio = historialData.find(e => 
                e["ENVIO ID"] === envioId || 
                e.id === envioId || 
                e.envioId === envioId ||
                e.ID === envioId
            );
            
            if (envio) {
                console.log('📋 Envío encontrado en historial:');
                Object.keys(envio).forEach(key => {
                    console.log(`  "${key}": "${envio[key]}"`);
                });
            }
        } catch (e) {
            console.error('Error:', e);
        }
    }
    
    console.log('=== FIN DEPURACIÓN ===');
};
