/* ==========================================
   🔹 CONFIGURACIÓN GLOBAL Y ESTADO
   ========================================== */
const URL_SHEETS = "https://script.google.com/macros/s/AKfycby2CcS1l1igqqIBdmlkCM3kHheHtZ4K4FpsSL70eqdQVt0xByLY6lVhYZpgTOqORA--zg/exec";

const HORARIOS_ATENCION = {
    1: { inicio: "8:00", fin: "21:00" }, // Lun
    2: { inicio: "8:00", fin: "21:00" }, // Mar
    3: { inicio: "18:00", fin: "21:00" }, // Mie
    4: { inicio: "8:00", fin: "21:00" }, // Jue
    5: { inicio: "8:00", fin: "21:00" }, // Vie
    6: { inicio: "8:00", fin: "21:00" }, // Sab
    0: { inicio: "10:00",fin: "17:00" }  // Dom
};

let carrito = [];
let productosGlobal = [];
let productoSeleccionado = null;

/* ==========================================
   🔹 INICIALIZACIÓN
   ========================================== */
document.addEventListener("DOMContentLoaded", () => {
    cargarDesdeSheets();
    inicializarEventosMenu();
    configurarEventosBotones();
});

function configurarEventosBotones() {
    // Botón de agregar al carrito (Detalle)
    const btnAgregar = document.getElementById("btn-agregar-detalle");
    if (btnAgregar) {
        btnAgregar.onclick = () => {
            if (!estaAbierto()) return mostrarAvisoCerrado();
            const cant = parseInt(document.getElementById("cant-detalle").value);
            if (productoSeleccionado) agregarDesdeDetalle(productoSeleccionado, cant);
        };
    }
    // Cerrar acordeón de horarios al hacer clic fuera
    document.addEventListener('click', (e) => {
        const acordeon = document.getElementById('flush-horarios');
        const boton = document.querySelector('[data-bs-target="#flush-horarios"]');
        if (acordeon?.classList.contains('show') && !acordeon.contains(e.target) && !boton.contains(e.target)) {
            bootstrap.Collapse.getOrCreateInstance(acordeon).hide();
        }
    });
}

/* ==========================================
   🔹 LÓGICA DE HORARIOS
   ========================================== */
function estaAbierto() {
    const ahora = new Date();
    const dia = ahora.getDay();
    const hActual = ahora.getHours() * 100 + ahora.getMinutes();
    const h = HORARIOS_ATENCION[dia];
    if (!h) return false;
    const [hI, mI] = h.inicio.split(":").map(Number);
    const [hF, mF] = h.fin.split(":").map(Number);
    const inicio = hI * 100 + mI;
    const fin = hF * 100 + mF;
    return fin < inicio ? (hActual >= inicio || hActual <= fin) : (hActual >= inicio && hActual <= fin);
}

function mostrarAvisoCerrado() {
    const modal = new bootstrap.Modal(document.getElementById('modalCerrado'));
    modal.show();
}

/* ==========================================
   🔹 DATOS Y CATÁLOGO
   ========================================== */
function cargarDesdeSheets() {
    const url = `${URL_SHEETS}?v=${new Date().getTime()}`;
    fetch(url, { method: 'GET', redirect: 'follow' })
        .then(r => r.json())
        .then(data => renderizarProductos(data))
        .catch(err => {
            console.error("Error:", err);
            const cont = document.getElementById("productos");
            if (cont) cont.innerHTML = "<p class='text-center text-danger'>Error al conectar con el menú.</p>";
        });
}
function renderizarProductos(data) {
    const contenedor = document.getElementById("productos");
    if (!contenedor) return;
    let htmlFinal = "";
    let globalIndex = 0;
    productosGlobal = [];
    const categorias = ["start nutrition", "granger nutrition", "gold nutrition","gentech","ena","body advance", "promos"];
    
    categorias.forEach(cat => {
        if (data[cat]?.length > 0) {
            data[cat].forEach(p => {
                const precio = parseFloat(p.precio) || 0;

                // --- 🔹 TRANSFORMADOR DE LINKS (MANTIENE COMPATIBILIDAD CARRUSEL) ---
                let listaImagenes = p.imagen || "";
                let primeraImagen = listaImagenes.split(",")[0].trim(); 
                let imgURL = primeraImagen;
                
                if (imgURL.includes("drive.google.com")) {
                    const match = imgURL.match(/\/d\/([^/]+)/) || imgURL.match(/[?&]id=([^&]+)/);
                    if (match && match[1]) {
                        // Corrección: Usamos backticks y el signo $ para que el ID se inserte bien
                        imgURL = `https://lh3.googleusercontent.com/d/${match[1]}`;
                    }
                }

                // --- 🔹 LIMPIEZA DE NOMBRE Y DESCRIPCIÓN PARA EL INICIO ---
                // Tomamos solo el primer bloque antes del separador '|' para que no se vea feo en la lista
                const nombreLimpio = p.nombre ? p.nombre.split("|")[0].trim() : "Sin nombre";
                const detalleLimpio = p.detalle ? p.detalle.split("|")[0].trim() : 'Opción de Brío Activa.';
                // ----------------------------------------------------------

                // Guardamos los datos completos para que la vista de detalle pueda usarlos
                productosGlobal.push({ ...p, precio, imagen: listaImagenes, categoria: cat });

                htmlFinal += `
                    <div class="col-12 col-md-6 producto" data-categoria="${cat}">
                        <div class="card producto-card shadow-sm mb-2" onclick="verDetalle(${globalIndex})">
                            <div class="info-container">
                                <h6 class="fw-bold mb-1">${nombreLimpio.toUpperCase()}</h6>
                                <p class="descripcion-corta mb-2 text-muted small">${detalleLimpio}</p>
                                <div class="precio text-success fw-bold">$${precio.toLocaleString('es-AR')}</div>
                            </div>
                            <div class="img-container">
                                <img src="${imgURL}" alt="${nombreLimpio}" loading="lazy" style="object-fit: contain;">
                            </div>
                        </div>
                    </div>`;
                globalIndex++;
            });
        }
    });
    contenedor.innerHTML = htmlFinal || "<p class='text-center'>No hay productos disponibles.</p>";
}

function verDetalle(index) {
    const p = productosGlobal[index];
    if (!p) return;
    productoSeleccionado = { ...p, indexGlobal: index };

    const contenedorImg = document.querySelector(".contenedor-zoom");
    const imagenes = p.imagen.split(",").map(img => img.trim());
    
    // --- 🔹 LÓGICA DE DATOS DINÁMICOS (NOMBRE Y DESCRIPCIÓN) ---
    const nombres = (p.nombre || "").split("|").map(n => n.trim());
    const descripciones = (p.detalle || "").split("|").map(d => d.trim());
    
    const nombreElement = document.getElementById("detalle-nombre");
    const descElement = document.getElementById("detalle-descripcion");

    // Seteamos los valores iniciales (posición 0)
    if (nombreElement) nombreElement.innerText = nombres[0].toUpperCase();
    if (descElement) descElement.innerText = descripciones[0] || 'Opción de Brío Activa.';

    let htmlFotos = "";
    if (imagenes.length > 1) {
        htmlFotos = `
            <div id="carouselDetalle" class="carousel slide" data-bs-ride="false">
                <div class="carousel-inner">
                    ${imagenes.map((img, i) => `
                        <div class="carousel-item ${i === 0 ? 'active' : ''}">
                            <img src="${img}" class="d-block w-100" style="object-fit: contain; height: 350px; background: #fff;">
                        </div>
                    `).join('')}
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#carouselDetalle" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon bg-dark rounded-circle"></span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#carouselDetalle" data-bs-slide="next">
                    <span class="carousel-control-next-icon bg-dark rounded-circle"></span>
                </button>
            </div>`;
        
        contenedorImg.innerHTML = htmlFotos;

        // --- 🔹 EVENTO DE CAMBIO SINCRONIZADO ---
        const myCarousel = document.getElementById('carouselDetalle');
        myCarousel.addEventListener('slid.bs.carousel', function (event) {
            const indexFoto = event.to; 
            
            // Cambia Nombre
            if (nombreElement) {
                nombreElement.innerText = (nombres[indexFoto] || nombres[0]).toUpperCase();
            }
            // Cambia Descripción
            if (descElement) {
                descElement.innerText = descripciones[indexFoto] || descripciones[0];
            }
        });

    } else {
        contenedorImg.innerHTML = `<img id="detalle-img" src="${imagenes[0]}" class="img-fluid" style="object-fit: contain;">`;
    }

    document.getElementById("detalle-precio").innerText = `$${p.precio.toLocaleString('es-AR')}`;
    document.getElementById("cant-detalle").value = 1;

    document.getElementById("hero").classList.add("d-none");
    document.getElementById("contenedor-catalogo").classList.add("d-none");
    document.getElementById("vista-detalle").classList.remove("d-none");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==========================================
   🔹 CARRITO Y COMPRA
   ========================================= */
function agregarDesdeDetalle(prod, cant) {
    const existe = carrito.find(p => p.nombre === prod.nombre);
    if (existe) existe.cantidad += cant;
    else carrito.push({ ...prod, cantidad: cant });
    actualizarCarrito();
    const btn = document.getElementById("btn-agregar-detalle");
    btn.disabled = true;
    setTimeout(() => {
        btn.innerHTML = 'AÑADIR AL PEDIDO <i class="bi bi-cart4"></i>';
        btn.disabled = false;
    }, 1500);
}

function actualizarCarrito() {
    const listaModal = document.getElementById("listaModal");
    const totalModal = document.getElementById("totalModal");
    const contadorNav = document.getElementById("contadorNav");
    let html = "", total = 0, items = 0;

    carrito.forEach((p, i) => {
        const sub = p.precio * p.cantidad;
        total += sub; 
        items += p.cantidad;

        // --- 🔹 TRANSFORMADOR DE DRIVE PARA EL CARRITO (CORREGIDO) ---
        // Extraemos solo la primera imagen de la lista por si es un producto con carrusel
        let imgCarrito = p.imagen ? p.imagen.split(",")[0].trim() : "";
        
        if (imgCarrito.includes("drive.google.com")) {
            const match = imgCarrito.match(/\/d\/([^/]+)/) || imgCarrito.match(/[?&]id=([^&]+)/);
            if (match && match[1]) {
                imgCarrito = `https://lh3.googleusercontent.com/u/0/d/$${match[1]}`;
            }
        }

        html += `
            <div class="mb-4 border-bottom pb-3">
                <div class="row gx-2 align-items-center">
                    <div class="col-3">
                        <img src="${imgCarrito}" class="img-fluid rounded shadow-sm" style="height:60px; width:60px; object-fit:contain; background:#fff;">
                    </div>
                    <div class="col-9">
                        <h6 class="mb-0 fw-bold text-uppercase" style="font-size:0.85rem;">${p.nombre}</h6>
                    </div>
                </div>
                <div class="row gx-2 align-items-center mt-2">
                    <div class="col-5">
                        <div class="input-group input-group-sm border rounded" style="width:100%;">
                            <button class="btn btn-sm" onclick="modificarCantidadCarrito(${i},-1)"><i class="bi bi-dash"></i></button>
                            <span class="form-control text-center border-0 bg-white p-0">${p.cantidad}</span>
                            <button class="btn btn-sm" onclick="modificarCantidadCarrito(${i},1)"><i class="bi bi-plus"></i></button>
                        </div>
                    </div>
                    <div class="col-3 text-center">
                        <button class="btn btn-sm text-danger fw-bold p-0" style="font-size:0.65rem;" onclick="eliminarDelCarrito(${i})">ELIMINAR</button>
                    </div>
                    <div class="col-4 text-end">
                        <span class="fw-bold">$${sub.toLocaleString('es-AR')}</span>
                    </div>
                </div>
            </div>`;
    });

    // ... (el resto de la función se mantiene igual)
    if (listaModal) listaModal.innerHTML = carrito.length === 0 ? "<p class='text-center py-4'>Tu carrito está vacío</p>" : html;
    if (totalModal) totalModal.innerText = total.toLocaleString('es-AR');
    if (contadorNav) {
        contadorNav.innerText = items;
        contadorNav.style.display = items > 0 ? "block" : "none";
    }
    // ...
}

async function enviarPedidoWhatsApp() {
    const nom = document.getElementById('nombreCliente')?.value.trim().toUpperCase();
    const dir = document.getElementById('direccionModal')?.value.trim().toUpperCase();
    const tel = document.getElementById('telefonoCliente')?.value.trim() || "N/A";
    if (!estaAbierto()) return mostrarAvisoCerrado();
    if (!nom || !dir) {
        document.getElementById('nombreCliente').classList.add("is-invalid");
        document.getElementById('direccionModal').classList.add("is-invalid");
        return mostrarToast("⚠️ Completa nombre y dirección");
    }
    let total = 0, itemsWS = "", itemsSheets = [];
    carrito.forEach(p => {
        total += (p.precio * p.cantidad);
        itemsSheets.push(`${p.cantidad}x ${p.nombre.toUpperCase()}`);
        itemsWS +=`✅ ${p.cantidad}x - ${p.nombre.toUpperCase()}\n`;
    });
    const pedidoNum = obtenerSiguientePedido();
    const fecha = new Date().toLocaleString('es-AR');
    enviarPedidoASheets({ pedido: pedidoNum, fecha, cliente: nom, telefono: tel, productos: itemsSheets.join(", "), total, direccion: dir });
    
    const linkApp = "link.mercadopago.com.ar/home"; 
    
    let msg =`🛒 *PEDIDO N° ${pedidoNum}*\n📅 ${fecha}\n👤 *CLIENTE:* ${nom}\n--------------------------\n${itemsWS}--------------------------\n📍 *Dirección:* ${dir}\n💰 *Total:* $${total.toLocaleString('es-AR')}\n\n`;
    msg +=`🤝 *MERCADO PAGO:*\n`;
    msg +=`📲 *TOCÁ EN "INICIAR SESIÓN"*\n`;
    msg +=`👇 App: ${linkApp}\n`;
    msg +=`👉 Alias: *Alias-Ejemplo*\n`;
    msg +=`😎 *No olvides mandar el comprobante de pago*\n\n`;
    msg +=`🙏 ¡Muchas gracias!`;

    window.open(`https://wa.me/5491127461954?text=${encodeURIComponent(msg)}`, '_blank');
}

/* ==========================================
   🔹 UTILIDADES
   ========================================== */
function buscarProducto() {
    if (!document.getElementById("vista-detalle").classList.contains("d-none")) volverAlCatalogo();
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    document.querySelectorAll('.producto').forEach(tarjeta => {
        const nombre = tarjeta.querySelector('h6').innerText.toLowerCase();
        tarjeta.style.display = nombre.includes(busqueda) ? "block" : "none";
    });
}

function filtrar(cat) {
    volverAlCatalogo();
    
    // --- 🔹 NUEVA LÓGICA PARA EL HERO EN MÓVILES ---
    const hero = document.getElementById("hero");
    if (hero) {
        // Si el ancho es menor a 768px (móvil) y elegiste una categoría que no sea 'todos'
        if (window.innerWidth < 768 && cat !== 'todos') {
            hero.classList.add("d-none");
        } else {
            // Si es 'todos' o pantalla grande, aseguramos que se vea
            hero.classList.remove("d-none");
        }
    }
    // ----------------------------------------------

    document.querySelectorAll('.producto').forEach(p => {
        p.style.display = (cat === 'todos' || p.getAttribute('data-categoria') === cat) ? "block" : "none";
    });
}

function volverAlCatalogo() {
    document.getElementById("hero").classList.remove("d-none");
    document.getElementById("contenedor-catalogo").classList.remove("d-none");
    document.getElementById("vista-detalle").classList.add("d-none");
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function modificarCantidadCarrito(i, c) {
    if (carrito[i]) {
        carrito[i].cantidad += c;
        if (carrito[i].cantidad <= 0) eliminarDelCarrito(i);
        else actualizarCarrito();
    }
}

function eliminarDelCarrito(i) {
    carrito.splice(i, 1);
    actualizarCarrito();
}

function cambiarCantidadDetalle(v) {
    const input = document.getElementById("cant-detalle");
    if (input) input.value = Math.max(1, (parseInt(input.value) || 1) + v);
}

function intentarAbrirCarrito() {
    if (carrito.length === 0) return mostrarToast("🛒 El carrito está vacío");
    new bootstrap.Modal(document.getElementById('modalCarrito')).show();
}

async function enviarPedidoASheets(datos) {
    try { await fetch(URL_SHEETS, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) }); }
    catch (e) { console.error("Error Sheets:", e); }
}

function inicializarEventosMenu() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const nav = document.getElementById('menuNav');
            if (nav?.classList.contains('show')) bootstrap.Collapse.getInstance(nav).hide();
        });
    });
}

function obtenerSiguientePedido() {
    let cuenta = (parseInt(localStorage.getItem('contadorAbsoluto')) || 1);
    localStorage.setItem('contadorAbsoluto', cuenta + 1);
    return `${Math.floor(cuenta / 10000).toString().padStart(3, '0')}-${(cuenta % 10000).toString().padStart(4, '0')}`;
}

function mostrarToast(m) {
    const t = document.createElement('div');
    t.className = "custom-toast show"; t.innerText = m;
    document.body.appendChild(t);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 500); }, 2500);
}