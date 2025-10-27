document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.principal');
    const toggleBtn = document.querySelector('.toggle-btn');
    const side = document.getElementById('sidebar');
    const side_bnt = document.querySelectorAll('.btn-module');
    
    let sonContador = 0;
    
    if (container) {
        toggleBtn.addEventListener('click', () => {
            side.classList.toggle('active');
        });
    }

    side_bnt.forEach(btn => {
        btn.addEventListener('click', async () => {
            side_bnt.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const modulo = btn.getAttribute('data-module');
            await cargarModulos(modulo);
        });
    });

    async function cargarModulos(nombreModulo) {
        const divEspacio = document.getElementById('contenedor-principal');
        
        try {
            let htmlContent = '';
            
            switch (nombreModulo) {
                case 'albums':
                    htmlContent = await fetch('html_admin_dinamic/gest_albums.html').then(res => res.text());
                    break;
                case 'usuarios':
                    htmlContent = await fetch('html_admin_dinamic/gest_usuarios.html').then(res => res.text());
                    break;
                case 'canciones':
                    htmlContent = await fetch('html_admin_dinamic/gest_canciones.html').then(res => res.text());
                    break;
                case 'playlist':
                    htmlContent = await fetch('html_admin_dinamic/gest_playlist.html').then(res => res.text());
                    break;
                case 'videos':
                    htmlContent = await fetch('html_admin_dinamic/gest_videos.html').then(res => res.text());
                    break;
                default:
                    htmlContent = '<h2>Módulo no encontrado</h2>';
            }
            
            divEspacio.innerHTML = `<div class="modulo">${htmlContent}</div>`;
            
            // ✅ Solo inicializar funciones si estamos en el módulo de albums
            if (nombreModulo === 'albums') {
                setTimeout(() => {
                    inicializarModuloAlbums();
                }, 100);
            }
            
        } catch (error) {
            console.error('Error al cargar el módulo:', error);
            divEspacio.innerHTML = `
                <div class="modulo">
                    <h2>Error</h2>
                    <p>No se pudo cargar el módulo. Verifica que el archivo exista.</p>
                </div>
            `;
        }
    }

    // ✅ Función para inicializar todo el módulo de albums
    function inicializarModuloAlbums() {
        // Cargar artistas
        loadArtistas();
        
        // Configurar botón de añadir canciones
        añadirCanciones();
        
        // Configurar submit del formulario
        const submitAlbum = document.querySelector('.albums_gestion');
        if (submitAlbum) {
            submitAlbum.addEventListener('submit', async (e) => {
                e.preventDefault();
                await crearAlbum();
            });
        }
    }

    async function loadArtistas() {
        try {
            const resp = await fetch("/api/bandas");
            if (!resp.ok) throw new Error("Error al obtener datos de la api banda");
            
            const bands = await resp.json();
            console.log("🎸 Bandas recibidas:", bands);
            
            const select = document.getElementById('banda');
            
            if (!select) {
                console.warn("⚠️ No se encontró el select #banda");
                return;
            }
            
            console.log("✅ Select encontrado:", select);
            console.log("✅ Tipo de elemento:", select.tagName); // Debe ser "SELECT"
            
            // ✅ IMPORTANTE: Destruir Select2 si existe antes de modificar
            if (typeof $ !== 'undefined' && $.fn.select2) {
                try {
                    $('#banda').select2('destroy');
                    console.log("🗑️ Select2 anterior destruido");
                } catch (e) {
                    console.log("ℹ️ No había Select2 previo");
                }
            }
            
            // ✅ Limpiar TODAS las opciones
            while (select.firstChild) {
                select.removeChild(select.firstChild);
            }
            
            // ✅ Agregar opción por defecto
            const defaultOption = document.createElement('option');
            defaultOption.value = "";
            defaultOption.textContent = "Selecciona una banda";
            select.appendChild(defaultOption);
            
            // ✅ Agregar bandas
            bands.forEach(banda => {
                const option = document.createElement('option');
                option.value = banda.id_user;
                option.textContent = banda.nombre;
                select.appendChild(option);
                console.log(`  ➕ Banda añadida: ${banda.nombre} (ID: ${banda.id_user})`);
            });
            
            console.log(`✅ Total bandas añadidas: ${bands.length}`);
            
            // ✅ Inicializar Select2 DESPUÉS de agregar las opciones
            if (typeof $ !== 'undefined' && $.fn.select2) {
                $('#banda').select2({
                    placeholder: 'Buscar Banda...',
                    allowClear: true,
                    width: '100%'
                });
                console.log("✅ Select2 inicializado");
                
                // ✅ Listener para ver cuándo cambia
                $('#banda').on('change', function () {
                    const valor = $(this).val();
                    const texto = $(this).find('option:selected').text();
                    console.log("🎯 Banda seleccionada - Valor:", valor, "Texto:", texto);
                });
            } else {
                console.warn("⚠️ jQuery o Select2 no está disponible");
            }
            
        } catch (error) {
            console.error('❌ Error al cargar artistas:', error);
        }
    }

    function añadirCanciones() {
        const agregarCancion = document.querySelector('.btn-añadir-cancion');
        
        if (!agregarCancion) {
            console.warn("⚠️ No se encontró el botón .btn-añadir-cancion");
            return;
        }
        
        agregarCancion.addEventListener('click', (e) => {
            e.preventDefault();
            sonContador++;
            
            const songContainer = document.querySelector('.cancion-container');
            
            if (!songContainer) {
                console.error("❌ No se encontró .cancion-container");
                return;
            }
            
            try {
                const htmlContent = `
                    <div class="form-grid cancion-item" id="cancion-${sonContador}"> 
                        <div class="form-group">
                            <label for="nombre-cancion-${sonContador}">Nombre de la canción</label>
                            <input type="text" id="nombre-cancion-${sonContador}" placeholder="Título de la canción" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="descripcion-cancion-${sonContador}">Descripción de la canción</label>
                            <input type="text" id="descripcion-cancion-${sonContador}" placeholder="Descripción">
                        </div>
                        
                        <div class="form-group">
                            <label for="duracion-cancion-${sonContador}">Duración (mm:ss)</label>
                            <input type="text" id="duracion-cancion-${sonContador}" placeholder="03:45" pattern="[0-5][0-9]:[0-5][0-9]" title="Formato: mm:ss (ejemplo: 03:45)" required>
                            <small style="color: #7f8c8d; font-size: 12px;">Formato: mm:ss (minutos: 00-59, segundos: 00-59)</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="url-cancion-${sonContador}">URL de la canción</label>
                            <input type="url" id="url-cancion-${sonContador}" placeholder="https://..." required>
                        </div>
                        
                        <div class="form-group">
                            <button type="button" class="btn-eliminar" onclick="eliminarCancion(${sonContador})">
                                Eliminar canción
                            </button>
                        </div>
                    </div>
                `;
                
                songContainer.insertAdjacentHTML('beforeend', htmlContent);
                console.log(`✅ Canción ${sonContador} añadida`);
                
            } catch (error) {
                console.error('Error al añadir la canción:', error);
            }
        });
    }

    // ✅ Función global para eliminar canciones
    window.eliminarCancion = function(id) {
        const cancion = document.getElementById(`cancion-${id}`);
        if (cancion) {
            cancion.remove();
            console.log(`🗑️ Canción ${id} eliminada`);
        }
    };

    function recolectar_canciones() {
        const songBloques = document.querySelectorAll(".cancion-item");
        const songs = [];

        songBloques.forEach(bloque => {
            const id = bloque.id.split('-')[1];
            const nombre = document.getElementById(`nombre-cancion-${id}`)?.value || "";
            const descrip = document.getElementById(`descripcion-cancion-${id}`)?.value || "";
            const duracion = document.getElementById(`duracion-cancion-${id}`)?.value || "";
            const cancion_path = document.getElementById(`url-cancion-${id}`)?.value || "";

            if (nombre && duracion && cancion_path) {
                songs.push({
                    nombre,
                    descrip,
                    duracion,
                    cancion_path
                });
            }
        });
        
        console.log(`📦 Canciones recolectadas: ${songs.length}`);
        return songs;
    }

    async function crearAlbum() {
        console.log("🎵 Creando álbum...");
        
        const nombre_album = document.getElementById('nombre-album')?.value?.trim() || "";
        const caratula_dir = document.getElementById('direccion-caratula')?.value?.trim() || "";
        const descrip = document.getElementById('descripcion-album')?.value?.trim() || "";
        const fecha_lanza = document.getElementById('fecha-album')?.value || "";
        
        // ✅ SOLUCIÓN DEFINITIVA: Obtener valor directamente del select nativo
        const selectElement = document.getElementById('banda');
        let id_banda_str = "";
        
        if (!selectElement) {
            alert("❌ No se encontró el selector de bandas");
            console.error("❌ Element #banda no existe en el DOM");
            return;
        }
        
        console.log("📋 Tipo de elemento banda:", selectElement.tagName);
        console.log("📋 Opciones disponibles:", selectElement.options.length);
        
        // Obtener el valor
        id_banda_str = selectElement.value;
        
        console.log("🔍 Valor directo del select:", id_banda_str);
        console.log("🔍 selectedIndex:", selectElement.selectedIndex);
        
        if (selectElement.selectedIndex >= 0) {
            const opcionSeleccionada = selectElement.options[selectElement.selectedIndex];
            console.log("🔍 Opción seleccionada:", {
                value: opcionSeleccionada.value,
                text: opcionSeleccionada.text
            });
        }
        
        // Si está vacío, verificar con jQuery como respaldo
        if (!id_banda_str && typeof $ !== 'undefined') {
            const jqueryVal = $('#banda').val();
            console.log("🔍 Valor con jQuery:", jqueryVal);
            
            if (Array.isArray(jqueryVal)) {
                id_banda_str = jqueryVal[0] || "";
            } else {
                id_banda_str = jqueryVal || "";
            }
        }
        
        console.log("🔍 id_banda_str final:", id_banda_str, "tipo:", typeof id_banda_str);

        // ✅ VALIDACIÓN MEJORADA
        if (!nombre_album) {
            alert("❌ El nombre del álbum es obligatorio");
            return;
        }
        if (!caratula_dir) {
            alert("❌ La dirección de la carátula es obligatoria");
            return;
        }
        if (!fecha_lanza) {
            alert("❌ La fecha de lanzamiento es obligatoria");
            return;
        }
        if (!id_banda_str || id_banda_str === "") {
            alert("❌ Debes seleccionar una banda");
            console.error("❌ id_banda_str está vacío:", id_banda_str);
            return;
        }

        // ✅ CONVERTIR A NÚMERO Y VALIDAR
        const id_banda = parseInt(id_banda_str, 10);
        if (isNaN(id_banda) || id_banda <= 0) {
            alert(`❌ El ID de la banda no es válido: "${id_banda_str}"`);
            console.error("❌ id_banda inválido:", id_banda, "original:", id_banda_str);
            return;
        }
        
        console.log("✅ id_banda convertido correctamente:", id_banda);

        const album = {
            nombre_album,
            caratula_dir,
            descrip,
            fecha_lanza,
            id_banda  // ✅ Ahora es un número válido
        };

        const canciones = recolectar_canciones();
        
        if (canciones.length === 0) {
            alert("Debes agregar al menos una canción");
            return;
        }

        const payload = { album, canciones };
        
        console.log("📤 Payload completo:", JSON.stringify(payload, null, 2));
        console.log("🔍 id_banda es número?", typeof album.id_banda, album.id_banda);

        try {
            const baseURL = window.location.origin;
            const resp = await fetch(`${baseURL}/api/crear_album_completo`, {
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const data = await resp.json();
            console.log("📥 Respuesta:", data);

            if (resp.ok) {
                alert(data.mensaje || "¡Álbum creado exitosamente!");
                
                // Resetear formulario
                sonContador = 0;
                document.querySelector('.albums_gestion')?.reset();
                
                const cancionContainer = document.querySelector('.cancion-container');
                if (cancionContainer) {
                    cancionContainer.innerHTML = '';
                }
                
                // Reinicializar Select2
                if (typeof $ !== 'undefined' && $.fn.select2) {
                    $('#banda').val(null).trigger('change');
                }
                
            } else {
                alert(data.error || "Error al crear el álbum");
            }

        } catch (error) {
            console.error("❌ Error:", error);
            alert("Error de conexión con el servidor");
        }
    }
    async function tabla_albumes(){
        
    }
});