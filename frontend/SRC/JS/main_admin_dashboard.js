document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".principal")
  const toggleBtn = document.querySelector(".toggle-btn")
  const side = document.getElementById("sidebar")
  const side_bnt = document.querySelectorAll(".btn-module")
  const $ = window.jQuery

  let sonContador = 0
  let todosLosAlbums = []
  let todosLosUsuarios = []
  let bandasMap = {}
  const cancionesPorAlbum = {}

  function filtrarAlbums(textoBusqueda) {
    console.log("🔍 Buscando álbum:", textoBusqueda)

    const filtroEstado = document.getElementById("filtro-estado")?.value || ""
    const textoLower = textoBusqueda.toLowerCase().trim()

    let albumsFiltrados = todosLosAlbums

    if (textoLower) {
      albumsFiltrados = albumsFiltrados.filter(
        (album) =>
          album.nombre_album.toLowerCase().includes(textoLower) ||
          bandasMap[album.id_banda]?.toLowerCase().includes(textoLower),
      )
    }

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

    if (estado) {
      albumsFiltrados = albumsFiltrados.filter((album) => album.estado === estado)
    }

    if (textoLower) {
      albumsFiltrados = albumsFiltrados.filter(
        (album) =>
          album.nombre_album.toLowerCase().includes(textoLower) ||
          bandasMap[album.id_banda]?.toLowerCase().includes(textoLower),
      )
    }

    console.log(`✅ Encontrados: ${albumsFiltrados.length} de ${todosLosAlbums.length}`)
    renderizarAlbums(albumsFiltrados)
  }

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
          htmlContent = await fetch("html_admin_dinamic/gest_usuario.html").then((res) => res.text())

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

  function inicializarModuloUsuarios() {
    console.log("✅ Inicializando módulo de usuarios...")

    cargarUsuarios()

    const buscadorUsuario = document.getElementById("buscar-usuario")
    if (buscadorUsuario) {
      buscadorUsuario.addEventListener("input", (e) => {
        filtrarUsuarios(e.target.value)
      })
    }

    const filtroTipo = document.getElementById("filtro-tipo-usuario")
    if (filtroTipo) {
      filtroTipo.addEventListener("change", (e) => {
        filtrarPorTipoUsuario(e.target.value)
      })
    }
  }

  async function cargarUsuarios() {
    console.log("📦 Cargando usuarios...")
    const tbody = document.getElementById("lista-usuarios")

    if (!tbody) {
      console.error("❌ No se encontró #lista-usuarios")
      return
    }

    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Cargando...</td></tr>'

    try {
      const resp = await fetch("/api/usuarios")

      if (!resp.ok) {
        throw new Error(`Error ${resp.status}`)
      }

      const usuarios = await resp.json()
      console.log("✅ Usuarios recibidos:", usuarios)

      todosLosUsuarios = usuarios

      if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay usuarios</td></tr>'
        return
      }

      renderizarUsuarios(usuarios)
    } catch (error) {
      console.error("❌ Error:", error)
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: red;">Error al cargar usuarios</td></tr>'
    }
  }

  function renderizarUsuarios(usuarios) {
    const tbody = document.getElementById("lista-usuarios")

    if (!tbody) {
      console.error("❌ No se encontró #lista-usuarios")
      return
    }

    if (usuarios.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center; color: #7f8c8d;">No se encontraron usuarios</td></tr>'
      return
    }

    tbody.innerHTML = usuarios
      .map((usuario) => {
        const getTipoBadge = (tipo) => {
          const badges = {
            admin: "background: #e74c3c; color: white;",
            curador: "background: #9b59b6; color: white;",
            banda: "background: #3498db; color: white;",
            artista: "background: #1abc9c; color: white;",
            finalusuario: "background: #27ae60; color: white;",
            deshabilitado: "background: #95a5a6; color: white;",
          }
          return badges[tipo] || badges["finalusuario"]
        }

        const getTipoLabel = (tipo) => {
          const labels = {
            admin: "👑 Admin",
            curador: "📝 Curador",
            banda: "🎸 Banda",
            artista: "🎤 Artista",
            finalusuario: "👤 Usuario",
            deshabilitado: "🚫 Deshabilitado",
          }
          return labels[tipo] || tipo
        }

        return `
                <tr data-usuario-id="${usuario.id_user}" data-usuario-nombre="${usuario.nombre.toLowerCase()}" data-usuario-tipo="${usuario.tipo_user}">
                    <td><strong>${usuario.nombre}</strong></td>
                    <td>${usuario.apellido}</td>
                    <td>${usuario.celular || "N/A"}</td>
                    <td>${usuario.email}</td>
                    <td>
                        <select onchange="cambiarTipoUsuario(${usuario.id_user}, this.value)" style="padding: 8px; border-radius: 4px; border: 1px solid #ddd; ${getTipoBadge(usuario.tipo_user)} font-weight: bold;">
                            <option value="admin" ${usuario.tipo_user === "admin" ? "selected" : ""}>👑 Admin</option>
                            <option value="curador" ${usuario.tipo_user === "curador" ? "selected" : ""}>📝 Curador</option>
                            <option value="banda" ${usuario.tipo_user === "banda" ? "selected" : ""}>🎸 Banda</option>
                            <option value="artista" ${usuario.tipo_user === "artista" ? "selected" : ""}>🎤 Artista</option>
                            <option value="finalusuario" ${usuario.tipo_user === "finalusuario" ? "selected" : ""}>👤 Usuario</option>
                            <option value="deshabilitado" ${usuario.tipo_user === "deshabilitado" ? "selected" : ""}>🚫 Deshabilitado</option>
                        </select>
                    </td>
                    <td>
                        <button onclick="verUsuario(${usuario.id_user})" style="padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">Ver</button>
                    </td>
                </tr>
            `
      })
      .join("")
  }

  function filtrarUsuarios(textoBusqueda) {
    console.log("🔍 Buscando usuario:", textoBusqueda)

    const filtroTipo = document.getElementById("filtro-tipo-usuario")?.value || ""
    const textoLower = textoBusqueda.toLowerCase().trim()

    let usuariosFiltrados = todosLosUsuarios

    if (textoLower) {
      usuariosFiltrados = usuariosFiltrados.filter(
        (usuario) =>
          usuario.nombre.toLowerCase().includes(textoLower) ||
          usuario.apellido.toLowerCase().includes(textoLower) ||
          usuario.email.toLowerCase().includes(textoLower),
      )
    }

    if (filtroTipo) {
      usuariosFiltrados = usuariosFiltrados.filter((usuario) => usuario.tipo_user === filtroTipo)
    }

    console.log(`✅ Encontrados: ${usuariosFiltrados.length} de ${todosLosUsuarios.length}`)
    renderizarUsuarios(usuariosFiltrados)
  }

  function filtrarPorTipoUsuario(tipo) {
    console.log("🎯 Filtrando por tipo:", tipo)

    const buscador = document.getElementById("buscar-usuario")?.value || ""
    const textoLower = buscador.toLowerCase().trim()

    let usuariosFiltrados = todosLosUsuarios

    if (tipo) {
      usuariosFiltrados = usuariosFiltrados.filter((usuario) => usuario.tipo_user === tipo)
    }

    if (textoLower) {
      usuariosFiltrados = usuariosFiltrados.filter(
        (usuario) =>
          usuario.nombre.toLowerCase().includes(textoLower) ||
          usuario.apellido.toLowerCase().includes(textoLower) ||
          usuario.email.toLowerCase().includes(textoLower),
      )
    }

    console.log(`✅ Encontrados: ${usuariosFiltrados.length} de ${todosLosUsuarios.length}`)
    renderizarUsuarios(usuariosFiltrados)
  }

  window.cambiarTipoUsuario = async (id_usuario, nuevoTipo) => {
    console.log(`🔄 Cambiando tipo del usuario ${id_usuario} a "${nuevoTipo}"`)

    try {
      const resp = await fetch(`/api/usuarios/${id_usuario}/tipo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: nuevoTipo }),
      })

      const data = await resp.json()
      console.log("📥 Respuesta:", data)

      if (resp.ok) {
        alert(`✅ Tipo de usuario actualizado a: ${nuevoTipo}`)

        const usuarioIndex = todosLosUsuarios.findIndex((u) => u.id_user === id_usuario)
        if (usuarioIndex !== -1) {
          todosLosUsuarios[usuarioIndex].tipo_user = nuevoTipo
        }

        cargarUsuarios()
      } else {
        alert(data.error || "Error al actualizar: " + (data.error || "Error desconocido"))
        cargarUsuarios()
      }
    } catch (error) {
      console.error("❌ Error:", error)
      alert("❌ Error de conexión con el servidor")
      cargarUsuarios()
    }
  }

  window.verUsuario = (id_usuario) => {
    const usuario = todosLosUsuarios.find((u) => u.id_user === id_usuario)
    if (usuario) {
      alert(
        `👤 Detalles del Usuario:\n\n` +
          `ID: ${usuario.id_user}\n` +
          `Nombre: ${usuario.nombre} ${usuario.apellido}\n` +
          `Email: ${usuario.email}\n` +
          `Teléfono: ${usuario.celular || "N/A"}\n` +
          `Tipo: ${usuario.tipo_user}`,
      )
    }
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
                        <button onclick="toggleCancionesAlbum('${album.id_album}')" style="padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">Ver Canciones</button>
                        <button onclick="verAlbum('${album.id_album}')" style="padding: 5px 10px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">Info</button>
                    </td>
                </tr>
                <tr id="canciones-${album.id_album}" style="display: none;">
                    <td colspan="7" style="background: #f8f9fa; padding: 20px;">
                        <div class="canciones-accordion">
                            <h4 style="margin-bottom: 15px;">🎵 Canciones del álbum "${album.nombre_album}"</h4>
                            <div id="lista-canciones-${album.id_album}">
                                <p style="text-align: center;">Cargando canciones...</p>
                            </div>
                        </div>
                    </td>
                </tr>
            `
      })
      .join("")
  }
window.cambiarEstadoAlbum = async (id_album, nuevoEstado) => {
  try {
    const resp = await fetch("/api/actualizar_estado_album", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_album, estado: nuevoEstado }),
    })

    const data = await resp.json()

    if (resp.ok) {
      alert("✅ Estado actualizado correctamente")
      await cargarAlbums()
    } else {
      alert("❌ Error: " + (data.error || "No se pudo actualizar el estado"))
    }
  } catch (error) {
    console.error("❌ Error:", error)
    alert("❌ Error de conexión con el servidor")
  }
}
  window.toggleCancionesAlbum = async (id_album) => {
    const row = document.getElementById(`canciones-${id_album}`)

    if (!row) {
      console.error("❌ No se encontró la fila de canciones")
      return
    }

    if (row.style.display === "none") {
      row.style.display = "table-row"

      if (!cancionesPorAlbum[id_album]) {
        await cargarCancionesAlbum(id_album)
      }
    } else {
      row.style.display = "none"
    }
  }
// main_admin_dashboard.js
// main_admin_dashboard.js
// main_admin_dashboard.js

async function cargarCancionesAlbum(id_album) {
    const container = document.getElementById(`lista-canciones-${id_album}`)

    if (!container) {
      console.error("❌ No se encontró el contenedor de canciones")
      return
    }

    container.innerHTML = '<p style="text-align: center;">Cargando canciones...</p>'

    try {
      const resp = await fetch(`/api/albums/canciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_album: id_album }),
      })

      if (!resp.ok) {
        let errorData = await resp.json().catch(() => ({ error: "Respuesta no JSON" }))
        throw new Error(`Error ${resp.status}: ${errorData.error || resp.statusText}`)
      }

      const canciones = await resp.json()
      console.log("✅ Canciones recibidas:", canciones)

      cancionesPorAlbum[id_album] = canciones

      if (canciones.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #7f8c8d;">No hay canciones en este álbum</p>'
        return
      }

      // ✅ CORRECCIÓN CLAVE: ¡Llamar a la función de renderizado!
      renderizarCanciones(id_album, canciones) // <--- Esta línea faltaba
      
    } catch (error) {
      console.error("❌ Error al cargar canciones:", error)
      container.innerHTML =
        `<p style="text-align: center; color: red;">Error al cargar canciones: ${error.message}. Verifica que el endpoint /api/albums/canciones exista en tu backend.</p>`
    }
}
  function renderizarCanciones(id_album, canciones) {
    const container = document.getElementById(`lista-canciones-${id_album}`)

    if (!container) return

    container.innerHTML = `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #e8e8e8;">
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">#</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Nombre</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Descripción</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Duración</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Reproducciones</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Enlace</th>
            <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${canciones
            .map(
              (cancion, index) => `
            <tr id="cancion-row-${cancion.id_cancion}">
              <td style="padding: 10px; border: 1px solid #ddd;">${index + 1}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">
                <input type="text" id="nombre-${cancion.id_cancion}" value="${cancion.nombre}" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
              </td>
              <td style="padding: 10px; border: 1px solid #ddd;">
                <input type="text" id="descrip-${cancion.id_cancion}" value="${cancion.descrip || ""}" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
              </td>
              <td style="padding: 10px; border: 1px solid #ddd;">${cancion.duracion}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${cancion.n_reproduccion || 0}</td>
              <td style="padding: 10px; border: 1px solid #ddd;">
                <input type="url" id="path-${cancion.id_cancion}" value="${cancion.cancion_path}" style="width: 100%; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">
              </td>
              <td style="padding: 10px; border: 1px solid #ddd;">
                <button onclick="guardarCancion('${cancion.id_cancion}')" style="padding: 5px 10px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">💾 Guardar</button>
                <button onclick="toggleEstadoCancion('${cancion.id_cancion}', '${id_album}')" style="padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">🚫 Deshabilitar</button>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    `
  }

  window.guardarCancion = async (id_cancion) => {
    const nombre = document.getElementById(`nombre-${id_cancion}`)?.value
    const descrip = document.getElementById(`descrip-${id_cancion}`)?.value
    const cancion_path = document.getElementById(`path-${id_cancion}`)?.value

    if (!nombre || !cancion_path) {
      alert("❌ El nombre y el enlace son obligatorios")
      return
    }

    try {
      const resp = await fetch(`/api/canciones/${id_cancion}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          descrip,
          cancion_path,
        }),
      })

      const data = await resp.json()

      if (resp.ok) {
        alert("✅ Canción actualizada correctamente")
      } else {
        alert(
          "❌ Error: " +
            (data.error || "Error desconocido. Verifica que el endpoint /api/canciones/:id exista en tu backend."),
        )
      }
    } catch (error) {
      console.error("❌ Error:", error)
      alert("❌ Error de conexión. Verifica que el endpoint /api/canciones/:id exista en tu backend.")
    }
  }

  window.toggleEstadoCancion = async (id_cancion, id_album) => {
    const confirmar = confirm("¿Deseas deshabilitar esta canción?")

    if (!confirmar) return

    try {
      const resp = await fetch(`/api/canciones/${id_cancion}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "deshabilitado" }),
      })

      const data = await resp.json()

      if (resp.ok) {
        alert("✅ Canción deshabilitada")
        delete cancionesPorAlbum[id_album]
        await cargarCancionesAlbum(id_album)
      } else {
        alert(
          "❌ Error: " +
            (data.error ||
              "Error desconocido. Verifica que el endpoint /api/canciones/:id/estado exista en tu backend."),
        )
      }
    } catch (error) {
      console.error("❌ Error:", error)
      alert("❌ Error de conexión. Verifica que el endpoint /api/canciones/:id/estado exista en tu backend.")
    }
  }

  window.verAlbum = async (id_album) => {
    const album = todosLosAlbums.find((a) => a.id_album === id_album)

    if (!album) {
      alert("❌ Álbum no encontrado")
      return
    }

    const nombreBanda = bandasMap[album.id_banda] || `Banda ${album.id_banda}`

    let mensaje =
      `📀 Información del Álbum\n\n` +
      `Nombre: ${album.nombre_album}\n` +
      `Banda: ${nombreBanda}\n` +
      `Descripción: ${album.descrip || "Sin descripción"}\n` +
      `Fecha de lanzamiento: ${album.fecha_lanza}\n` +
      `Estado: ${album.estado}\n` +
      `ID: ${album.id_album}\n\n`

    try {
      const resp = await fetch(`/api/albums/canciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_album: id_album }),
      })

      if (resp.ok) {
        const canciones = await resp.json()

        if (canciones.length > 0) {
          mensaje += `🎵 Canciones (${canciones.length}):\n\n`
          canciones.forEach((cancion, index) => {
            mensaje += `${index + 1}. ${cancion.nombre} (${cancion.duracion})\n`
          })
        } else {
          mensaje += `🎵 No hay canciones en este álbum`
        }
      } else {
        mensaje += `⚠️ No se pudieron cargar las canciones.\nVerifica que el endpoint /api/albums/canciones exista en tu backend.`
      }
    } catch (error) {
      console.error("❌ Error:", error)
      mensaje += `⚠️ Error al cargar canciones.\nVerifica que el endpoint /api/albums/canciones exista en tu backend.`
    }

    alert(mensaje)
  }
})
