// ============================================
// CONFIGURACIÓN GLOBAL
// ============================================
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxIipuPmVAvaTt7_oUQzMLNtXIah19dcq2CWkaoglQvFivqY-wBYEw64tvUmL4-1k62/exec";
const REMITENTES_URL = "https://script.google.com/macros/s/AKfycbxIipuPmVAvaTt7_oUQzMLNtXIah19dcq2CWkaoglQvFivqY-wBYEw64tvUmL4-1k62/exec?action=getRemitentes";
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxIipuPmVAvaTt7_oUQzMLNtXIah19dcq2CWkaoglQvFivqY-wBYEw64tvUmL4-1k62/exec";

// Variables globales
let barriosData = [];
let remitentesData = [];
let usuariosDisponibles = [];
let currentFocus = -1;
let filteredBarrios = [];
let closeBarrioDropdownTimeout = null;
let dropdownJustClicked = false;
let timeoutBusqueda = null;
let formularioEnviandose = false;

// Variables para precios por ciudad
const PRECIOS_CIUDAD = {
    "Bogotá D.C.": 10000,
    "Soacha": 12000
};

// Elementos del DOM
let formaPagoInput, valorRecaudarInput, autoRecaudoLabel, valorRecaudarHelp;
let paymentOptions, barrioInput, barrioIdInput, autocompleteDropdown;
let remitenteInput, remitenteDropdown;
let resumenFormaPago, resumenValorRecaudar, resumenEstado;
let submitButton, submitText, submitIcon;

// ============================================
// GOOGLE PLACES AUTOCOMPLETE - COMPATIBLE SIN API KEY
// ============================================

function inicializarGooglePlacesAutocomplete() {
    console.log("📍 Inicializando Google Places Autocomplete (modo seguro)...");
    
    const direccionInput = document.getElementById('direccionDestino');
    const barrioInput = document.getElementById('barrioLocalidad');
    
    if (!direccionInput) {
        console.error("❌ No se encontró el campo 'direccionDestino'");
        return;
    }
    
    // ============================================
    // VERIFICAR SI GOOGLE MAPS ESTÁ DISPONIBLE
    // ============================================
    if (typeof google === 'undefined') {
        console.log("⚠️ Google Maps no está disponible globalmente");
        habilitarAlternativaManual();
        return;
    }
    
    if (!google.maps || !google.maps.places) {
        console.log("⚠️ Google Places API no está disponible");
        habilitarAlternativaManual();
        return;
    }
    
    try {
        // ============================================
        // INTENTAR INICIALIZAR CON CONFIGURACIÓN BÁSICA
        // ============================================
        const autocomplete = new google.maps.places.Autocomplete(direccionInput, {
            componentRestrictions: { country: 'co' },
            fields: ['address_components', 'formatted_address', 'geometry'],
            types: ['address']
        });
        
        console.log("✅ Autocomplete creado exitosamente");
        
        // Deshabilitar autocomplete nativo
        direccionInput.setAttribute('autocomplete', 'off');
        
        // ============================================
        // EVENTO SIMPLIFICADO
        // ============================================
        autocomplete.addListener('place_changed', function() {
            try {
                const place = autocomplete.getPlace();
                
                if (!place.geometry) {
                    console.log("⚠️ Usuario no seleccionó de la lista");
                    return;
                }
                
                console.log("📍 Lugar seleccionado:", place.formatted_address);
                
                // Guardar datos globalmente
                window.ultimaDireccionSeleccionada = {
                    direccion_completa: place.formatted_address,
                    latitud: place.geometry.location.lat(),
                    longitud: place.geometry.location.lng()
                };
                
                // Extraer barrio de forma básica
                if (barrioInput && place.address_components) {
                    let barrioEncontrado = '';
                    
                    place.address_components.forEach(component => {
                        const tipos = component.types;
                        
                        if (tipos.includes('sublocality') || tipos.includes('sublocality_level_1')) {
                            barrioEncontrado = component.long_name;
                        } else if (tipos.includes('neighborhood') && !barrioEncontrado) {
                            barrioEncontrado = component.long_name;
                        } else if (tipos.includes('administrative_area_level_3') && !barrioEncontrado) {
                            barrioEncontrado = component.long_name;
                        }
                    });
                    
                    if (barrioEncontrado) {
                        barrioInput.value = barrioEncontrado;
                        console.log(`✅ Barrio detectado: ${barrioEncontrado}`);
                        
                        // Disparar eventos
                        barrioInput.dispatchEvent(new Event('input', { bubbles: true }));
                        barrioInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
                
                // Mostrar notificación simple
                mostrarNotificacionSimple(`✅ Dirección encontrada: ${place.formatted_address.substring(0, 40)}...`);
                
            } catch (error) {
                console.error("❌ Error procesando selección:", error);
            }
        });
        
        // Prevenir Enter
        direccionInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
        
        console.log("✅ Google Places inicializado correctamente");
        
    } catch (error) {
        console.error("❌ Error en Google Places:", error);
        habilitarAlternativaManual();
    }
}

// ============================================
// ALTERNATIVA MANUAL CUANDO NO HAY GOOGLE MAPS
// ============================================

function habilitarAlternativaManual() {
    console.log("🔄 Habilitando alternativa manual...");
    
    const direccionInput = document.getElementById('direccionDestino');
    const barrioInput = document.getElementById('barrioLocalidad');
    
    if (!direccionInput) return;
    
    // Mostrar mensaje informativo
    const mensajeDiv = document.createElement('div');
    mensajeDiv.className = 'text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1';
    mensajeDiv.innerHTML = `
        <span class="material-symbols-outlined text-sm">info</span>
        <span>Ingresa la dirección manualmente. Sugerencia: Usa formato "Calle XX # YY-ZZ, Barrio"</span>
    `;
    
    if (direccionInput.parentNode) {
        direccionInput.parentNode.appendChild(mensajeDiv);
    }
    
    // Ayuda para extraer barrio automáticamente del texto
    let timeoutId;
    direccionInput.addEventListener('input', function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            if (this.value.length > 20 && barrioInput && !barrioInput.value) {
                extraerBarrioSimple(this.value, barrioInput);
            }
        }, 1500);
    });
    
    // Cuando el usuario presiona Enter
    direccionInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (barrioInput && !barrioInput.value) {
                extraerBarrioSimple(this.value, barrioInput);
            }
        }
    });
}

function extraerBarrioSimple(texto, barrioInputElement) {
    if (!texto || !barrioInputElement) return;
    
    console.log("🔍 Extrayendo barrio del texto:", texto.substring(0, 50));
    
    const textoLower = texto.toLowerCase();
    let barrioEncontrado = '';
    
    // Palabras clave comunes en Bogotá
    const palabrasClave = [
        'usaquén', 'chapinero', 'santa fe', 'san cristóbal', 'usme',
        'tunjuelito', 'bosa', 'kennedy', 'fontibón', 'engativá',
        'suba', 'barrios unidos', 'teusaquillo', 'los mártires',
        'antonio nariño', 'puente aranda', 'candelaria', 'rafael uribe',
        'modelia', 'timiza', 'patio bonito', 'alquería', 'ciudad jardín',
        'soacha', 'ciudad verde', 'san mateo'
    ];
    
    // Buscar palabras clave
    for (const palabra of palabrasClave) {
        if (textoLower.includes(palabra)) {
            // Encontrar la palabra exacta
            const regex = new RegExp(palabra, 'i');
            const match = texto.match(regex);
            if (match) {
                barrioEncontrado = match[0];
                break;
            }
        }
    }
    
    // Si no encontró, buscar patrones
    if (!barrioEncontrado) {
        const patrones = [
            /(?:cll|cra|av|diag|ak|trans)\s*\d+\s*[#\-]\s*\d+\s*[-\w]+\s*[-–]\s*([\w\sáéíóúñ]+)/i,
            /(?:barrio|brr|br|sector)\s+([\w\sáéíóúñ]+)/i,
            /,\s*([\w\sáéíóúñ]+)(?:,\s*(?:bogotá|soacha))?$/i
        ];
        
        for (const patron of patrones) {
            const match = texto.match(patron);
            if (match && match[1]) {
                barrioEncontrado = match[1].trim();
                // Limpiar
                barrioEncontrado = barrioEncontrado.replace(/^en\s+/i, '')
                                                   .replace(/^el\s+/i, '')
                                                   .replace(/,$/, '');
                break;
            }
        }
    }
    
    // Si encontramos un barrio
    if (barrioEncontrado) {
        // Capitalizar
        barrioEncontrado = barrioEncontrado.split(' ')
            .map(pal => pal.charAt(0).toUpperCase() + pal.slice(1).toLowerCase())
            .join(' ');
        
        barrioInputElement.value = barrioEncontrado;
        console.log(`✅ Barrio extraído: ${barrioEncontrado}`);
        
        // Disparar eventos
        barrioInputElement.dispatchEvent(new Event('input', { bubbles: true }));
        barrioInputElement.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Mostrar notificación breve
        mostrarNotificacionSimple(`📍 Barrio detectado: ${barrioEncontrado}`);
        
        return barrioEncontrado;
    }
    
    return null;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function mostrarNotificacionSimple(mensaje) {
    // Eliminar notificaciones anteriores
    const notifsAnteriores = document.querySelectorAll('.notificacion-simple');
    notifsAnteriores.forEach(n => n.remove());
    
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion-simple fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-slideUp';
    notificacion.style.cssText = `
        animation: slideUp 0.3s ease-out forwards;
        white-space: nowrap;
        max-width: 90%;
        overflow: hidden;
        text-overflow: ellipsis;
    `;
    
    notificacion.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-sm">check_circle</span>
            <span class="text-sm font-medium">${mensaje}</span>
        </div>
    `;
    
    document.body.appendChild(notificacion);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        notificacion.style.animation = 'slideDown 0.3s ease-in forwards';
        setTimeout(() => {
            if (notificacion.parentElement) notificacion.remove();
        }, 300);
    }, 3000);
}

function agregarAnimacionesCSS() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translate(-50%, 20px);
            }
            to {
                opacity: 1;
                transform: translate(-50%, 0);
            }
        }
        
        @keyframes slideDown {
            from {
                opacity: 1;
                transform: translate(-50%, 0);
            }
            to {
                opacity: 0;
                transform: translate(-50%, 20px);
            }
        }
        
        .animate-slideUp {
            animation: slideUp 0.3s ease-out forwards;
        }
        
        /* Estilos básicos para Google Places si está disponible */
        .pac-container {
            z-index: 10002 !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
            border: 1px solid #e5e7eb !important;
            margin-top: 4px !important;
        }
        
        .pac-item {
            padding: 8px 12px !important;
            cursor: pointer !important;
            border-bottom: 1px solid #f3f4f6 !important;
            font-size: 14px !important;
        }
        
        .pac-item:hover {
            background-color: #f9fafb !important;
        }
        
        @media (max-width: 767px) {
            .pac-container {
                position: fixed !important;
                top: auto !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                width: 100vw !important;
                max-height: 50vh !important;
                border-radius: 12px 12px 0 0 !important;
            }
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// FUNCIÓN PRINCIPAL DE INICIALIZACIÓN - SIMPLIFICADA
// ============================================
function initApp() {
    console.log('🚀 Inicializando aplicación...');
    
    initializeDOMElements();
    
    loadBarriosData().then(() => {
        loadRemitentesData();
        loadUsuariosParaAutocomplete().then(() => {
            setupEventListeners();
            initializeUI();
            
            // ============================================
            // INICIALIZACIÓN SEGURA DE GOOGLE MAPS
            // ============================================
            console.log('🔍 Verificando Google Maps...');
            
            // Intentar cargar Google Maps de forma segura
            const checkGoogleMaps = () => {
                if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                    console.log('✅ Google Maps disponible');
                    try {
                        inicializarGooglePlacesAutocomplete();
                    } catch (error) {
                        console.error('❌ Error inicializando Google Places:', error);
                        habilitarAlternativaManual();
                    }
                } else {
                    console.log('🔄 Google Maps no disponible - usando modo manual');
                    habilitarAlternativaManual();
                }
            };
            
            // Esperar un momento por si Google Maps se carga después
            setTimeout(checkGoogleMaps, 1000);
            
            console.log('✅ Aplicación inicializada');
        });
    }).catch(error => {
        console.error('❌ Error inicializando:', error);
        loadRemitentesData();
        setupEventListeners();
        initializeUI();
        habilitarAlternativaManual();
    });
}

// ============================================
// FUNCIONES DE INICIALIZACIÓN DEL DOM (IGUAL)
// ============================================

function initializeDOMElements() {
    console.log('🔍 Inicializando elementos DOM...');
    
    formaPagoInput = document.getElementById('formaPago');
    valorRecaudarInput = document.getElementById('valorRecaudar');
    autoRecaudoLabel = document.getElementById('autoRecaudoLabel');
    valorRecaudarHelp = document.getElementById('valorRecaudarHelp');
    paymentOptions = document.querySelectorAll('.payment-option');
    barrioInput = document.getElementById('barrioLocalidad');
    barrioIdInput = document.getElementById('barrioId');
    autocompleteDropdown = document.getElementById('autocompleteDropdown');
    resumenFormaPago = document.getElementById('resumenFormaPago');
    resumenValorRecaudar = document.getElementById('resumenValorRecaudar');
    resumenEstado = document.getElementById('resumenEstado');
    submitButton = document.getElementById('submitButton');
    submitText = document.getElementById('submitText');
    submitIcon = document.getElementById('submitIcon');
    
    remitenteInput = document.getElementById('remitente');
    remitenteDropdown = document.getElementById('remitenteAutocomplete');
    
    console.log('📍 Campo barrio:', barrioInput ? '✅' : '❌');
    console.log('📍 Dropdown barrio:', autocompleteDropdown ? '✅' : '❌');
}

// ============================================
// FUNCIONES PARA CARGA DE DATOS (IGUAL)
// ============================================

function loadBarriosData() {
    console.log('📂 Cargando datos de barrios...');
    
    return fetch('barrios.json')
        .then(response => {
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            return response.json();
        })
        .then(data => {
            barriosData = data;
            window.barriosData = data;
            console.log(`✅ Cargados ${barriosData.length} barrios`);
            return data;
        })
        .catch(error => {
            console.error('❌ Error cargando barrios:', error);
            barriosData = getDefaultBarrios();
            window.barriosData = barriosData;
            return barriosData;
        });
}

function getDefaultBarrios() {
    return [
        { id: "ATB6ZXHU", nombre: "USAQUÉN-SANTA BARBARA ORIENTAL" },
        { id: "1HOGOY32", nombre: "USAQUÉN-SANTA BARBARA CENTRAL" },
        { id: "WYWRDLUX", nombre: "USAQUÉN-CHICO NORTE II SECTOR" },
        { id: "5TKZNTB2", nombre: "USAQUÉN-SANTA BARBARA OCCIDENTAL" },
        { id: "5DUKSNR5", nombre: "USAQUÉN-SAN PATRICIO" }
    ];
}

function loadRemitentesData() {
    console.log('📂 Cargando datos de remitentes...');
    
    return fetch(REMITENTES_URL)
        .then(response => response.json())
        .then(data => {
            remitentesData = data;
            console.log(`✅ Cargados ${remitentesData.length} remitentes`);
            return data;
        })
        .catch(error => {
            console.error('❌ Error cargando remitentes:', error);
            remitentesData = [];
            return [];
        });
}

async function loadUsuariosParaAutocomplete() {
    try {
        console.log("🔄 Cargando remitentes para autocomplete desde Google Sheets...");
        
        // Usar directamente el endpoint de remitentes
        const response = await fetch(REMITENTES_URL);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const remitentes = await response.json();
        
        // Asignar directamente a usuariosDisponibles
        usuariosDisponibles = remitentes.filter(r => 
            r["NOMBRE REMITENTE"] || r["NOMBRE COMPLETO"]
        );
        
        window.usuariosDisponibles = usuariosDisponibles;
        
        console.log(`✅ ${usuariosDisponibles.length} remitentes cargados desde Google Sheets`);
        
        return usuariosDisponibles;
        
    } catch (error) {
        console.error("❌ Error cargando remitentes para autocomplete:", error);
        
        // Intentar usar remitentesData si ya está cargada
        if (remitentesData && remitentesData.length > 0) {
            console.log("🔄 Usando remitentesData ya cargada...");
            usuariosDisponibles = remitentesData.filter(r => 
                r["NOMBRE REMITENTE"] || r["NOMBRE COMPLETO"]
            );
            window.usuariosDisponibles = usuariosDisponibles;
            return usuariosDisponibles;
        }
        
        usuariosDisponibles = [];
        window.usuariosDisponibles = [];
        return [];
    }
}


// ============================================
// VERIFICACIÓN DE AUTENTICACIÓN Y SESIÓN (IGUAL)
// ============================================

function verificarSesionYConfigurarUI() {
    console.log("🔐 Verificando autenticación...");
    
    const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
    const loadingScreen = document.getElementById('loadingScreen');
    const mainContent = document.getElementById('mainContent');
    
    if (!usuario) {
        setTimeout(() => {
            alert("Debes iniciar sesión para acceder a esta página");
            window.location.href = "login.html";
        }, 1000);
        return false;
    }
    
    if (usuario.ESTADO !== "ACTIVO") {
        console.log("⚠️ Usuario inactivo, cerrando sesión...");
        localStorage.removeItem("usuarioLogueado");
        window.location.replace("login.html");
        return false;
    }
    
    setTimeout(() => {
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (mainContent) mainContent.classList.remove('hidden');
        
        const nombreUsuario = document.getElementById('nombreUsuario');
        const rolUsuario = document.getElementById('rolUsuario');
        
        if (nombreUsuario) {
            nombreUsuario.textContent = usuario["NOMBRE COMPLETO"] || usuario["NOMBRE"] || "Usuario";
        }
        
        if (rolUsuario) {
            rolUsuario.textContent = usuario.ROL === "CLIENTE" ? "Cliente" : 
                                   usuario.ROL === "ADMIN" ? "Administrador" : 
                                   usuario.ROL === "OPERADOR" ? "Operador Logístico" : 
                                   "Usuario";
        }
        
        const correoRemitente = document.getElementById('correoRemitente');
        const usuarioIdField = document.getElementById('usuarioId');
        
        if (usuario) {
            if (correoRemitente) {
                correoRemitente.value = usuario["CORREO ELECTRONICO"] || usuario["CORREO"] || "";
            }
            
            if (usuarioIdField) {
                usuarioIdField.value = usuario["USUARIO"] || usuario["ID"] || "";
            }
        }
        
        configurarCamposSegunRol(usuario);
        configurarTemporizadorInactividad();
        
    }, 1000);
    
    return true;
}

function configurarCamposSegunRol(usuario) {
    if (usuario.ROL === "CLIENTE") {
        // Código para clientes...
        const remitente = document.getElementById('remitente');
        const direccionRemitente = document.getElementById('direccionRemitente');
        const telefonoRemitente = document.getElementById('telefonoRemitente');
        
        if (remitente) {
            remitente.value = usuario["NOMBRE REMITENTE"] || usuario["NOMBRE COMPLETO"] || "";
            remitente.setAttribute('readonly', true);
            remitente.classList.add('cliente-readonly');
        }
        
        if (direccionRemitente) {
            direccionRemitente.value = usuario["DIRECCION REMITENTE"] || "";
            direccionRemitente.setAttribute('readonly', true);
            direccionRemitente.classList.add('cliente-readonly');
        }
        
        if (telefonoRemitente) {
            telefonoRemitente.value = usuario["TELEFONO REMITENTE"] || usuario["TELEFONO"] || "";
            telefonoRemitente.setAttribute('readonly', true);
            telefonoRemitente.classList.add('cliente-readonly');
        }
        
    } else {
        const remitente = document.getElementById('remitente');
        const iconRemitente = document.getElementById('iconRemitente');
        
        if (remitente) {
            remitente.removeAttribute('readonly');
            remitente.classList.remove('cliente-readonly');
            remitente.placeholder = "Ej. Distribuidora Central S.A.";
            if (iconRemitente) iconRemitente.textContent = 'search';
            
            setTimeout(() => {
                if (remitentesData && remitentesData.length > 0) {
                    console.log(`🎯 Inicializando autocomplete con ${remitentesData.length} REMITENTES`);
                    inicializarAutocompleteRemitente();
                } else {
                    console.log("🔄 Remitentes no cargados, cargando ahora...");
                    loadRemitentesData().then(() => {
                        if (remitentesData.length > 0) {
                            inicializarAutocompleteRemitente();
                        }
                    });
                }
            }, 1000);
        }
    }
}

function configurarTemporizadorInactividad() {
    let tiempoInactividad = 30 * 60 * 1000;
    
    function reiniciarTemporizador() {
        if (window.tiempoInactivo) {
            clearTimeout(window.tiempoInactivo);
        }
        
        window.tiempoInactivo = setTimeout(() => {
            alert("Sesión expirada por inactividad");
            localStorage.removeItem("usuarioLogueado");
            window.location.replace("login.html");
        }, tiempoInactividad);
    }
    
    ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evento => {
        document.addEventListener(evento, reiniciarTemporizador);
    });
    
    reiniciarTemporizador();
}

// ============================================
// FUNCIONES PARA AUTOCOMPLETE DE BARRIOS (IGUAL)
// ============================================

function handleBarrioInput() {
    const searchText = this.value.trim();
    console.log(`🔍 Buscando barrio: "${searchText}"`);
    
    if (searchText === '') {
        if (barrioIdInput) barrioIdInput.value = '';
        hideDropdown();
        return;
    }
    
    if (searchText.length >= 1) {
        filteredBarrios = filterBarrios(searchText);
        console.log(`✅ ${filteredBarrios.length} resultados`);
        
        if (filteredBarrios.length > 0) {
            showAutocomplete(filteredBarrios);
        } else {
            showAutocomplete([]);
        }
    } else {
        hideDropdown();
        currentFocus = -1;
    }
}

function filterBarrios(searchText) {
    const datos = window.barriosData || barriosData || [];
    if (!datos.length) return [];
    
    const searchUpper = searchText.toUpperCase();
    return datos.filter(barrio => 
        barrio.nombre && barrio.nombre.toUpperCase().includes(searchUpper) ||
        (barrio.id && barrio.id.toUpperCase().includes(searchUpper))
    ).slice(0, 10);
}

function handleBarrioKeydown(e) {
    if (!autocompleteDropdown || window.getComputedStyle(autocompleteDropdown).display !== 'block') return;
    
    const items = autocompleteDropdown.querySelectorAll('.autocomplete-item');
    
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveFocus('down', items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveFocus('up', items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[currentFocus]) {
            dropdownJustClicked = true;
            const clickEvent = new MouseEvent('click', { bubbles: true });
            items[currentFocus].dispatchEvent(clickEvent);
            setTimeout(() => { dropdownJustClicked = false; }, 100);
        }
    } else if (e.key === 'Escape') {
        hideDropdown();
        if (barrioInput) barrioInput.focus();
    }
}

function handleBarrioFocus() {
    console.log('🎯 Campo barrio enfocado');
    const searchText = barrioInput.value.trim();
    
    if (searchText.length >= 1) {
        filteredBarrios = filterBarrios(searchText);
        showAutocomplete(filteredBarrios);
    }
}

function showAutocomplete(results) {
    if (!autocompleteDropdown || !barrioInput) return;
    
    console.log(`🎯 Mostrando ${results.length} resultados`);
    
    autocompleteDropdown.innerHTML = '';
    
    if (results.length === 0) {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = 'No se encontraron barrios';
        autocompleteDropdown.appendChild(item);
        
        showDropdown();
    } else {
        results.forEach((barrio, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <span class="barrio-id">${barrio.id || 'N/A'}</span>
                <span class="barrio-nombre">${barrio.nombre || ''}</span>
            `;
            
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropdownJustClicked = true;
                
                setTimeout(() => {
                    console.log(`✅ Seleccionado: ${barrio.nombre}`);
                    barrioInput.value = barrio.nombre || '';
                    if (barrioIdInput) barrioIdInput.value = barrio.id || '';
                    hideDropdown();
                    
                    setTimeout(() => {
                        dropdownJustClicked = false;
                    }, 50);
                    
                    barrioInput.focus();
                }, 10);
            });
            
            autocompleteDropdown.appendChild(item);
        });
        
        showDropdown();
    }
}

function showDropdown() {
    if (!autocompleteDropdown) return;
    
    if (closeBarrioDropdownTimeout) {
        clearTimeout(closeBarrioDropdownTimeout);
        closeBarrioDropdownTimeout = null;
    }
    
    autocompleteDropdown.className = '';
    autocompleteDropdown.classList.add('autocomplete-dropdown-visible');
    
    const aggressiveStyles = `
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: absolute !important;
        top: calc(100% + 5px) !important;
        left: 0 !important;
        width: 100% !important;
        z-index: 999999 !important;
        background-color: white !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1) !important;
        max-height: 300px !important;
        overflow-y: auto !important;
        margin-top: 5px !important;
        padding: 5px !important;
    `;
    
    autocompleteDropdown.style.cssText = aggressiveStyles;
    
    console.log('✅ Dropdown visible - Estilos agresivos aplicados');
}

function hideDropdown() {
    if (!autocompleteDropdown) return;
    
    const estilo = window.getComputedStyle(autocompleteDropdown);
    const isVisible = estilo.display === 'block' || 
                      autocompleteDropdown.style.display === 'block';
    
    if (isVisible) {
        console.log('✅ Cerrando dropdown (autorizado)');
        autocompleteDropdown.style.display = 'none';
        currentFocus = -1;
    }
}

function moveFocus(direction, items) {
    if (!items.length) return;
    
    items.forEach(item => item.classList.remove('highlighted'));
    
    if (direction === 'down') currentFocus = (currentFocus + 1) % items.length;
    else if (direction === 'up') currentFocus = (currentFocus - 1 + items.length) % items.length;
    
    if (items[currentFocus]) {
        items[currentFocus].classList.add('highlighted');
        items[currentFocus].scrollIntoView({ block: 'nearest' });
    }
}

// ============================================
// FUNCIONES PARA AUTOCOMPLETE DE REMITENTES (CORREGIDO)
// ============================================

function inicializarAutocompleteRemitente() {
    console.log("🔧 ===== INICIALIZANDO AUTOCOMPLETE REMITENTES =====");
    
    const inputRemitente = document.getElementById('remitente');
    let dropdown = document.getElementById('remitenteAutocomplete');
    
    if (!inputRemitente) {
        console.error("❌ No se encontró el campo remitente");
        return;
    }
    
    if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.id = 'remitenteAutocomplete';
        dropdown.className = 'autocomplete-dropdown';
        dropdown.style.cssText = `
            display: none;
            position: absolute;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            max-height: 300px;
            overflow-y: auto;
            z-index: 9999;
            width: 100%;
        `;
        document.body.appendChild(dropdown);
        console.log("✅ Dropdown creado dinámicamente");
    }
    
    // Verificar que tenemos datos de remitentes
    if (!remitentesData || remitentesData.length === 0) {
        console.warn("⚠️ No hay remitentes disponibles para autocomplete");
        console.log("🔄 Cargando remitentes...");
        loadRemitentesData().then(() => {
            if (remitentesData.length > 0) {
                console.log(`✅ ${remitentesData.length} remitentes cargados, reinicializando autocomplete`);
                setTimeout(() => inicializarAutocompleteRemitente(), 500);
            }
        });
        return;
    }
    
    console.log(`📊 Usando ${remitentesData.length} REMITENTES REALES para autocomplete`);
    
    let ignoreBlur = false;
    let mouseInDropdown = false;
    
    function buscarRemitentes(texto) {
        if (!texto || texto.length < 1) return [];
        
        const busqueda = texto.toLowerCase().trim();
        
        // CORREGIDO: Filtrar usando los campos REALES que tienes en tu JSON
        return remitentesData.filter(remitente => {
            // Campos que realmente tienes en tu JSON
            const nombre = (remitente["NOMBRE REMITENTE"] || "").toString().toLowerCase();
            const telefono = (remitente["TELEFONO REMITENTE"] || "").toString().toLowerCase();
            const direccion = (remitente["DIRECCION REMITENTE"] || "").toString().toLowerCase();
            
            // Buscar en nombre Y teléfono
            return nombre.includes(busqueda) || 
                   telefono.includes(busqueda) ||
                   direccion.includes(busqueda);
        });
    }
    
    function mostrarSugerencias(remitentes) {
        dropdown.innerHTML = '';
        
        if (remitentes.length === 0) {
            dropdown.style.display = 'none';
            return;
        }
        
        console.log(`📋 Mostrando ${remitentes.length} sugerencias de REMITENTES`);
        
        const remitentesMostrar = remitentes.slice(0, 5);
        
        remitentesMostrar.forEach((remitente, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.dataset.index = index;
            item.style.cssText = `
                padding: 12px 15px;
                cursor: pointer;
                border-bottom: 1px solid #f3f4f6;
                transition: all 0.2s;
                position: relative;
            `;
            
            const telefono = remitente["TELEFONO REMITENTE"] || "";
            const direccion = remitente["DIRECCION REMITENTE"] || "";
            const cantidad = remitente["CANTIDAD ENVIOS"] || 0;
            
            item.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <div style="flex-grow: 1;">
                        <div style="font-size: 14px; color: #111827; font-weight: 600; margin-bottom: 4px;">
                            ${remitente["NOMBRE REMITENTE"] || "Sin nombre"}
                        </div>
                        <div style="font-size: 12px; color: #6b7280;">
                            <div>📞 ${telefono || "Sin teléfono"}</div>
                            ${direccion ? `<div>📍 ${direccion.substring(0, 40)}...</div>` : ''}
                            <div style="margin-top: 4px;">
                                <span style="background: #f3f4f6; padding: 2px 6px; border-radius: 12px; font-size: 11px;">
                                    ${cantidad} envío${cantidad !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div style="color: #10b981; font-size: 12px; font-weight: bold; padding: 4px 8px; background: #d1fae5; border-radius: 4px;">
                        SELECCIONAR
                    </div>
                </div>
            `;
            
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log("🖱️ CLIC detectado en item (mousedown) - REMITENTE");
                
                ignoreBlur = true;
                
                setTimeout(() => {
                    console.log("🎯 Procesando selección de REMITENTE...");
                    
                    // Asignar valores a los campos del formulario
                    document.getElementById('remitente').value = remitente["NOMBRE REMITENTE"] || "";
                    document.getElementById('telefonoRemitente').value = telefono;
                    document.getElementById('direccionRemitente').value = direccion;
                    
                    // Disparar eventos para que se actualice la UI
                    ['remitente', 'telefonoRemitente', 'direccionRemitente'].forEach(id => {
                        const campo = document.getElementById(id);
                        if (campo) {
                            campo.dispatchEvent(new Event('input', { bubbles: true }));
                            campo.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                    
                    console.log("✅ VALORES ASIGNADOS DE REMITENTE:");
                    console.log("   Remitente:", document.getElementById('remitente').value);
                    console.log("   Teléfono:", document.getElementById('telefonoRemitente').value);
                    console.log("   Dirección:", document.getElementById('direccionRemitente').value);
                    
                    // Ocultar dropdown
                    dropdown.style.display = 'none';
                    dropdown.innerHTML = '';
                    
                    // Mover foco al siguiente campo
                    setTimeout(() => {
                        const siguienteCampo = document.getElementById('destinatario');
                        if (siguienteCampo) {
                            siguienteCampo.focus();
                        }
                    }, 100);
                    
                    // Permitir blur después de un momento
                    setTimeout(() => {
                        ignoreBlur = false;
                    }, 300);
                }, 10);
            });
            
            // Efectos hover
            item.addEventListener('mouseenter', function() {
                this.style.backgroundColor = '#eff6ff';
                this.style.transform = 'translateX(2px)';
                mouseInDropdown = true;
            });
            
            item.addEventListener('mouseleave', function() {
                this.style.backgroundColor = '';
                this.style.transform = '';
                mouseInDropdown = false;
            });
            
            dropdown.appendChild(item);
        });
        
        // Posicionar dropdown debajo del input
        const inputRect = inputRemitente.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${inputRect.bottom + window.scrollY}px`;
        dropdown.style.left = `${inputRect.left + window.scrollX}px`;
        dropdown.style.width = `${inputRect.width}px`;
        dropdown.style.display = 'block';
        
        dropdown.addEventListener('mouseenter', () => {
            mouseInDropdown = true;
        });
        
        dropdown.addEventListener('mouseleave', () => {
            mouseInDropdown = false;
        });
    }
    
    let timeoutId;
    
    // Evento cuando el usuario escribe
    inputRemitente.addEventListener('input', function(e) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            const resultados = buscarRemitentes(this.value);
            mostrarSugerencias(resultados);
        }, 300);
    });
    
    // Evento cuando el campo recibe foco
    inputRemitente.addEventListener('focus', function() {
        console.log("🎯 Campo remitente enfocado");
        
        if (this.value.length >= 1) {
            const resultados = buscarRemitentes(this.value);
            mostrarSugerencias(resultados);
        } else {
            // Si está vacío, mostrar primeros 3 remitentes
            mostrarSugerencias(remitentesData.slice(0, 3));
        }
    });
    
    // Evento cuando pierde foco
    inputRemitente.addEventListener('blur', function(e) {
        setTimeout(() => {
            if (!ignoreBlur && !mouseInDropdown) {
                dropdown.style.display = 'none';
            }
        }, 200);
    });
    
    dropdown.addEventListener('mousedown', function(e) {
        console.log("🖱️ Mouse down en dropdown - previniendo blur");
        ignoreBlur = true;
        e.stopPropagation();
    });
    
    // Manejar clicks fuera del dropdown
    document.addEventListener('mousedown', function(e) {
        const clickEnInput = inputRemitente.contains(e.target);
        const clickEnDropdown = dropdown.contains(e.target);
        
        if (!clickEnInput && !clickEnDropdown) {
            setTimeout(() => {
                if (!mouseInDropdown) {
                    dropdown.style.display = 'none';
                }
            }, 100);
        }
    });
    
    // Manejar teclas especiales
    inputRemitente.addEventListener('keydown', function(e) {
        const items = dropdown.querySelectorAll('.autocomplete-item');
        
        if (items.length === 0) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (items[0]) {
                items[0].style.backgroundColor = '#eff6ff';
            }
        }
        
        if (e.key === 'Enter' && dropdown.style.display === 'block') {
            e.preventDefault();
            if (items[0]) {
                items[0].click();
            }
        }
        
        if (e.key === 'Escape') {
            dropdown.style.display = 'none';
        }
    });
    
    console.log("✅ Auto-complete de REMITENTES inicializado - ¡LISTO PARA PROBAR!");
}

// ============================================
// FUNCIONES PARA EL FORMULARIO (IGUAL)
// ============================================

function inicializarFormulario() {
    console.log("📝 Inicializando formulario...");
    
    const paymentOptions = document.querySelectorAll('.payment-option');
    const formaPagoInput = document.getElementById('formaPago');
    
    paymentOptions.forEach(option => {
        option.addEventListener('click', function() {
            paymentOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            
            const selectedValue = this.getAttribute('data-value');
            formaPagoInput.value = selectedValue;
            
            actualizarResumen();
            manejarValorRecaudar(selectedValue);
        });
    });

    if (paymentOptions[0]) {
        paymentOptions[0].click();
    }
    
    document.getElementById('cancelButton').addEventListener('click', function() {
        if (confirm('¿Estás seguro de que deseas cancelar este envío? Se perderán todos los datos ingresados.')) {
            resetearFormulario();
        }
    });
    
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', function() {
            if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
                localStorage.removeItem("usuarioLogueado");
                window.location.href = "login.html";
            }
        });
    }
    
    const historialButton = document.getElementById('historialButton');
    if (historialButton) {
        historialButton.addEventListener('click', function() {
            const user = JSON.parse(localStorage.getItem("usuarioLogueado"));
            if (user && user.USUARIO) {
                window.open(`historial.html?usuario=${encodeURIComponent(user.USUARIO)}`, '_blank');
            } else {
                alert('No se pudo identificar el usuario');
            }
        });
    }
    
    document.getElementById('deliveryForm').addEventListener('submit', manejarEnvioFormulario);
    
    console.log("✅ Formulario inicializado correctamente");
}

function manejarValorRecaudar(formaPago) {
    const valorRecaudarInput = document.getElementById('valorRecaudar');
    const valorRecaudarHelp = document.getElementById('valorRecaudarHelp');
    const autoRecaudoLabel = document.getElementById('autoRecaudoLabel');
    const ciudadDestino = document.getElementById('ciudadDestino').value;
    
    if (formaPago === 'contraentrega' || formaPago === 'contraentrega_recaudo') {
        valorRecaudarInput.disabled = false;
        valorRecaudarInput.placeholder = "Ej. 50,000";
        valorRecaudarHelp.textContent = "Ingrese el valor a recaudar al destinatario";
        
        if (formaPago === 'contraentrega') {
            let valorAuto = 0;
            if (ciudadDestino.includes("Bogotá")) {
                valorAuto = 10000;
            } else if (ciudadDestino.includes("Soacha")) {
                valorAuto = 12000;
            }
            
            valorRecaudarInput.value = valorAuto;
            valorRecaudarInput.disabled = true;
            autoRecaudoLabel.classList.remove('hidden');
            autoRecaudoLabel.textContent = 'AUTO';
            valorRecaudarHelp.textContent = `Valor automático para ${ciudadDestino}`;
            
            valorRecaudarInput.classList.remove('bg-input-light', 'dark:bg-input-dark');
            valorRecaudarInput.classList.add('bg-gray-100', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
        } else {
            valorRecaudarInput.value = "";
            autoRecaudoLabel.classList.add('hidden');
            valorRecaudarHelp.textContent = "Ingrese el valor a recaudar al destinatario";
            
            valorRecaudarInput.classList.remove('bg-gray-100', 'dark:bg-gray-800');
            valorRecaudarInput.classList.add('bg-input-light', 'dark:bg-input-dark', 'text-[#0d121b]', 'dark:text-white');
        }
        
        valorRecaudarInput.addEventListener('input', function() {
            const valor = parseFloat(this.value) || 0;
            if (valor > 0) {
                this.classList.remove('invalid');
            } else {
                this.classList.add('invalid');
            }
            actualizarResumen();
        });
        
    } else if (formaPago === 'contado') {
        valorRecaudarInput.disabled = true;
        valorRecaudarInput.value = "";
        valorRecaudarHelp.textContent = "No aplica para pagos de contado";
        autoRecaudoLabel.classList.add('hidden');
        
        valorRecaudarInput.classList.remove('bg-input-light', 'dark:bg-input-dark', 'text-[#0d121b]', 'dark:text-white');
        valorRecaudarInput.classList.add('bg-gray-100', 'dark:bg-gray-800', 'text-gray-500', 'dark:text-gray-400');
        
        valorRecaudarInput.classList.remove('invalid');
    }
    
    actualizarResumen();
}

function calcularValorARecaudar() {
    const ciudadDestino = document.getElementById('ciudadDestino').value;
    let valorRecaudar = 0;
    
    if (ciudadDestino.includes("Bogotá")) {
        valorRecaudar = 10000;
    } else if (ciudadDestino.includes("Soacha")) {
        valorRecaudar = 12000;
    }
    
    const valorRecaudarInput = document.getElementById('valorRecaudar');
    const formaPago = document.getElementById('formaPago').value;
    
    if (formaPago === 'contraentrega' || formaPago === 'contraentrega_recaudo') {
        valorRecaudarInput.value = valorRecaudar;
        valorRecaudarInput.classList.remove('invalid');
    }
    
    return valorRecaudar;
}

function calcularTotalAPagar() {
    const formaPago = document.getElementById('formaPago').value;
    const valorRecaudar = parseFloat(document.getElementById('valorRecaudar').value) || 0;
    const ciudadDestino = document.getElementById('ciudadDestino').value;
    let totalAPagar = 0;
    
    if (formaPago === 'contraentrega_recaudo') {
        if (ciudadDestino.includes("Bogotá")) {
            totalAPagar = Math.max(0, valorRecaudar - 10000);
        } else if (ciudadDestino.includes("Soacha")) {
            totalAPagar = Math.max(0, valorRecaudar - 12000);
        }
    }
    
    return totalAPagar;
}

// ============================================
// CONFIGURACIÓN DE EVENT LISTENERS (IGUAL)
// ============================================

function setupEventListeners() {
    console.log('🔗 Configurando event listeners...');
    
    const ciudadDestinoSelect = document.getElementById('ciudadDestino');
    if (ciudadDestinoSelect) {
        ciudadDestinoSelect.addEventListener('change', function() {
            const ciudad = this.value;
            const formaPago = document.getElementById('formaPago').value;
            
            if (formaPago === 'contraentrega') {
                let valorAuto = 0;
                if (ciudad.includes("Bogotá")) {
                    valorAuto = 10000;
                } else if (ciudad.includes("Soacha")) {
                    valorAuto = 12000;
                }
                
                document.getElementById('valorRecaudar').value = valorAuto;
            }
            
            const valorRecaudar = calcularValorARecaudar();
            actualizarResumen();
        });
    }
    
    if (paymentOptions.length) {
        paymentOptions.forEach(option => {
            option.addEventListener('click', function() {
                updatePaymentUI(this.getAttribute('data-value'));
            });
        });
    }
    
    if (barrioInput) {
        barrioInput.addEventListener('input', handleBarrioInput);
        barrioInput.addEventListener('keydown', handleBarrioKeydown);
        barrioInput.addEventListener('focus', handleBarrioFocus);
        
        barrioInput.addEventListener('click', function(e) {
            e.stopPropagation();
            const searchText = this.value.trim();
            
            if (searchText.length >= 2) {
                setTimeout(() => {
                    handleBarrioInput.call(this);
                }, 50);
            }
        });
    }
    
    if (valorRecaudarInput) {
        valorRecaudarInput.addEventListener('input', updateSummary);
    }
    
    setupDropdownCloseBehavior();
    
    const form = document.getElementById('deliveryForm');
    if (form) form.addEventListener('submit', manejarEnvioFormulario);
    
    const cancelBtn = document.getElementById('cancelButton');
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    
    console.log('✅ Listeners configurados');
}

function setupDropdownCloseBehavior() {
    console.log('🔧 Configurando comportamiento del dropdown...');
    
    let escribiendo = false;
    let dropdownJustClicked = false;
    let ignoreBlur = false;
    
    document.addEventListener('mousedown', function(e) {
        if (!autocompleteDropdown || !autocompleteDropdown.contains(e.target)) {
            return;
        }
        
        console.log('🎯 Click en dropdown - previniendo cierre');
        dropdownJustClicked = true;
        ignoreBlur = true;
        
        setTimeout(() => {
            dropdownJustClicked = false;
            ignoreBlur = false;
        }, 300);
    });
    
    document.addEventListener('click', function(e) {
        if (!autocompleteDropdown || !barrioInput) return;
        
        if (dropdownJustClicked || escribiendo) {
            console.log('⏸️ No cerrar - usuario interactuando');
            return;
        }
        
        const clickedInput = barrioInput.contains(e.target);
        const clickedDropdown = autocompleteDropdown.contains(e.target);
        
        const isVisible = autocompleteDropdown.style.display === 'block' || 
                         window.getComputedStyle(autocompleteDropdown).display === 'block';
        
        if (isVisible && !clickedInput && !clickedDropdown) {
            console.log('👆 Click fuera - cerrando dropdown');
            hideDropdown();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const isVisible = autocompleteDropdown && 
                (autocompleteDropdown.style.display === 'block' || 
                 window.getComputedStyle(autocompleteDropdown).display === 'block');
            
            if (isVisible) {
                console.log('⎋ Escape - cerrando dropdown');
                hideDropdown();
                if (barrioInput) barrioInput.focus();
            }
        }
    });
    
    if (barrioInput) {
        barrioInput.addEventListener('input', function() {
            escribiendo = true;
            ignoreBlur = true;
            
            console.log('📝 Escribiendo - manteniendo dropdown visible');
            
            clearTimeout(this._writingTimeout);
            this._writingTimeout = setTimeout(() => {
                escribiendo = false;
                ignoreBlur = false;
                console.log('⏹️ Terminó de escribir');
            }, 500);
        });
        
        barrioInput.addEventListener('blur', function() {
            console.log('⚠️ Blur detectado - escribiendo:', escribiendo, '- ignoreBlur:', ignoreBlur);
            
            if (escribiendo || ignoreBlur || dropdownJustClicked) {
                console.log('🚫 Ignorando blur - recuperando foco');
                
                setTimeout(() => {
                    if (barrioInput) {
                        barrioInput.focus();
                        const len = barrioInput.value.length;
                        barrioInput.setSelectionRange(len, len);
                    }
                }, 10);
                
                return;
            }
            
            setTimeout(() => {
                if (!dropdownJustClicked && !escribiendo) {
                    const isVisible = autocompleteDropdown && 
                        (autocompleteDropdown.style.display === 'block' || 
                         window.getComputedStyle(autocompleteDropdown).display === 'block');
                    
                    if (isVisible) {
                        const activeElement = document.activeElement;
                        const focusInDropdown = activeElement && 
                            autocompleteDropdown.contains(activeElement);
                        
                        if (!focusInDropdown) {
                            console.log('🔒 Cerrando dropdown (blur normal)');
                            hideDropdown();
                        }
                    }
                }
            }, 150);
        });
        
        barrioInput.addEventListener('focus', function() {
            console.log('🎯 Campo enfocado');
            const searchText = this.value.trim();
            
            if (searchText.length >= 1) {
                setTimeout(() => {
                    handleBarrioInput.call(this);
                }, 50);
            }
        });
    }
    
    console.log('✅ Comportamiento mejorado configurado');
}

// ============================================
// FUNCIONES DE UI (IGUAL)
// ============================================

function initializeUI() {
    const ciudadOrigenField = document.getElementById('ciudadOrigen');
    if (ciudadOrigenField) {
        ciudadOrigenField.value = 'Bogotá D.C.';
    }
    
    updatePaymentUI('contado');
    inicializarFormulario();
}

function updatePaymentUI(selectedPayment) {
    console.log(`💳 Forma de pago: ${selectedPayment}`);
    
    if (formaPagoInput) formaPagoInput.value = selectedPayment;
    
    paymentOptions.forEach(option => {
        const isSelected = option.getAttribute('data-value') === selectedPayment;
        option.classList.toggle('selected', isSelected);
        option.classList.toggle('border-primary', isSelected);
    });
    
    if (valorRecaudarInput) {
        switch(selectedPayment) {
            case 'contado':
                valorRecaudarInput.disabled = true;
                valorRecaudarInput.value = '';
                if (autoRecaudoLabel) autoRecaudoLabel.classList.add('hidden');
                break;
            case 'contraentrega':
                valorRecaudarInput.disabled = true;
                valorRecaudarInput.value = '10000';
                if (autoRecaudoLabel) {
                    autoRecaudoLabel.classList.remove('hidden');
                    autoRecaudoLabel.textContent = 'FIJO';
                }
                break;
            case 'contraentrega_recaudo':
                valorRecaudarInput.disabled = false;
                valorRecaudarInput.value = '';
                if (autoRecaudoLabel) autoRecaudoLabel.classList.add('hidden');
                break;
        }
    }
    
    updateSummary();
}

function updateSummary() {
    if (!resumenFormaPago || !resumenValorRecaudar || !resumenEstado || !formaPagoInput) return;
    
    const formasPago = {
        'contado': 'Contado',
        'contraentrega': 'Contraentrega',
        'contraentrega_recaudo': 'Contraentrega con Recaudo'
    };
    
    resumenFormaPago.textContent = formasPago[formaPagoInput.value] || 'Contado';
    
    if (formaPagoInput.value === 'contraentrega') {
        resumenValorRecaudar.textContent = '$10,000';
        resumenEstado.textContent = 'Recaudo fijo';
        resumenEstado.className = 'font-semibold text-blue-600';
    } else if (formaPagoInput.value === 'contraentrega_recaudo') {
        const valor = valorRecaudarInput && valorRecaudarInput.value ? 
            `$${parseInt(valorRecaudarInput.value).toLocaleString()}` : '$0';
        resumenValorRecaudar.textContent = valor;
        resumenEstado.textContent = valorRecaudarInput.value ? 'Recaudo variable' : 'Sin valor';
        resumenEstado.className = 'font-semibold text-orange-600';
    } else {
        resumenValorRecaudar.textContent = '$0';
        resumenEstado.textContent = 'Por confirmar';
        resumenEstado.className = 'font-semibold text-green-600';
    }
}

function actualizarResumen() {
    const formaPago = document.getElementById('formaPago').value;
    const ciudadDestino = document.getElementById('ciudadDestino').value;
    const valorRecaudar = document.getElementById('valorRecaudar').value;
    
    const formasPagoTexto = {
        'contado': 'Contado',
        'contraentrega': 'Contraentrega',
        'contraentrega_recaudo': 'Con Recaudo'
    };
    document.getElementById('resumenFormaPago').textContent = formasPagoTexto[formaPago];
    
    let valorRecaudarTexto = 'No aplica';
    if (formaPago !== 'contado' && valorRecaudar) {
        const valorFormateado = new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(parseFloat(valorRecaudar));
        valorRecaudarTexto = valorFormateado;
    }
    document.getElementById('resumenValorRecaudar').textContent = valorRecaudarTexto;
    
    const totalAPagar = calcularTotalAPagar();
    let totalTexto = 'No aplica';
    let estadoTexto = 'Por confirmar';
    let estadoColor = 'text-yellow-600 dark:text-yellow-400';
    
    if (ciudadDestino) {
        let tarifaCiudad = 0;
        if (ciudadDestino.includes("Bogotá")) {
            tarifaCiudad = 10000;
        } else if (ciudadDestino.includes("Soacha")) {
            tarifaCiudad = 12000;
        }
        
        if (formaPago === 'contado') {
            estadoTexto = 'Pendiente de pago';
            estadoColor = 'text-yellow-600 dark:text-yellow-400';
            totalTexto = '$0';
        } else if (formaPago === 'contraentrega') {
            estadoTexto = 'A recaudar';
            estadoColor = 'text-blue-600 dark:text-blue-400';
            totalTexto = '$0';
        } else if (formaPago === 'contraentrega_recaudo') {
            estadoTexto = 'Con recaudo';
            estadoColor = 'text-orange-600 dark:text-orange-400';
            const totalFormateado = new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
            }).format(totalAPagar);
            totalTexto = totalFormateado;
        }
    }
    
    let estadoElement = document.getElementById('resumenEstado');
    if (!estadoElement) {
        estadoElement = document.createElement('span');
        estadoElement.id = 'resumenEstado';
        estadoElement.className = 'font-semibold';
        const resumenContainer = document.querySelector('.bg-blue-50');
        if (resumenContainer) {
            const estadoDiv = resumenContainer.querySelector('div:last-child');
            if (estadoDiv) {
                estadoDiv.innerHTML = '<span class="text-sm text-gray-600 dark:text-gray-400">Estado:</span><br>';
                estadoDiv.appendChild(estadoElement);
            }
        }
    }
    
    estadoElement.textContent = estadoTexto;
    estadoElement.className = `font-semibold ${estadoColor}`;
    
    let totalElement = document.getElementById('resumenTotalPagar');
    if (!totalElement) {
        totalElement = document.createElement('span');
        totalElement.id = 'resumenTotalPagar';
        totalElement.className = 'font-bold text-lg text-green-600 dark:text-green-400';
        const resumenGrid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-3.gap-4');
        if (resumenGrid) {
            const totalDiv = document.createElement('div');
            totalDiv.className = 'flex flex-col';
            totalDiv.innerHTML = '<span class="text-sm text-gray-600 dark:text-gray-400">Total a Pagar al Cliente:</span>';
            totalDiv.appendChild(totalElement);
            resumenGrid.appendChild(totalDiv);
        }
    }
    
    totalElement.textContent = totalTexto;
}

// ============================================
// FUNCIÓN PARA MANEJAR EL ENVÍO DEL FORMULARIO (IGUAL)
// ============================================

async function manejarEnvioFormulario(e) {
    e.preventDefault();
    
    if (formularioEnviandose) {
        console.log('⚠️ Formulario ya enviándose, ignorando clic...');
        return;
    }
    
    console.log('📤 Iniciando envío de formulario...');
    
    if (!validarFormulario()) {
        alert('Por favor complete todos los campos requeridos correctamente');
        return;
    }
    
    const submitButton = document.getElementById('submitButton');
    const submitText = document.getElementById('submitText');
    const submitIcon = document.getElementById('submitIcon');
    
    submitButton.disabled = true;
    formularioEnviandose = true;
    submitButton.classList.add('opacity-70', 'cursor-not-allowed');
    submitText.textContent = 'Procesando...';
    submitIcon.textContent = 'hourglass_top';
    
    try {
        const formaPago = document.getElementById('formaPago').value;
        const ciudadDestino = document.getElementById('ciudadDestino').value;
        
        let valorRecaudar;
        
        if (formaPago === 'contraentrega') {
            if (ciudadDestino.includes("Bogotá")) {
                valorRecaudar = 10000;
            } else if (ciudadDestino.includes("Soacha")) {
                valorRecaudar = 12000;
            }
            document.getElementById('valorRecaudar').value = valorRecaudar;
        } else if (formaPago === 'contraentrega_recaudo') {
            valorRecaudar = parseFloat(document.getElementById('valorRecaudar').value) || 0;
        } else {
            valorRecaudar = 0;
        }
        
        const totalAPagar = calcularTotalAPagar();
        const usuarioActual = JSON.parse(localStorage.getItem("usuarioLogueado"));
        
        const idLocal = generarIDLocal();
        console.log("🆔 ID ÚNICO generado para TODO:", idLocal);
        
        const direccionDestino = document.getElementById('direccionDestino').value;

        let latitud = "";
        let longitud = "";

        if (window.ultimaDireccionSeleccionada) {
            latitud = window.ultimaDireccionSeleccionada.latitud.toString();
            longitud = window.ultimaDireccionSeleccionada.longitud.toString();
            
            console.log("📍 Coordenadas obtenidas:", latitud, longitud);
        } else {
            console.warn("⚠️ No hay coordenadas disponibles");
        }

        const direccionCodificada = encodeURIComponent(direccionDestino.trim());
        const urlGoogleMaps = `https://www.google.com/maps/search/?api=1&query=${direccionCodificada}`;

        console.log('📍 URL Google Maps generada:', urlGoogleMaps);
        console.log('📍 Coordenadas para hoja:', `${latitud}, ${longitud}`);
        
        const datosEnvio = {
            "ENVIO ID": idLocal,
            "FORMA DE PAGO": formaPago,
            "REMITE": document.getElementById('remitente').value,
            "TELEFONO": document.getElementById('telefonoRemitente').value,
            "DIRECCION": document.getElementById('direccionRemitente').value,
            "CIUDAD": document.getElementById('ciudadOrigen').value,
            "DESTINO": document.getElementById('destinatario').value,
            "DIRECCION DESTINO": direccionDestino,
            "BARRIO": document.getElementById('barrioLocalidad').value,
            "TELEFONOCLIENTE": document.getElementById('telefonoCliente').value,
            "COMPLEMENTO DE DIR": document.getElementById('complementoDireccion').value || "",
            "CIUDAD DESTINO": ciudadDestino,
            "VALOR A RECAUDAR": valorRecaudar.toString(),
            "TOTAL A PAGAR": totalAPagar.toString(),
            "PAGADO A REMITENTE": "false",
            "FECHA PAGO": "",
            "FIRMA": "",
            "OBS": "",
            "LOCALIDAD": "",
            "MENSAJERO": "",
            "CORREO REMITENTE": document.getElementById('correoRemitente').value || "",
            "USUARIO ID": usuarioActual ? usuarioActual.USUARIO : "",
            "URL DIRECCION MAPS": urlGoogleMaps,
            "COORDENADAS": `${latitud}, ${longitud}`,
        };
        
        console.log('📝 Datos a enviar a Google Sheets (con URL de Maps):', datosEnvio);
        
        const camposRequeridos = [
            "ENVIO ID", "FORMA DE PAGO", "REMITE", "TELEFONO", "DIRECCION", 
            "CIUDAD", "DESTINO", "DIRECCION DESTINO", "BARRIO",
            "TELEFONOCLIENTE", "CIUDAD DESTINO", "VALOR A RECAUDAR",
            "TOTAL A PAGAR", "PAGADO A REMITENTE", "USUARIO ID"
        ];
        
        let faltanCampos = [];
        camposRequeridos.forEach(campo => {
            if (!datosEnvio[campo] && datosEnvio[campo] !== "") {
                faltanCampos.push(campo);
            }
        });
        
        if (faltanCampos.length > 0) {
            console.error('❌ Campos faltantes:', faltanCampos);
            throw new Error(`Campos faltantes: ${faltanCampos.join(', ')}`);
        }
        
        const confirmMessage = `¿Confirmar registro de envío?\n\n📍 Destino: ${datosEnvio["CIUDAD DESTINO"]}\n👤 Cliente: ${datosEnvio["DESTINO"]}\n💰 Valor a recaudar: $${parseInt(datosEnvio["VALOR A RECAUDAR"]).toLocaleString()}`;
        
        if (!confirm(confirmMessage)) {
            submitButton.disabled = false;
            formularioEnviandose = false;
            submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
            submitText.textContent = 'Registrar Envío';
            submitIcon.textContent = 'send';
            return;
        }
        
        console.log('📡 Enviando datos a Google Apps Script...');
        
        try {
            const formData = new FormData();
            
            formData.append("envioId", datosEnvio["ENVIO ID"]);
            formData.append("formaPago", datosEnvio["FORMA DE PAGO"]);
            formData.append("remite", datosEnvio["REMITE"]);
            formData.append("telefono", datosEnvio["TELEFONO"]);
            formData.append("direccion", datosEnvio["DIRECCION"]);
            formData.append("ciudad", datosEnvio["CIUDAD"]);
            formData.append("destino", datosEnvio["DESTINO"]);
            formData.append("direccionDestino", datosEnvio["DIRECCION DESTINO"]);
            formData.append("barrio", datosEnvio["BARRIO"]);
            formData.append("telefonoCliente", datosEnvio["TELEFONOCLIENTE"]);
            formData.append("complementoDir", datosEnvio["COMPLEMENTO DE DIR"]);
            formData.append("ciudadDestino", datosEnvio["CIUDAD DESTINO"]);
            formData.append("valorRecaudar", datosEnvio["VALOR A RECAUDAR"]);
            formData.append("totalAPagar", datosEnvio["TOTAL A PAGAR"]);
            formData.append("pagadoRemitente", datosEnvio["PAGADO A REMITENTE"]);
            formData.append("correoRemitente", datosEnvio["CORREO REMITENTE"]);
            formData.append("usuarioId", datosEnvio["USUARIO ID"]);
            formData.append("urlMaps", datosEnvio["URL DIRECCION MAPS"]);
            formData.append("coordenadas", datosEnvio["COORDENADAS"]);
            
            console.log('📤 Enviando FormData (con ID único):');
            for (let pair of formData.entries()) {
                console.log(`  ${pair[0]}: ${pair[1]}`);
            }
            
            const response = await fetch(WEB_APP_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            });
            
            console.log('📨 Respuesta recibida:', response);
            
            const datosCompletosParaGuia = {
                ...datosEnvio,
                "ENVIO ID": idLocal,
                envioId: idLocal,
                formaPago: datosEnvio["FORMA DE PAGO"],
                remite: datosEnvio["REMITE"],
                telefono: datosEnvio["TELEFONO"],
                ciudad: datosEnvio["CIUDAD"],
                destino: datosEnvio["DESTINO"],
                telefonoCliente: datosEnvio["TELEFONOCLIENTE"],
                direccionDestino: datosEnvio["DIRECCION DESTINO"],
                barrio: datosEnvio["BARRIO"],
                complementoDir: datosEnvio["COMPLEMENTO DE DIR"],
                ciudadDestino: datosEnvio["CIUDAD DESTINO"],
                valorRecaudar: datosEnvio["VALOR A RECAUDAR"],
                totalAPagar: datosEnvio["TOTAL A PAGAR"],
                urlMaps: datosEnvio["URL DIRECCION MAPS"]
            };

            localStorage.setItem('ultimoEnvioCompleto', JSON.stringify(datosCompletosParaGuia));
            
            guardarEnvioEnLocalStorage(datosEnvio);
            
            setTimeout(() => {
                mostrarResultadoExitoso(datosEnvio, idLocal);
            }, 500);
            
            const successMessage = document.createElement('div');
            successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg z-50';
            successMessage.innerHTML = `
                <div class="flex items-center">
                    <span class="material-icons mr-2">check_circle</span>
                    <span class="font-semibold">¡Envío registrado exitosamente!</span>
                </div>
                <div class="mt-2 text-sm">
                    ✅ Datos enviados al sistema con ID: ${idLocal}<br>
                    <span class="font-mono">Redirigiendo a la guía...</span>
                </div>
            `;
            document.body.appendChild(successMessage);
            
            setTimeout(() => {
                successMessage.remove();
            }, 5000);
            
            setTimeout(() => {
                resetearFormulario();
                formularioEnviandose = false;
            }, 3000);
            
        } catch (fetchError) {
            console.error('❌ Error en el envío:', fetchError);
            
            const datosCompletosParaGuia = {
                ...datosEnvio,
                "ENVIO ID": idLocal,
                envioId: idLocal
            };

            localStorage.setItem('ultimoEnvioCompleto', JSON.stringify(datosCompletosParaGuia));
            guardarEnvioEnLocalStorage(datosEnvio);
            
            setTimeout(() => {
                mostrarResultadoExitoso(datosEnvio, idLocal);
            }, 500);
            
            const errorMessage = document.createElement('div');
            errorMessage.className = 'fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg shadow-lg z-50';
            errorMessage.innerHTML = `
                <div class="flex items-center">
                    <span class="material-icons mr-2">warning</span>
                    <span class="font-semibold">Envío guardado localmente</span>
                </div>
                <div class="mt-2 text-sm">
                    ⚠️ Problema de conexión con el servidor.<br>
                    <span class="font-mono">Los datos se guardaron con ID: ${idLocal}</span>
                </div>
            `;
            document.body.appendChild(errorMessage);
            
            setTimeout(() => {
                errorMessage.remove();
            }, 5000);
            
            submitButton.disabled = false;
            formularioEnviandose = false;
            submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
            submitText.textContent = 'Registrar Envío';
            submitIcon.textContent = 'send';
            
            setTimeout(() => {
                resetearFormulario();
            }, 3000);
        }
        
    } catch (error) {
        console.error('❌ Error crítico en el envío:', error);
        
        alert(`Error: ${error.message}\n\nPor favor intenta nuevamente.`);
        
        submitButton.disabled = false;
        formularioEnviandose = false;
        submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
        submitText.textContent = 'Registrar Envío';
        submitIcon.textContent = 'send';
    }
}

function guardarEnvioEnLocalStorage(datosEnvio) {
    try {
        const enviosGuardados = JSON.parse(localStorage.getItem('enviosPendientes')) || [];
        enviosGuardados.push({
            ...datosEnvio,
            fechaGuardado: new Date().toISOString(),
            sincronizado: false
        });
        
        localStorage.setItem('enviosPendientes', JSON.stringify(enviosGuardados));
        console.log('💾 Envío guardado en localStorage:', datosEnvio["ENVIO ID"]);
        
    } catch (error) {
        console.error('Error guardando en localStorage:', error);
    }
}

function validarFormulario() {
    let valido = true;
    
    const camposRequeridos = [
        'remitente',
        'telefonoRemitente',
        'direccionRemitente',
        'destinatario',
        'direccionDestino',
        'telefonoCliente',
        'barrioLocalidad',
        'ciudadDestino'
    ];
    
    camposRequeridos.forEach(id => {
        const campo = document.getElementById(id);
        if (campo && !campo.value.trim()) {
            campo.classList.add('invalid');
            valido = false;
        } else if (campo) {
            campo.classList.remove('invalid');
        }
    });
    
    const formaPago = document.getElementById('formaPago').value;
    const valorRecaudar = document.getElementById('valorRecaudar');
    
    if ((formaPago === 'contraentrega' || formaPago === 'contraentrega_recaudo') && 
        (!valorRecaudar.value || parseFloat(valorRecaudar.value) <= 0)) {
        valorRecaudar.classList.add('invalid');
        valido = false;
    }
    
    return valido;
}

function resetearFormulario() {
    const deliveryForm = document.getElementById('deliveryForm');
    if (deliveryForm) deliveryForm.reset();
    
    if (barrioIdInput) barrioIdInput.value = '';
    
    const paymentOptions = document.querySelectorAll('.payment-option');
    paymentOptions.forEach(opt => opt.classList.remove('selected'));
    if (paymentOptions[0]) {
        paymentOptions[0].click();
    }
    
    document.querySelectorAll('.invalid').forEach(el => {
        el.classList.remove('invalid');
    });
    
    formularioEnviandose = false;
    
    const usuario = JSON.parse(localStorage.getItem("usuarioLogueado"));
    if (usuario && usuario.ROL === "CLIENTE") {
        const remitente = document.getElementById('remitente');
        const direccionRemitente = document.getElementById('direccionRemitente');
        const telefonoRemitente = document.getElementById('telefonoRemitente');
        
        if (remitente) remitente.value = usuario["NOMBRE REMITENTE"] || usuario["NOMBRE COMPLETO"] || "";
        if (direccionRemitente) direccionRemitente.value = usuario["DIRECCION REMITENTE"] || "";
        if (telefonoRemitente) telefonoRemitente.value = usuario["TELEFONO REMITENTE"] || usuario["TELEFONO"] || "";
    }
    
    const submitButton = document.getElementById('submitButton');
    const submitText = document.getElementById('submitText');
    const submitIcon = document.getElementById('submitIcon');
    
    if (submitButton) {
        submitButton.disabled = false;
        submitButton.classList.remove('opacity-70', 'cursor-not-allowed');
    }
    if (submitText) submitText.textContent = 'Registrar Envío';
    if (submitIcon) submitIcon.textContent = 'send';
    
    actualizarResumen();
    
    const primerCampo = usuario && usuario.ROL === "CLIENTE" 
        ? document.getElementById('destinatario') 
        : document.getElementById('remitente');
    
    if (primerCampo) primerCampo.focus();
}

function handleCancel() {
    if (confirm('¿Cancelar? Se perderán los datos.')) {
        resetearFormulario();
    }
}

function mostrarResultadoExitoso(datosEnvio, idGenerado) {
    console.log('🎉 Mostrando resultado exitoso con ID:', idGenerado);
    
    const deliveryForm = document.getElementById('deliveryForm');
    if (deliveryForm) {
        deliveryForm.style.display = 'none';
    }
    
    const resultSection = document.getElementById('resultSection');
    if (resultSection) {
        resultSection.classList.remove('hidden');
        
        const resultGuideNumber = document.getElementById('resultGuideNumber');
        const resultDestinatario = document.getElementById('resultDestinatario');
        const resultValor = document.getElementById('resultValor');
        const resultMessage = document.getElementById('resultMessage');
        
        if (resultGuideNumber) {
            resultGuideNumber.textContent = idGenerado;
        }
        
        if (resultDestinatario) {
            resultDestinatario.textContent = datosEnvio["DESTINO"] || "No especificado";
        }
        
        if (resultValor) {
            const valor = parseFloat(datosEnvio["VALOR A RECAUDAR"]) || 0;
            resultValor.textContent = `$${valor.toLocaleString()}`;
        }
        
        if (resultMessage) {
            resultMessage.textContent = `Guía ${idGenerado} generada exitosamente. Puedes imprimir la guía para el mensajero.`;
        }
        
        setTimeout(() => {
            abrirGuiaAutomatically(idGenerado, datosEnvio);
        }, 2000);
        
        const printGuideBtn = document.getElementById('printGuideBtn');
        if (printGuideBtn) {
            printGuideBtn.replaceWith(printGuideBtn.cloneNode(true));
            const newPrintGuideBtn = document.getElementById('printGuideBtn');
            newPrintGuideBtn.addEventListener('click', function() {
                abrirGuiaAutomatically(idGenerado, datosEnvio);
            });
        }
        
        const newDeliveryBtn = document.getElementById('newDeliveryBtn');
        if (newDeliveryBtn) {
            newDeliveryBtn.replaceWith(newDeliveryBtn.cloneNode(true));
            
            const newNewDeliveryBtn = document.getElementById('newDeliveryBtn');
            newNewDeliveryBtn.addEventListener('click', function() {
                resultSection.classList.add('hidden');
                if (deliveryForm) {
                    deliveryForm.style.display = 'block';
                    resetearFormulario();
                }
            });
        }
        
        localStorage.setItem('envioParaGuia', idGenerado);
    }
}

function abrirGuiaAutomatically(idGenerado, datosEnvio) {
    console.log('📄 Abriendo guía automáticamente:', idGenerado);
    
    localStorage.setItem('envioParaGuia', idGenerado);
    
    localStorage.setItem('guiaDatosCompletos', JSON.stringify({
        datos: datosEnvio,
        timestamp: new Date().getTime()
    }));
    
    localStorage.removeItem('ultimoEnvioId');
    
    const nuevaVentana = window.open('guia.html', '_blank');
    
    if (!nuevaVentana) {
        alert('Por favor, haz clic en "Imprimir Guía" para ver la guía de envío.');
    }
}

function generarIDLocal() {
    const ahora = new Date();
    const año = ahora.getFullYear().toString().slice(-2);
    const mes = (ahora.getMonth() + 1).toString().padStart(2, '0');
    const dia = ahora.getDate().toString().padStart(2, '0');
    const hora = ahora.getHours().toString().padStart(2, '0');
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    const segundos = ahora.getSeconds().toString().padStart(2, '0');
    
    const milisegundos = ahora.getMilliseconds().toString().padStart(4, '0').slice(0, 4);
    
    return `ENV${año}${mes}${dia}${hora}${minutos}${segundos}${milisegundos}`;
}

function configurarBotonesAdmin() {
    try {
        const usuarioLogueado = JSON.parse(localStorage.getItem('usuarioLogueado'));
        
        if (!usuarioLogueado) {
            console.log('⚠️ Usuario no autenticado');
            return;
        }
        
        const adminButton = document.getElementById('adminPlanillaButton');
        const nombreUsuario = document.getElementById('nombreUsuario');
        const rolUsuario = document.getElementById('rolUsuario');
        
        if (nombreUsuario) {
            nombreUsuario.textContent = usuarioLogueado.USUARIO || 'Usuario';
        }
        
        if (rolUsuario) {
            const rol = usuarioLogueado.ROL || 'Usuario';
            rolUsuario.textContent = rol;
            
            if (rol === 'ADMIN') {
                rolUsuario.classList.add('font-bold', 'text-purple-600', 'dark:text-purple-400');
            }
        }
        
        if (usuarioLogueado.ROL === 'ADMIN' && adminButton) {
            adminButton.classList.remove('hidden');
            console.log('✅ Mostrando botón de Planillas Mensajeros para ADMIN:', usuarioLogueado.USUARIO);
            
            adminButton.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('🔗 Redirigiendo a planilla-mensajeros.html');
                window.location.href = 'planilla-mensajeros.html';
            });
        } else if (adminButton) {
            adminButton.style.display = 'none';
        }
        
    } catch (error) {
        console.error('❌ Error configurando botones admin:', error);
    }
}

function configurarBotonHistorial() {
    const historialButton = document.getElementById('historialButton');
    
    if (historialButton) {
        historialButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'historial.html';
        });
    }
}

// ============================================
// INICIALIZACIÓN PRINCIPAL
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado - Iniciando aplicación...');
    
    agregarAnimacionesCSS();
    
    setTimeout(() => {
        const intro = document.getElementById('intro');
        if (intro) intro.style.display = 'none';
    }, 1500);
    
    const sesionValida = verificarSesionYConfigurarUI();
    
    if (sesionValida) {
        setTimeout(() => {
            initApp();
        }, 100);
    }
    
    configurarBotonesAdmin();
    configurarBotonHistorial();
});



