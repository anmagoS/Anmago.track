// guia.js - VERSIÓN CORREGIDA

console.log('🎯 guia.js iniciado');

document.addEventListener('DOMContentLoaded', function() {
    console.log('📋 DOM cargado');
    
    const envioId = localStorage.getItem('envioParaGuia');
    console.log('🔍 ID a buscar:', envioId);
    
    if (!envioId) {
        mostrarError('No se encontró el ID del envío.');
        return;
    }
    
    // PRIMERO buscar en localStorage (datos recién guardados)
    buscarEnLocalStorage(envioId);
    configurarBotones();
});

// ==================== BUSCAR PRIMERO EN LOCALSTORAGE ====================
function buscarEnLocalStorage(envioId) {
    console.log('🔍 Buscando en localStorage...');
    
    // 1. Buscar en enviosPendientes
    const enviosPendientes = JSON.parse(localStorage.getItem('enviosPendientes')) || [];
    const envioLocal = enviosPendientes.find(envio => envio["ENVIO ID"] === envioId);
    
    if (envioLocal) {
        console.log('✅ Envío encontrado en localStorage:', envioLocal);
        cargarDatosEnGuia(convertirDatosLocal(envioLocal));
        setTimeout(() => generarQR(convertirDatosLocal(envioLocal)), 100);
        return;
    }
    
    // 2. Buscar en guiaDatosCompletos
    const guiaDatos = localStorage.getItem('guiaDatosCompletos');
    if (guiaDatos) {
        try {
            const datos = JSON.parse(guiaDatos);
            if (datos.datos && (datos.datos["ENVIO ID"] === envioId || datos.datos.envioId === envioId)) {
                console.log('✅ Envío encontrado en guiaDatosCompletos');
                cargarDatosEnGuia(convertirDatosLocal(datos.datos));
                setTimeout(() => generarQR(convertirDatosLocal(datos.datos)), 100);
                return;
            }
        } catch (error) {
            console.error('Error parseando guiaDatosCompletos:', error);
        }
    }
    
    // 3. Buscar en historialEnvios
    const historial = JSON.parse(localStorage.getItem('historialEnvios')) || [];
    const envioHistorial = historial.find(envio => envio["ENVIO ID"] === envioId);
    
    if (envioHistorial) {
        console.log('✅ Envío encontrado en historialEnvios');
        cargarDatosEnGuia(convertirDatosLocal(envioHistorial));
        setTimeout(() => generarQR(convertirDatosLocal(envioHistorial)), 100);
        return;
    }
    
    // 4. Si no está en localStorage, buscar en Sheets
    console.log('⚠️ No encontrado en localStorage, buscando en Sheets...');
    buscarEnSheets(envioId);
}

// ==================== CONVERTIR DATOS LOCAL A FORMATO ESPERADO ====================
function convertirDatosLocal(datos) {
    console.log('🔄 Convirtiendo datos locales:', datos);
    
    // Formato esperado por cargarDatosEnGuia
    return {
        envioId: datos["ENVIO ID"] || datos.envioId || datos.id || '',
        formaPago: datos["FORMA DE PAGO"] || datos.formaPago || 'contraentrega',
        remite: datos["REMITE"] || datos.remite || datos.remitenteNombre || '',
        telefono: datos["TELEFONO"] || datos.telefono || datos.remitenteTelefono || '',
        ciudad: datos["CIUDAD"] || datos.ciudad || datos.remitenteCiudad || 'Bogotá D.C.',
        destino: datos["DESTINO"] || datos.destino || datos.destinatarioNombre || '',
        telefonoCliente: datos["TELEFONOCLIENTE"] || datos.telefonoCliente || datos.destinatarioTelefono || '',
        direccionDestino: datos["DIRECCION DESTINO"] || datos.direccionDestino || datos.destinatarioDireccion || '',
        barrio: datos["BARRIO"] || datos.barrio || datos.barrioLocalidad || '',
        complementoDir: datos["COMPLEMENTO DE DIR"] || datos.complementoDir || datos.complemento || '',
        ciudadDestino: datos["CIUDAD DESTINO"] || datos.ciudadDestino || datos.destinatarioCiudad || '',
        valorRecaudar: datos["VALOR A RECAUDAR"] || datos.valorRecaudar || '0',
        totalAPagar: datos["TOTAL A PAGAR"] || datos.totalAPagar || '0',
        localidad: datos["LOCALIDAD"] || datos.localidad || datos.zona || '',
        mensajero: datos["MENSAJERO"] || datos.mensajero || '',
        observaciones: datos["OBS"] || datos.observaciones || ''
    };
}

// ==================== BUSCAR EN SHEETS (FALLBACK) ====================
function buscarEnSheets(envioId) {
    console.log('📡 Buscando en Sheets...');
    
    const url = `https://script.google.com/macros/s/AKfycbxIipuPmVAvaTt7_oUQzMLNtXIah19dcq2CWkaoglQvFivqY-wBYEw64tvUmL4-1k62/exec?action=obtenerGuia&id=${envioId}`;
    
    console.log('🔗 URL de búsqueda:', url);
    
    fetch(url)
        .then(response => {
            console.log('📥 Status:', response.status, 'OK:', response.ok);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('✅ Datos recibidos de Sheets:', data);
            
            if (data.error || data.success === false || data.encontrado === false) {
                console.warn('⚠️ No encontrado en Sheets, usando datos locales del formulario');
                // Intentar obtener datos del formulario recién enviado
                obtenerDatosDelUltimoFormulario(envioId);
            } else {
                cargarDatosEnGuia(data);
                setTimeout(() => generarQR(data), 100);
            }
        })
        .catch(error => {
            console.error('❌ Error fetch:', error);
            console.warn('⚠️ Error de conexión, usando datos locales');
            obtenerDatosDelUltimoFormulario(envioId);
        });
}

// ==================== OBTENER DATOS DEL ÚLTIMO FORMULARIO ====================
function obtenerDatosDelUltimoFormulario(envioId) {
    console.log('📋 Intentando obtener datos del formulario reciente...');
    
    // 1. Buscar en localStorage reciente
    const datosRecientes = localStorage.getItem('ultimoEnvioCompleto');
    if (datosRecientes) {
        try {
            const datos = JSON.parse(datosRecientes);
            if (datos.envioId === envioId || datos["ENVIO ID"] === envioId) {
                console.log('✅ Datos recientes encontrados');
                cargarDatosEnGuia(convertirDatosLocal(datos));
                setTimeout(() => generarQR(convertirDatosLocal(datos)), 100);
                return;
            }
        } catch (error) {
            console.error('Error parseando datos recientes:', error);
        }
    }
    
    // 2. Si no hay datos, mostrar error con opción de volver
    mostrarErrorConOpciones(
        `El envío ${envioId} aún no está sincronizado con el servidor.<br><br>
        Esto puede pasar porque:<br>
        1. Acabas de crear el envío<br>
        2. Hay problemas de conexión<br>
        3. El envío aún no se procesó<br><br>
        <strong>¿Qué quieres hacer?</strong>`,
        envioId
    );
}

// ==================== MOSTRAR ERROR CON OPCIONES ====================
function mostrarErrorConOpciones(mensaje, envioId) {
    console.error('🛑 Error con opciones:', mensaje);
    
    const container = document.querySelector('.guia-container');
    container.innerHTML = `
        <div style="padding: 30px; text-align: center;">
            <h2 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Envío en Proceso</h2>
            <div style="margin-bottom: 20px; text-align: left;">
                ${mensaje}
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px; max-width: 300px; margin: 0 auto;">
                <button onclick="volverYReintentar()" style="padding: 12px 20px; background: #135bec; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    🔄 Volver e Intentar Nuevamente
                </button>
                <button onclick="intentarConDatosLocales('${envioId}')" style="padding: 12px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    📝 Usar Datos Locales (Si los tienes)
                </button>
                <button onclick="window.close()" style="padding: 12px 20px; background: transparent; color: #135bec; border: 2px solid #135bec; border-radius: 5px; cursor: pointer;">
                    ✖️ Cerrar
                </button>
            </div>
            <p style="font-size: 12px; color: #666; margin-top: 25px;">
                ID: ${envioId}<br>
                Hora: ${new Date().toLocaleTimeString()}<br>
                <em>Nota: Los envíos pueden tardar unos minutos en sincronizarse</em>
            </p>
        </div>
    `;
}

// ==================== FUNCIONES AUXILIARES PARA LOS BOTONES ====================
function volverYReintentar() {
    // Guardar el ID actual para intentarlo más tarde
    const envioId = localStorage.getItem('envioParaGuia');
    localStorage.setItem('envioPendienteReintento', envioId);
    
    // Cerrar esta ventana y volver al formulario
    window.close();
    
    // Si estamos en la misma ventana, redirigir
    if (window.opener) {
        window.opener.focus();
    }
}

function intentarConDatosLocales(envioId) {
    console.log('🔄 Intentando con datos locales manualmente...');
    
    // Buscar en todas las fuentes locales posibles
    buscarEnLocalStorage(envioId);
}

// ==================== CARGAR DATOS EN GUÍA (MEJORADO) ====================
function cargarDatosEnGuia(datos) {
    console.log('📝 Cargando datos en guía:', datos);
    
    try {
        // Fechas
        const fecha = new Date().toLocaleDateString('es-CO');
        const fechaHora = new Date().toLocaleString('es-CO');
        
        // ENCABEZADO
        document.getElementById('guiaId').textContent = datos.envioId || datos.id || 'Sin ID';
        document.getElementById('fecha').textContent = fecha;
        document.getElementById('formaPago').textContent = (datos.formaPago || 'CONTRAENTREGA').toUpperCase();
        
        // REMITENTE
        document.getElementById('remitenteNombre').textContent = (datos.remite || datos.remitenteNombre || 'Sin nombre').toUpperCase();
        document.getElementById('remitenteTelefono').textContent = datos.telefono || datos.remitenteTelefono || 'Sin teléfono';
        document.getElementById('remitenteCiudad').textContent = datos.ciudad || datos.remitenteCiudad || 'Bogotá D.C.';
        
        // DESTINATARIO
        document.getElementById('destinatarioNombre').textContent = (datos.destino || datos.destinatarioNombre || 'Sin nombre').toUpperCase();
        document.getElementById('destinatarioTelefono').textContent = datos.telefonoCliente || datos.destinatarioTelefono || 'Sin teléfono';
        document.getElementById('destinatarioDireccion').textContent = datos.direccionDestino || datos.destinatarioDireccion || 'Sin dirección';
        document.getElementById('destinatarioBarrio').textContent = (datos.barrio || datos.barrioLocalidad || 'Sin barrio').toUpperCase();
        document.getElementById('destinatarioCiudad').textContent = datos.ciudadDestino || datos.destinatarioCiudad || 'Sin ciudad';
        document.getElementById('complemento').textContent = datos.complementoDir || datos.complemento || '';
        
        // PAGO
        const valor = parseInt(datos.valorRecaudar || 0);
        document.getElementById('valorRecaudar').textContent = `$${valor.toLocaleString('es-CO')}`;
        
        // LOGÍSTICA
        document.getElementById('zona').textContent = datos.localidad || datos.zona || 'Por asignar';
        document.getElementById('mensajero').textContent = datos.mensajero || 'Por asignar';
        document.getElementById('observaciones').textContent = datos.observaciones || '           ';
        
        // FECHA
        document.getElementById('fechaGeneracion').textContent = fechaHora;
        
        console.log('✅ Guía cargada correctamente');
        console.log('📍 Localidad:', datos.localidad);
        console.log('🚚 Mensajero:', datos.mensajero);
        
    } catch (error) {
        console.error('❌ Error cargando guía:', error);
        mostrarError('Error al cargar datos: ' + error.message);
    }
}

// ==================== GENERAR QR ====================
function generarQR(datos) {
    console.log('🔳 Generando QR...');
    
    // Verificar que QRCode esté disponible
    if (typeof QRCode === 'undefined') {
        console.error('❌ QRCode no está definido');
        document.getElementById('qrData').textContent = 'QR no disponible';
        
        // Intentar cargar la librería dinámicamente
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js';
        script.onload = () => {
            console.log('✅ QRCode cargado dinámicamente');
            generarQR(datos); // Reintentar
        };
        document.head.appendChild(script);
        return;
    }
    
    try {
        // Preparar datos para QR
        const qrData = JSON.stringify({
            id: datos.envioId || datos.id || '',
            telefono: datos.telefonoCliente || datos.destinatarioTelefono || '',
            valor: datos.valorRecaudar || '0',
            destino: datos.destino || datos.destinatarioNombre || ''
        });
        
        console.log('📱 QR Data:', qrData);
        
        document.getElementById('qrData').textContent = qrData;
        
        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = '';
        
        // Generar QR
        new QRCode(qrContainer, {
            text: qrData,
            width: 80,
            height: 80,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
        
        console.log('✅ QR generado correctamente');
        
    } catch (error) {
        console.error('❌ Error generando QR:', error);
        document.getElementById('qrData').textContent = 'Error QR: ' + error.message;
    }
}

// ==================== CONFIGURAR BOTONES ====================
function configurarBotones() {
    const printBtn = document.querySelector('.btn-print');
    const closeBtn = document.querySelector('.btn-close');
    
    if (printBtn) {
        printBtn.onclick = () => {
            console.log('🖨️ Imprimiendo guía...');
            window.print();
        };
    }
    
    if (closeBtn) {
        closeBtn.onclick = () => {
            console.log('❌ Cerrando ventana...');
            window.close();
        };
    }
}

// ==================== MOSTRAR ERROR ====================
function mostrarError(mensaje) {
    console.error('🛑 Error:', mensaje);
    
    const container = document.querySelector('.guia-container');
    container.innerHTML = `
        <div style="padding: 30px; text-align: center;">
            <h2 style="color: #e74c3c; margin-bottom: 20px;">⚠️ Error</h2>
            <p style="margin-bottom: 15px;">${mensaje}</p>
            <p style="font-size: 12px; color: #666; margin-bottom: 20px;">
                ID: ${localStorage.getItem('envioParaGuia')}<br>
                Hora: ${new Date().toLocaleTimeString()}
            </p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="window.close()" style="padding: 10px 20px; background: #135bec; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Cerrar
                </button>
                <button onclick="location.href='index.html'" style="padding: 10px 20px; background: transparent; color: #135bec; border: 2px solid #135bec; border-radius: 5px; cursor: pointer;">
                    Volver
                </button>
            </div>
        </div>
    `;
}
