// ============================================
// CONFIGURACIÓN GLOBAL
// ============================================
const WEBAPP_URL = "https://script.google.com/macros/s/AKfycbxIipuPmVAvaTt7_oUQzMLNtXIah19dcq2CWkaoglQvFivqY-wBYEw64tvUmL4-1k62/exec";
const REMITENTES_URL = "https://script.google.com/macros/s/AKfycbxIipuPmVAvaTt7_oUQzMLNtXIah19dcq2CWkaoglQvFivqY-wBYEw64tvUmL4-1k62/exec?action=getRemitentes";

// Variables globales
let barriosData = [];
let remitentesData = [];
let currentFocus = -1;
let filteredBarrios = [];
let closeBarrioDropdownTimeout = null;
let dropdownJustClicked = false;

// Elementos del DOM
let formaPagoInput, valorRecaudarInput, autoRecaudoLabel, valorRecaudarHelp;
let paymentOptions, barrioInput, barrioIdInput, autocompleteDropdown;
let remitenteInput, remitenteDropdown;
let resumenFormaPago, resumenValorRecaudar, resumenEstado;
let submitButton, submitText, submitIcon;

// ============================================
// FUNCIÓN PRINCIPAL DE INICIALIZACIÓN
// ============================================

function initApp() {
    console.log('🚀 Inicializando aplicación...');
    
    initializeDOMElements();
    
    loadBarriosData().then(() => {
        loadRemitentesData();
        setupEventListeners();
        initializeUI();
        console.log('✅ Aplicación inicializada');
    }).catch(error => {
        console.error('❌ Error inicializando:', error);
        loadRemitentesData();
        setupEventListeners();
        initializeUI();
    });
}

// ============================================
// FUNCIONES DE INICIALIZACIÓN DEL DOM
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
// FUNCIONES PARA CARGA DE DATOS
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

function loadRemitentesData() {
    console.log('📂 Cargando datos de remitentes...');
    
    fetch(REMITENTES_URL)
        .then(response => response.json())
        .then(data => {
            remitentesData = data;
            console.log(`✅ Cargados ${remitentesData.length} remitentes`);
        })
        .catch(error => {
            console.error('❌ Error cargando remitentes:', error);
            remitentesData = [];
        });
}

// ============================================
// FUNCIONES PARA AUTOCOMPLETE DE BARRIOS
// ============================================

function handleBarrioInput() {
    const searchText = this.value.trim();
    console.log(`🔍 Buscando: "${searchText}"`);
    
    if (searchText === '') {
        barrioIdInput.value = '';
        hideDropdown();
        return;
    }
    
    // MOSTRAR DROPDOWN INMEDIATAMENTE AL ESCRIBIR
    if (searchText.length >= 1) {  // Cambié de 2 a 1
        filteredBarrios = filterBarrios(searchText);
        console.log(`✅ ${filteredBarrios.length} resultados`);
        
        if (filteredBarrios.length > 0) {
            showAutocomplete(filteredBarrios);
        } else {
            // Aún mostrar dropdown vacío para mantener la interfaz consistente
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
    
    // MOSTRAR SUGERENCIAS INMEDIATAMENTE AL ENFOCAR
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
                    barrioIdInput.value = barrio.id || '';
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
    
    // Verificar si deberíamos realmente cerrar
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
// MANEJO DE CIERRE DEL DROPDOWN
// ============================================

function setupDropdownCloseBehavior() {
    console.log('🔧 Configurando comportamiento MEJORADO del dropdown...');
    
    let escribiendo = false;
    let dropdownJustClicked = false;
    let ignoreBlur = false;
    
    // Click en dropdown - No cerrar
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
    
    // Click fuera - Cerrar solo si no está interactuando
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
    
    // Tecla Escape
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
        // Detectar escritura
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
        
        // Blur inteligente - ¡LA CLAVE!
        barrioInput.addEventListener('blur', function() {
            console.log('⚠️ Blur detectado - escribiendo:', escribiendo, '- ignoreBlur:', ignoreBlur);
            
            if (escribiendo || ignoreBlur || dropdownJustClicked) {
                console.log('🚫 Ignorando blur - recuperando foco');
                
                // Recuperar foco inmediatamente
                setTimeout(() => {
                    if (barrioInput) {
                        barrioInput.focus();
                        // Poner cursor al final
                        const len = barrioInput.value.length;
                        barrioInput.setSelectionRange(len, len);
                    }
                }, 10);
                
                return;
            }
            
            // Solo cerrar después de verificar
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
        
        // Focus - mostrar dropdown si hay texto
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

// SOBREESCRIBIR LA FUNCIÓN hideDropdown PARA EVITAR CIERRES INDEBIDOS
const originalHideDropdown = hideDropdown;
hideDropdown = function() {
    // Verificar si deberíamos realmente cerrar
    if (window._escribiendo === true || window._ignoreBlur === true) {
        console.log('🛑 Evitando cierre - usuario está escribiendo');
        return;
    }
    
    console.log('✅ Cerrando dropdown (autorizado)');
    originalHideDropdown();
};

// ============================================
// FUNCIONES PARA AUTOCOMPLETE DE REMITENTES
// ============================================

function handleRemitenteInput() {
    const searchText = this.value.trim();
    if (searchText.length < 2) {
        if (remitenteDropdown) remitenteDropdown.style.display = 'none';
        return;
    }
    
    const filtered = remitentesData.filter(r => 
        r.nombre && r.nombre.toUpperCase().includes(searchText.toUpperCase())
    ).slice(0, 8);
    
    showRemitenteAutocomplete(filtered);
}

function showRemitenteAutocomplete(results) {
    if (!remitenteDropdown) return;
    
    remitenteDropdown.innerHTML = '';
    
    if (results.length === 0) {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = 'No se encontraron remitentes';
        remitenteDropdown.appendChild(item);
    } else {
        results.forEach(remitente => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            item.innerHTML = `
                <div class="flex flex-col">
                    <div class="font-medium">${remitente.nombre || ''}</div>
                    <div class="text-xs text-gray-500">
                        ${remitente.telefono ? '📱 ' + remitente.telefono : ''}
                    </div>
                </div>
            `;
            
            item.addEventListener('mousedown', (e) => {
                e.preventDefault();
                remitenteInput.value = remitente.nombre || '';
                remitenteDropdown.style.display = 'none';
            });
            
            remitenteDropdown.appendChild(item);
        });
    }
    
    remitenteDropdown.style.display = 'block';
}

// ============================================
// CONFIGURACIÓN DE EVENT LISTENERS
// ============================================

function setupEventListeners() {
    console.log('🔗 Configurando event listeners...');
    
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
    
    if (remitenteInput) {
        remitenteInput.addEventListener('input', handleRemitenteInput);
    }
    
    if (valorRecaudarInput) {
        valorRecaudarInput.addEventListener('input', updateSummary);
    }
    
    setupDropdownCloseBehavior();
    
    const form = document.getElementById('deliveryForm');
    if (form) form.addEventListener('submit', handleFormSubmit);
    
    const cancelBtn = document.getElementById('cancelButton');
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    
    console.log('✅ Listeners configurados');
}

// ============================================
// FUNCIONES DE UI
// ============================================

function initializeUI() {
    const envioIdField = document.getElementById('envioId');
    if (envioIdField) {
        envioIdField.value = generateShippingId();
    }
    
    const ciudadOrigenField = document.getElementById('ciudadOrigen');
    if (ciudadOrigenField) {
        ciudadOrigenField.value = 'Bogotá D.C.';
    }
    
    updatePaymentUI('contado');
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

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function getDefaultBarrios() {
    return [
        { id: "ATB6ZXHU", nombre: "USAQUÉN-SANTA BARBARA ORIENTAL" },
        { id: "1HOGOY32", nombre: "USAQUÉN-SANTA BARBARA CENTRAL" },
        { id: "WYWRDLUX", nombre: "USAQUÉN-CHICO NORTE II SECTOR" },
        { id: "5TKZNTB2", nombre: "USAQUÉN-SANTA BARBARA OCCIDENTAL" },
        { id: "5DUKSNR5", nombre: "USAQUÉN-SAN PATRICIO" }
    ];
}

function generateShippingId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ============================================
// FUNCIONES DE FORMULARIO
// ============================================

function validateForm() {
    let isValid = true;
    
    document.querySelectorAll('[required]').forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('invalid');
        } else {
            field.classList.remove('invalid');
        }
    });
    
    if (barrioInput && (!barrioInput.value.trim() || !barrioIdInput.value)) {
        isValid = false;
        barrioInput.classList.add('invalid');
    }
    
    return isValid;
}

function getFormData() {
    const barrioNombre = barrioInput ? barrioInput.value : '';
    const localidad = barrioNombre.split('-')[0] || barrioNombre;
    
    let zona = "NORTE";
    if (localidad.includes("SOACHA")) zona = "SUR";
    else if (localidad.includes("KENNEDY") || localidad.includes("USAQUÉN")) zona = "OCCIDENTE";
    else if (localidad.includes("CHAPINERO")) zona = "ORIENTE";
    
    let mensajero = "CARLOS";
    if (zona === "SUR") mensajero = "JUAN";
    else if (zona === "OCCIDENTE") mensajero = "PEDRO";
    else if (zona === "ORIENTE") mensajero = "ANDRÉS";
    
    const usuarioLogueado = JSON.parse(localStorage.getItem("usuarioLogueado"));
    
    return {
        envioId: document.getElementById('envioId')?.value || '',
        formaPago: formaPagoInput?.value || '',
        remite: document.getElementById('remitente')?.value || '',
        telefono: document.getElementById('telefonoRemitente')?.value || '',
        direccion: document.getElementById('direccionRemitente')?.value || '',
        ciudad: 'Bogotá D.C.',
        destino: document.getElementById('destinatario')?.value || '',
        direccionDestino: document.getElementById('direccionDestino')?.value || '',
        barrio: barrioNombre,
        barrioId: barrioIdInput?.value || '',
        telefonoCliente: document.getElementById('telefonoCliente')?.value || '',
        complementoDir: document.getElementById('complementoDireccion')?.value || '',
        ciudadDestino: document.getElementById('ciudadDestino')?.value || '',
        localidad: localidad,
        valorRecaudar: valorRecaudarInput?.value || '0',
        pagadoRemitente: formaPagoInput?.value === 'contado' ? 'true' : 'false',
        fechaRegistro: new Date().toISOString().split('T')[0],
        horaRegistro: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
        usuario: 'Alex',
        zona: zona,
        mensajero: mensajero,
        observaciones: "",
        usuario_id: usuarioLogueado?.USUARIO || 'sin_usuario'
    };
}

async function handleFormSubmit(e) { 
    e.preventDefault();
    
    if (!validateForm()) {
        showToast('error', 'Error de validación', 'Complete todos los campos requeridos.');
        return;
    }
    
    const formData = getFormData();
    const confirmMessage = `¿Confirmar registro de envío?\n\n📋 ID: ${formData.envioId}\n📍 Destino: ${formData.ciudadDestino}\n👤 Cliente: ${formData.destino}`;
    
    if (!confirm(confirmMessage)) return;
    
    try {
        showLoading(true);
        
        const params = new URLSearchParams();
        Object.keys(formData).forEach(key => params.append(key, formData[key]));
        
        await fetch(WEBAPP_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });
        
        const datosGuia = {
            id: formData.envioId,
            guiaId: formData.envioId,
            formaPago: formData.formaPago,
            remitenteNombre: formData.remite,
            remitenteTelefono: formData.telefono,
            remitenteDireccion: formData.direccion,
            remitenteCiudad: formData.ciudad,
            destinatarioNombre: formData.destino,
            destinatarioTelefono: formData.telefonoCliente,
            destinatarioCiudad: formData.ciudadDestino,
            destinatarioDireccion: formData.direccionDestino,
            complemento: formData.complementoDir,
            barrioLocalidad: formData.barrio,
            barrioId: formData.barrioId,
            valorRecaudar: formData.valorRecaudar,
            fecha: new Date().toLocaleDateString('es-CO'),
            fechaCompleta: new Date().toLocaleString('es-CO'),
            zona: formData.zona,
            mensajero: formData.mensajero,
            observaciones: formData.observaciones,
            usuarioId: formData.usuario_id
        };
        
        const envios = JSON.parse(localStorage.getItem('envios')) || [];
        envios.push(datosGuia);
        localStorage.setItem('envios', JSON.stringify(envios));
        localStorage.setItem('ultimoEnvio', JSON.stringify(datosGuia));
        localStorage.setItem('envioParaGuia', formData.envioId);
        
        mostrarResultado(datosGuia);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showToast('error', 'Error de conexión', 'Intente nuevamente.');
    } finally {
        showLoading(false);
    }
}

function showLoading(loading) {
    if (!submitButton || !submitText || !submitIcon) return;
    
    if (loading) {
        submitText.textContent = 'Procesando...';
        submitIcon.innerHTML = 'refresh';
        submitIcon.classList.add('spinner');
        submitButton.disabled = true;
    } else {
        submitText.textContent = 'Registrar Envío';
        submitIcon.innerHTML = 'arrow_forward';
        submitIcon.classList.remove('spinner');
        submitButton.disabled = false;
    }
}

function mostrarResultado(envio) {
    const deliveryForm = document.getElementById('deliveryForm');
    const resultSection = document.getElementById('resultSection');
    
    if (deliveryForm) deliveryForm.style.display = 'none';
    if (resultSection) {
        resultSection.classList.remove('hidden');
        
        const guideNumber = document.getElementById('resultGuideNumber');
        const destinatario = document.getElementById('resultDestinatario');
        const valor = document.getElementById('resultValor');
        
        if (guideNumber) guideNumber.textContent = envio.id;
        if (destinatario) destinatario.textContent = envio.destinatarioNombre;
        if (valor) valor.textContent = `$${parseInt(envio.valorRecaudar || 0).toLocaleString()}`;
        
        localStorage.setItem('envioParaGuia', envio.id);
    }
}

function resetForm() {
    const form = document.getElementById('deliveryForm');
    if (form) form.reset();
    
    const envioIdField = document.getElementById('envioId');
    if (envioIdField) envioIdField.value = generateShippingId();
    
    if (barrioIdInput) barrioIdInput.value = '';
    hideDropdown();
    
    document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    updatePaymentUI('contado');
}

function handleCancel() {
    if (confirm('¿Cancelar? Se perderán los datos.')) {
        resetForm();
    }
}

function showToast(type, title, message) {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-100 text-green-800' :
        type === 'error' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
    } border-l-4 max-w-sm`;
    
    toast.innerHTML = `
        <div class="flex items-center">
            <span class="material-symbols-outlined mr-2">${type === 'success' ? 'check_circle' : 'error'}</span>
            <div class="flex-1">
                <strong class="font-semibold">${title}</strong>
                <p class="text-sm mt-1">${message}</p>
            </div>
            <button class="ml-4 text-gray-500" onclick="this.parentElement.parentElement.remove()">
                <span class="material-symbols-outlined">close</span>
            </button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 5000);
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', initApp);
