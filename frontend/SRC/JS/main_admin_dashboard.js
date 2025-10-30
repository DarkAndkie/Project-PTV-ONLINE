document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".principal")
  const toggleBtn = document.querySelector(".toggle-btn")
  const side = document.getElementById("sidebar")
  const side_bnt = document.querySelectorAll(".btn-module")
  const $ = window.jQuery // Declare the $ variable

  let sonContador = 0
  let todosLosAlbums = []
  let bandasMap = {} // { id_banda: nombre_banda }

  if (container) {
    toggleBtn.addEventListener("click", () => {
      side.classList.toggle("active")
    })
  }

  side_bnt.forEach((btn) => {
    btn.addEventListener("click", async () => {
      side_bnt.forEach((b) => b.classList.remove("active"))
      btn.classList.add("active")

      const modulo = btn.getAttribute("data-module")
      await cargarModulos(modulo)
    })
  })

  async function cargarModulos(nombreModulo) {
    const divEspacio = document.getElementById("contenedor-principal")

    try {
      let htmlContent = ""

      switch (nombreModulo) {
        case "albums":
          htmlContent = await fetch("html_admin_dinamic/gest_albums.html").then((res) => res.text())
          
          divEspacio.innerHTML = `<div class="modulo">${htmlContent}</div>`

          if (nombreModulo === "albums") {
            setTimeout(() => {
              inicializarModuloAlbums()
            }, 100)
          }
          break
        case "usuarios":
          htmlContent = await fetch("html_admin_dinamic/gest_usuarios.html").then((res) => res.text())
              
          divEspacio.innerHTML = `<div class="modulo">${htmlContent}</div>`

          if (nombreModulo === "usuarios") {
            setTimeout(() => {
              inicializarModuloUsuarios()
            }, 100)
          }
          break
        case "canciones":
          htmlContent = await fetch("html_admin_dinamic/gest_canciones.html").then((res) => res.text())
          break
        case "playlist":
          htmlContent = await fetch("html_admin_dinamic/gest_playlist.html").then((res) => res.text())
          break
        case "videos":
          htmlContent = await fetch("html_admin_dinamic/gest_videos.html").then((res) => res.text())
          break
        default:
          htmlContent = "<h2>Módulo no encontrado</h2>"
      }

    } catch (error) {
      console.error("Error al cargar el módulo:", error)
      divEspacio.innerHTML = `
                <div class="modulo">
                    <h2>Error</h2>
                    <p>No se pudo cargar el módulo. Verifica que el archivo exista.</p>
                </div>
            `
    }
  }
  function inicializarModuloUsuarios(){

  }
  async function mostrarUsuarios(){
    const res = await fetch()
  }

  function inicializarModuloAlbums() {
    console.log("✅ Inicializando módulo de álbumes...")

    loadArtistas()
    cargarAlbums()
    añadirCanciones()

    const submitAlbum = document.querySelector(".albums_gestion")
    if (submitAlbum) {
      submitAlbum.addEventListener("submit", async (e) => {
        e.preventDefault()
        await crearAlbum()
      })
    }

    const buscadorAlbum = document.getElementById("buscar-album")
    if (buscadorAlbum) {
      buscadorAlbum.addEventListener("input", (e) => {
        filtrarAlbums(e.target.value)
      })
    }

    const filtroEstado = document.getElementById("filtro-estado")
    if (filtroEstado) {
      filtroEstado.addEventListener("change", (e) => {
        filtrarPorEstado(e.target.value)
      })
    }
  }

  async function loadArtistas() {
    try {
      const resp = await fetch("/api/bandas")
      if (!resp.ok) throw new Error("Error al obtener datos de la api banda")

      const bands = await resp.json()
      console.log("🎸 Bandas recibidas:", bands)

      bandasMap = {}
      bands.forEach((banda) => {
        bandasMap[banda.id_user] = banda.nombre
      })
      console.log("✅ Mapeo de bandas creado:", bandasMap)

      const select = document.getElementById("banda")

      if (!select) {
        console.warn("⚠️ No se encontró el select #banda")
        return
      }

      console.log("✅ Select encontrado:", select)
      console.log("✅ Tipo de elemento:", select.tagName)

      if ($ && $.fn.select2) {
        try {
          if ($("#banda").hasClass("select2-hidden-accessible")) {
            $("#banda").select2("destroy")
            console.log("🗑️ Select2 anterior destruido")
          }
        } catch (e) {
          console.log("ℹ️ No había Select2 previo")
        }
      }

      while (select.firstChild) {
        select.removeChild(select.firstChild)
      }

      const defaultOption = document.createElement("option")
      defaultOption.value = ""
      defaultOption.textContent = "Selecciona una banda"
      select.appendChild(defaultOption)

      bands.forEach((banda) => {
        const option = document.createElement("option")
        option.value = banda.id_user
        option.textContent = banda.nombre
        select.appendChild(option)
        console.log(`  ➕ Banda añadida: ${banda.nombre} (ID: ${banda.id_user})`)
      })

      console.log(`✅ Total bandas añadidas: ${bands.length}`)

      if ($ && $.fn.select2) {
        $("#banda").select2({
          placeholder: "Buscar Banda...",
          allowClear: true,
          width: "100%",
        })
        console.log("✅ Select2 inicializado")

        $("#banda").on("change", function () {
          const valor = $(this).val()
          const texto = $(this).find("option:selected").text()
          console.log("🎯 Banda seleccionada - Valor:", valor, "Texto:", texto)
        })
      } else {
        console.warn("⚠️ jQuery o Select2 no está disponible")
      }
    } catch (error) {
      console.error("❌ Error al cargar artistas:", error)
    }
  }

  function añadirCanciones() {
    const agregarCancion = document.querySelector(".btn-añadir-cancion")

    if (!agregarCancion) {
      console.warn("⚠️ No se encontró el botón .btn-añadir-cancion")
      return
    }

    agregarCancion.addEventListener("click", (e) => {
      e.preventDefault()
      sonContador++

      const songContainer = document.querySelector(".cancion-container")

      if (!songContainer) {
        console.error("❌ No se encontró .cancion-container")
        return
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
                `

        songContainer.insertAdjacentHTML("beforeend", htmlContent)
        console.log(`✅ Canción ${sonContador} añadida`)
      } catch (error) {
        console.error("Error al añadir la canción:", error)
      }
    })
  }

  window.eliminarCancion = (id) => {
    const cancion = document.getElementById(`cancion-${id}`)
    if (cancion) {
      cancion.remove()
      console.log(`🗑️ Canción ${id} eliminada`)
    }
  }

  function recolectar_canciones() {
    const songBloques = document.querySelectorAll(".cancion-item")
    const songs = []
    const errores = []

    songBloques.forEach((bloque, index) => {
      const id = bloque.id.split("-")[1]
      const nombre = document.getElementById(`nombre-cancion-${id}`)?.value?.trim() || ""
      const descrip = document.getElementById(`descripcion-cancion-${id}`)?.value?.trim() || ""
      const duracion = document.getElementById(`duracion-cancion-${id}`)?.value?.trim() || ""
      const cancion_path = document.getElementById(`url-cancion-${id}`)?.value?.trim() || ""

      if (!nombre || !duracion || !cancion_path) {
        errores.push(`Canción ${index + 1}: Faltan campos obligatorios`)
        return
      }

      const duracionRegex = /^[0-5][0-9]:[0-5][0-9]$/
      if (!duracionRegex.test(duracion)) {
        errores.push(`Canción ${index + 1} ("${nombre}"): Duración inválida. Use formato mm:ss (ejemplo: 03:45)`)
        return
      }

      if (duracion === "00:00") {
        errores.push(`Canción ${index + 1} ("${nombre}"): La duración no puede ser 00:00`)
        return
      }

      if (!cancion_path.startsWith("http://") && !cancion_path.startsWith("https://")) {
        errores.push(`Canción ${index + 1} ("${nombre}"): La URL debe comenzar con http:// o https://`)
        return
      }

      songs.push({
        nombre,
        descrip,
        duracion,
        cancion_path,
      })
    })

    if (errores.length > 0) {
      alert("❌ Errores en las canciones:\n\n" + errores.join("\n"))
      return null
    }

    console.log(`📦 Canciones recolectadas: ${songs.length}`)
    return songs
  }

  async function crearAlbum() {
    console.log("🎵 Creando álbum...")

    const nombre_album = document.getElementById("nombre-album")?.value?.trim() || ""
    const caratula_dir = document.getElementById("direccion-caratula")?.value?.trim() || ""
    const descrip = document.getElementById("descripcion-album")?.value?.trim() || ""
    const fecha_lanza = document.getElementById("fecha-album")?.value || ""

    const selectElement = document.getElementById("banda")
    let id_banda_str = ""

    if (!selectElement) {
      alert("❌ No se encontró el selector de bandas")
      console.error("❌ Element #banda no existe en el DOM")
      return
    }

    console.log("📋 Tipo de elemento banda:", selectElement.tagName)
    console.log("📋 Opciones disponibles:", selectElement.options.length)

    id_banda_str = selectElement.value

    console.log("🔍 Valor directo del select:", id_banda_str)
    console.log("🔍 selectedIndex:", selectElement.selectedIndex)

    if (selectElement.selectedIndex >= 0) {
      const opcionSeleccionada = selectElement.options[selectElement.selectedIndex]
      console.log("🔍 Opción seleccionada:", {
        value: opcionSeleccionada.value,
        text: opcionSeleccionada.text,
      })
    }

    if (!id_banda_str && $) {
      const jqueryVal = $("#banda").val()
      console.log("🔍 Valor con jQuery:", jqueryVal)

      if (Array.isArray(jqueryVal)) {
        id_banda_str = jqueryVal[0] || ""
      } else {
        id_banda_str = jqueryVal || ""
      }
    }

    console.log("🔍 id_banda_str final:", id_banda_str, "tipo:", typeof id_banda_str)

    if (!nombre_album) {
      alert("❌ El nombre del álbum es obligatorio")
      return
    }
    if (!caratula_dir) {
      alert("❌ La dirección de la carátula es obligatoria")
      return
    }
    if (!fecha_lanza) {
      alert("❌ La fecha de lanzamiento es obligatoria")
      return
    }
    if (!id_banda_str || id_banda_str === "") {
      alert("❌ Debes seleccionar una banda")
      console.error("❌ id_banda_str está vacío:", id_banda_str)
      return
    }

    const id_banda = Number.parseInt(id_banda_str, 10)
    if (isNaN(id_banda) || id_banda <= 0) {
      alert(`❌ El ID de la banda no es válido: "${id_banda_str}"`)
      console.error("❌ id_banda inválido:", id_banda, "original:", id_banda_str)
      return
    }

    console.log("✅ id_banda convertido correctamente:", id_banda)

    const album = {
      nombre_album,
      caratula_dir,
      descrip,
      fecha_lanza,
      id_banda,
    }

    const canciones = recolectar_canciones()

    if (canciones === null) {
      return
    }

    if (canciones.length === 0) {
      alert("Debes agregar al menos una canción")
      return
    }

    const payload = { album, canciones }

    console.log("📤 Payload completo:", JSON.stringify(payload, null, 2))
    console.log("🔍 id_banda es número?", typeof album.id_banda, album.id_banda)

    try {
      const baseURL = window.location.origin
      const resp = await fetch(`${baseURL}/api/crear_album_completo`, {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify(payload),
      })

      const data = await resp.json()
      console.log("📥 Respuesta:", data)

      if (resp.ok) {
        alert(data.mensaje || "¡Álbum creado exitosamente!")

        sonContador = 0
        document.querySelector(".albums_gestion")?.reset()

        const cancionContainer = document.querySelector(".cancion-container")
        if (cancionContainer) {
          cancionContainer.innerHTML =
            '<button type="button" class="btn-añadir-cancion btn-success">+ Agregar canción</button>'
          añadirCanciones()
        }

        if ($ && $.fn.select2) {
          $("#banda").val(null).trigger("change")
        }

        cargarAlbums()
      } else {
        alert(data.error || "Error al crear el álbum")
      }
    } catch (error) {
      console.error("❌ Error:", error)
      alert("Error de conexión con el servidor")
    }
  }

  async function cargarAlbums() {
    console.log("📦 Cargando álbumes...")
    const tbody = document.getElementById("lista-albums")

    if (!tbody) {
      console.error("❌ No se encontró #lista-albums")
      return
    }

    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Cargando...</td></tr>'

    try {
      const resp = await fetch("/api/albums_listar")

      if (!resp.ok) {
        throw new Error(`Error ${resp.status}`)
      }

      const albums = await resp.json()
      console.log("✅ Álbumes recibidos:", albums)

      console.log("[v0] ========== IDs DE ÁLBUMES RECIBIDOS ==========")
      albums.forEach((album, index) => {
        console.log(`[v0] Álbum ${index + 1}:`)
        console.log(`  - ID: "${album.id_album}"`)
        console.log(`  - Tipo: ${typeof album.id_album}`)
        console.log(`  - Longitud: ${album.id_album.length}`)
        console.log(
          `  - Bytes (hex):`,
          Array.from(album.id_album)
            .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
            .join(" "),
        )
        console.log(`  - Nombre: "${album.nombre_album}"`)
      })
      console.log("[v0] ================================================")

      todosLosAlbums = albums

      if (albums.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay álbumes</td></tr>'
        return
      }

      renderizarAlbums(albums)
    } catch (error) {
      console.error("❌ Error:", error)
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red;">Error al cargar</td></tr>'
    }
  }

  function renderizarAlbums(albums) {
    const tbody = document.getElementById("lista-albums")

    if (!tbody) {
      console.error("❌ No se encontró #lista-albums")
      return
    }

    if (albums.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center; color: #7f8c8d;">No se encontraron álbumes</td></tr>'
      return
    }

    tbody.innerHTML = albums
      .map((album) => {
        const getEstadoBadge = (estado) => {
          const badges = {
            borrador: "background: #95a5a6; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px;",
            activo: "background: #27ae60; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px;",
            deshabilitado: "background: #e74c3c; color: white; padding: 5px 10px; border-radius: 4px; font-size: 12px;",
          }
          return badges[estado] || badges["borrador"]
        }

        const nombreBanda = bandasMap[album.id_banda] || `Banda ${album.id_banda}`

        return `
                <tr data-album-id="${album.id_album}" data-album-nombre="${album.nombre_album.toLowerCase()}" data-album-estado="${album.estado}">
                    <td><img src="${album.caratula_dir}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.src='https://via.placeholder.com/50'"></td>
                    <td><strong>${album.nombre_album}</strong></td>
                    <td>${nombreBanda}</td>
                    <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${album.descrip || "Sin descripción"}</td>
                    <td>${album.fecha_lanza}</td>
                    <td>
                        <select onchange="cambiarEstadoAlbum('${album.id_album}', this.value)" style="padding: 5px; border-radius: 4px; border: 1px solid #ddd;">
                            <option value="borrador" ${album.estado === "borrador" ? "selected" : ""}>📝 Borrador</option>
                            <option value="activo" ${album.estado === "activo" ? "selected" : ""}>✅ Activo</option>
                            <option value="deshabilitado" ${album.estado === "deshabilitado" ? "selected" : ""}>🚫 Deshabilitado</option>
                        </select>
                    </td>
                    <td>
                        <button onclick="verAlbum('${album.id_album}')" style="padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Ver</button>
                    </td>
                </tr>
            `
      })
      .join("")
  }

  function filtrarAlbums(textoBusqueda) {
    console.log("🔍 Buscando:", textoBusqueda)

    const filtroEstado = document.getElementById("filtro-estado")?.value || ""
    const textoLower = textoBusqueda.toLowerCase().trim()

    let albumsFiltrados = todosLosAlbums

    // Filtrar por nombre
    if (textoLower) {
      albumsFiltrados = albumsFiltrados.filter((album) => album.nombre_album.toLowerCase().includes(textoLower))
    }

    // Aplicar filtro de estado si existe
    if (filtroEstado) {
      albumsFiltrados = albumsFiltrados.filter((album) => album.estado === filtroEstado)
    }

    console.log(`✅ Encontrados: ${albumsFiltrados.length} de ${todosLosAlbums.length}`)
    renderizarAlbums(albumsFiltrados)
  }

  function filtrarPorEstado(estado) {
    console.log("🎯 Filtrando por estado:", estado)

    const buscador = document.getElementById("buscar-album")?.value || ""
    const textoLower = buscador.toLowerCase().trim()

    let albumsFiltrados = todosLosAlbums

    // Filtrar por estado
    if (estado) {
      albumsFiltrados = albumsFiltrados.filter((album) => album.estado === estado)
    }

    // Aplicar filtro de búsqueda si existe
    if (textoLower) {
      albumsFiltrados = albumsFiltrados.filter((album) => album.nombre_album.toLowerCase().includes(textoLower))
    }

    console.log(`✅ Encontrados: ${albumsFiltrados.length} de ${todosLosAlbums.length}`)
    renderizarAlbums(albumsFiltrados)
  }

  window.cambiarEstadoAlbum = async (id_album, nuevoEstado) => {
    console.log(`🔄 Cambiando estado del álbum "${id_album}" a "${nuevoEstado}"`)

    try {
      const body = {
        id_album: id_album,
        estado: nuevoEstado,
      }

      console.log("📤 Enviando:", body)

      const resp = await fetch("/api/actualizar_estado_album", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await resp.json()
      console.log("📥 Respuesta:", data)

      if (resp.ok) {
        alert(`✅ Estado actualizado a: ${nuevoEstado}`)

        const albumIndex = todosLosAlbums.findIndex((a) => a.id_album === id_album)
        if (albumIndex !== -1) {
          todosLosAlbums[albumIndex].estado = nuevoEstado
        }

        cargarAlbums()
      } else {
        alert("❌ Error al actualizar: " + (data.error || "Error desconocido"))
        cargarAlbums()
      }
    } catch (error) {
      console.error("❌ Error:", error)
      alert("❌ Error de conexión con el servidor")
      cargarAlbums()
    }
  }

  window.verAlbum = (id_album) => {
    alert("Ver álbum: " + id_album)
    // Aquí puedes implementar la lógica para ver los detalles del álbum
  }
})
