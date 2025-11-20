// 🚫 Verificar si el token sigue existiendo al cargar el dashboard
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token")

  if (!token) {
    alert("⚠️ Tu sesión ha expirado o no has iniciado sesión.")
    window.location.href = "/"
    return
  }

  fetch("/api/albums_listar", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((res) => {
      if (res.status === 401 || res.status === 403) {
        alert("⚠️ Tu sesión ya no es válida.")
        window.location.replace("/")
      }
    })
    .catch(() => {
      window.location.replace("/")
    })
})

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("btnLogout")

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("¿Deseas cerrar sesión?")) {
        window.location.replace("/")
      }
    })
  }
})

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

  let cloudinaryConfig = null
  
  // 🗑️ Tracking de archivos subidos (para limpieza)
  let uploadedFiles = {
    caratula: null,
    canciones: {}
  }

  // 🔒 Variable para saber si estamos editando
  let modoEdicion = false
  let albumEditandoId = null

  // 🧹 Limpiar archivos al salir sin guardar
 // ✅ LIMPIEZA MEJORADA: Usar sendBeacon para garantizar ejecución


  async function limpiarArchivosTemporales() {
    const urlsALimpiar = []
    
    if (uploadedFiles.caratula) {
      urlsALimpiar.push({
        url: uploadedFiles.caratula.url,
        type: "image"
      })
    }
    
    Object.values(uploadedFiles.canciones).forEach(cancion => {
      if (cancion && cancion.url && cancion.nuevo) {
        urlsALimpiar.push({
          url: cancion.url,
          type: "video"
        })
      }
    })
    
    if (urlsALimpiar.length > 0) {
      console.log(`🧹 Limpiando ${urlsALimpiar.length} archivos temporales...`)
      
      try {
        const resp = await fetch("/api/cloudinary/cleanup", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: urlsALimpiar.map(f => f.url),
            resource_types: urlsALimpiar.map(f => f.type)
          })
        })
        
        if (resp.ok) {
          console.log("✅ Archivos temporales eliminados")
        }
      } catch (error) {
        console.error("❌ Error al limpiar:", error)
      }
    }
  }

  // Load Cloudinary config on page load
  async function cargarConfigCloudinary() {
    try {
      const resp = await fetch("/api/cloudinary-config")
      if (resp.ok) {
        cloudinaryConfig = await resp.json()
        console.log("☁️ Cloudinary configurado:", cloudinaryConfig)
      }
    } catch (error) {
      console.error("❌ Error al cargar configuración de Cloudinary:", error)
    }
  }

  cargarConfigCloudinary()

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
          htmlContent = htmlContent.replace('onclick="location.reload()"', 'onclick="limpiarFormularioAlbum()"')
          divEspacio.innerHTML = `<div class="modulo">${htmlContent}</div>`
          
          await new Promise(resolve => setTimeout(resolve, 100))
          inicializarModuloAlbums()
          break
          
        case "usuarios":
          htmlContent = await fetch("html_admin_dinamic/gest_usuario.html").then((res) => res.text())
          divEspacio.innerHTML = `<div class="modulo">${htmlContent}</div>`
          
          await new Promise(resolve => setTimeout(resolve, 100))
          inicializarModuloUsuarios()
          break
          
        case "canciones":
          htmlContent = await fetch("html_admin_dinamic/gest_canciones.html").then((res) => res.text())
          divEspacio.innerHTML = `<div class="modulo">${htmlContent}</div>`
          break
          
        case "playlist":
          htmlContent = await fetch("html_admin_dinamic/gest_playlist.html").then((res) => res.text())
          divEspacio.innerHTML = `<div class="modulo">${htmlContent}</div>`
          break
          
        case "videos":
          htmlContent = await fetch("html_admin_dinamic/gest_videos.html").then((res) => res.text())
          divEspacio.innerHTML = `<div class="modulo">${htmlContent}</div>`
          break
          
        default:
          htmlContent = "<h2>Módulo no encontrado</h2>"
          divEspacio.innerHTML = `<div class="modulo">${htmlContent}</div>`
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

return `
  <tr data-usuario-id="${usuario.id_user}" data-usuario-nombre="${usuario.nombre.toLowerCase()}" data-usuario-tipo="${usuario.tipo_user}" style="${usuario.tipo_user === 'master' ? 'display: none;' : ''}">
    <td><strong>${usuario.nombre}</strong></td>
    <td>${usuario.apellido}</td>
    <td>
      <input type="tel" id="tel-${usuario.id_user}" value="${usuario.celular || 'N/A'}" 
             style="width: 100%; padding: 4px; background: rgba(255,255,255,0.05); border: 1px solid #444; border-radius: 4px; color: #e0e0e0;">
    </td>
    <td>
      <input type="email" id="email-${usuario.id_user}" value="${usuario.email}" 
             style="width: 100%; padding: 4px; background: rgba(255,255,255,0.05); border: 1px solid #444; border-radius: 4px; color: #e0e0e0;">
    </td>
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
      <button onclick="guardarCambiosUsuario(${usuario.id_user})" style="padding: 5px 10px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">💾 Guardar</button>
      <button onclick="verUsuario(${usuario.id_user})" style="padding: 5px 10px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">Ver</button>
    </td>
  </tr>
`
      })
      .join("")
  }
// AGREGAR después de la función cambiarTipoUsuario
window.guardarCambiosUsuario = async (id_usuario) => {
  const nuevoEmail = document.getElementById(`email-${id_usuario}`).value.trim()
  const nuevoTel = document.getElementById(`tel-${id_usuario}`).value.trim()

  if (!nuevoEmail) {
    alert("❌ El correo no puede estar vacío")
    return
  }

  try {
    const resp = await fetch(`/api/usuarios/${id_usuario}/actualizar-info`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email: nuevoEmail, 
        celular: nuevoTel 
      }),
    })

    const data = await resp.json()

    if (resp.ok) {
      alert("✅ Información actualizada correctamente")
      cargarUsuarios()
    } else {
      alert(data.error || "Error al actualizar")
    }
  } catch (error) {
    console.error("❌ Error:", error)
    alert("❌ Error de conexión")
  }
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

    if (!cloudinaryConfig) {
      console.log("⏳ Esperando configuración de Cloudinary...")
      setTimeout(() => inicializarModuloAlbums(), 500)
      return
    }

    loadArtistas()
    cargarAlbums()
    
    setTimeout(() => {
      setupUploadZones()
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
    }, 200)
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

      if ($ && $.fn.select2) {
        try {
          if ($("#banda").hasClass("select2-hidden-accessible")) {
            $("#banda").select2("destroy")
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
      })

      if ($ && $.fn.select2) {
        $("#banda").select2({
          placeholder: "Buscar Banda...",
          allowClear: true,
          width: "100%",
        })

        $("#banda").on("change", function () {
          const valor = $(this).val()
          const texto = $(this).find("option:selected").text()
          console.log("🎯 Banda seleccionada - Valor:", valor, "Texto:", texto)
        })
      }
    } catch (error) {
      console.error("❌ Error al cargar artistas:", error)
    }
  }

  function setupUploadZones() {
    console.log("🔧 Configurando zonas de subida...")
    
    if (!cloudinaryConfig) {
      console.error("❌ Cloudinary no está configurado")
      return
    }

    const uploadCaratula = document.getElementById("upload-caratula")
    if (!uploadCaratula) {
      console.error("❌ No se encontró #upload-caratula")
      return
    }

    console.log("✅ Elemento upload-caratula encontrado")

    const fileInput = document.getElementById("file-caratula")
    const preview = document.getElementById("preview-caratula")
    const previewImg = document.getElementById("preview-img-caratula")
    const direccionInput = document.getElementById("direccion-caratula")
    const progressBar = document.getElementById("progress-caratula")
    const progressFill = document.getElementById("progress-bar-caratula")

    console.log("📋 Elementos encontrados:", {
      fileInput: !!fileInput,
      preview: !!preview,
      previewImg: !!previewImg,
      direccionInput: !!direccionInput,
      progressBar: !!progressBar,
      progressFill: !!progressFill
    })

    if (!fileInput || !preview || !previewImg || !direccionInput) {
      console.error("❌ Faltan elementos necesarios para la carátula")
      return
    }

    uploadCaratula.addEventListener("click", (e) => {
      console.log("🖱️ Click en zona de subida")
   
  
      fileInput.click()
    })

    uploadCaratula.addEventListener("dragover", (e) => {
      console.log("📂 Dragover detectado")
        e.preventDefault()  
        e.stopPropagation()
      uploadCaratula.classList.add("dragover")
    })

    uploadCaratula.addEventListener("dragleave", (e) => {
        e.preventDefault()  
        e.stopPropagation()
      uploadCaratula.classList.remove("dragover")
    })

   uploadCaratula.addEventListener("drop", (e) => {
  console.log("📥 Drop detectado")
  e.preventDefault()  // ✅ AGREGAR ESTO
  e.stopPropagation() // ✅ AGREGAR ESTO
  
  uploadCaratula.classList.remove("dragover")
  
  if (e.dataTransfer.files.length > 0) {
    console.log("📁 Archivo droppeado:", e.dataTransfer.files[0].name)
    handleCaratulaUpload(e.dataTransfer.files[0])
  }
})

    fileInput.addEventListener("change", (e) => {
      console.log("📁 Archivo seleccionado via input")
      if (e.target.files.length > 0) {
        console.log("📄 Archivo:", e.target.files[0].name)
        handleCaratulaUpload(e.target.files[0])
      }
    })

  async function handleCaratulaUpload(file) {
  console.log("🚀 Iniciando subida de carátula:", file.name)

  if (!file.type.startsWith("image/")) {
    alert("❌ Por favor selecciona un archivo de imagen")
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("❌ La imagen no puede superar 10MB")
    return
  }

  // 🗑️ CORREGIDO: Eliminar carátula anterior si existe Y es diferente
  if (uploadedFiles.caratula && uploadedFiles.caratula.nuevo && uploadedFiles.caratula.url) {
    console.log("🗑️ Eliminando carátula anterior:", uploadedFiles.caratula.url)
    try {
      const respDelete = await fetch("/api/cloudinary/cleanup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [uploadedFiles.caratula.url],
          resource_types: ["image"]
        })
      })
      
      if (respDelete.ok) {
        console.log("✅ Carátula anterior eliminada")
      } else {
        console.warn("⚠️ No se pudo eliminar carátula anterior")
      }
    } catch (error) {
      console.error("❌ Error al eliminar:", error)
    }
  }

  const cloudName = cloudinaryConfig.cloudName
  const uploadPreset = cloudinaryConfig.uploadPresetCovers
  
  console.log("📋 Configuración Cloudinary:", {
    cloudName,
    uploadPreset,
    configCompleta: cloudinaryConfig
  })

  if (!cloudName || !uploadPreset) {
    alert("❌ Cloudinary no está configurado correctamente")
    console.error("Config faltante:", { cloudName, uploadPreset })
    return
  }

  if (progressBar) {
    progressBar.style.display = "block"
  }
  if (progressFill) {
    progressFill.style.width = "0%"
  }

  const formData = new FormData()
  formData.append("file", file)
  formData.append("upload_preset", uploadPreset)
  
  console.log("📤 Enviando a Cloudinary:", {
    url: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    preset: uploadPreset,
    fileSize: file.size,
    fileType: file.type
  })

  try {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && progressFill) {
        const percentComplete = (e.loaded / e.total) * 100
        progressFill.style.width = percentComplete + "%"
        console.log(`📊 Progreso: ${percentComplete.toFixed(0)}%`)
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        const cloudinaryUrl = response.secure_url

        direccionInput.value = cloudinaryUrl
        previewImg.src = cloudinaryUrl
        preview.style.display = "block"
        if (progressBar) progressBar.style.display = "none"

        // ✅ Marcar como nuevo archivo
        uploadedFiles.caratula = {
          url: cloudinaryUrl,
          publicId: response.public_id,
          nuevo: true
        }

        console.log("✅ Carátula subida:", cloudinaryUrl)
        alert("✅ Carátula subida correctamente")
      } else {
        alert("❌ Error al subir (status: " + xhr.status + ")")
        if (progressBar) progressBar.style.display = "none"
      }
    })

    xhr.addEventListener("error", () => {
      alert("❌ Error al subir la carátula")
      if (progressBar) progressBar.style.display = "none"
    })

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
    console.log("🌐 URL de subida:", uploadUrl)
    
    xhr.open("POST", uploadUrl)
    xhr.send(formData)
  } catch (error) {
    console.error("❌ Error:", error)
    alert("❌ Error al procesar")
    if (progressBar) progressBar.style.display = "none"
  }
}
  }

  window.removerCaratula = () => {
    const direccionInput = document.getElementById("direccion-caratula")
    const preview = document.getElementById("preview-caratula")
    const fileInput = document.getElementById("file-caratula")

    if (direccionInput) direccionInput.value = ""
    if (preview) preview.style.display = "none"
    if (fileInput) fileInput.value = ""
    
    uploadedFiles.caratula = null
    
    console.log("🗑️ Carátula removida del formulario")
  }

  function añadirCanciones() {
    const agregarCancion = document.querySelector(".btn-añadir-cancion")

    if (!agregarCancion) {
      console.warn("⚠️ No se encontró .btn-añadir-cancion")
      return
    }

    console.log("✅ Botón añadir canción encontrado")

    const nuevoBoton = agregarCancion.cloneNode(true)
    agregarCancion.parentNode.replaceChild(nuevoBoton, agregarCancion)

    nuevoBoton.addEventListener("click", (e) => {
      console.log("➕ Añadiendo nueva canción")
      e.preventDefault()
      sonContador++

      const songContainer = document.querySelector(".cancion-container")
      if (!songContainer) {
        console.error("❌ No se encontró .cancion-container")
        return
      }

      const htmlContent = `
        <div class="form-grid cancion-item" id="cancion-${sonContador}" style="border: 1px solid #ddd; padding: 15px; margin-top: 15px; border-radius: 8px; background: #f9f9f9;"> 
          <div class="form-group">
            <label for="nombre-cancion-${sonContador}">Nombre de la canción</label>
            <input type="text" id="nombre-cancion-${sonContador}" placeholder="Título" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div class="form-group">
            <label for="descripcion-cancion-${sonContador}">Descripción</label>
            <input type="text" id="descripcion-cancion-${sonContador}" placeholder="Descripción" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          
          <div class="form-group">
            <label for="duracion-cancion-${sonContador}">Duración (mm:ss)</label>
            <input type="text" id="duracion-cancion-${sonContador}" placeholder="03:45" pattern="[0-5][0-9]:[0-5][0-9]" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <small style="color: #7f8c8d; font-size: 12px;">Formato: mm:ss</small>
          </div>
          
          <div class="form-group">
            <label>🎵 Archivo de música</label>
            <div class="upload-zone-cancion" id="upload-cancion-${sonContador}" style="border: 2px dashed #95a5a6; padding: 20px; text-align: center; border-radius: 6px; background: #fafafa; cursor: pointer;">
              <input type="file" id="archivo-cancion-${sonContador}" accept="audio/*" style="display: none;">
              <p style="margin: 0; font-size: 14px;">📁 Haz clic o arrastra un archivo</p>
              <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 12px;">MP3, WAV, FLAC - Máx 50MB</p>
              <div class="upload-progress-cancion" id="progress-cancion-${sonContador}" style="display: none; margin-top: 10px; width: 100%; height: 6px; background: #ecf0f1; border-radius: 3px;">
                <div class="upload-progress-bar-cancion" style="height: 100%; background: #3498db; width: 0%; transition: width 0.3s;"></div>
              </div>
              <div id="preview-cancion-${sonContador}" style="margin-top: 10px; display: none;">
                <p style="color: #27ae60; font-size: 12px;">✅ Archivo seleccionado</p>
              </div>
            </div>
            <input type="hidden" id="path-cancion-${sonContador}" required>
          </div>
          
          <div class="form-group">
            <button type="button" class="btn-eliminar" onclick="eliminarCancion(${sonContador})" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
              🗑️ Eliminar canción
            </button>
          </div>
        </div>
      `

      songContainer.insertAdjacentHTML("beforeend", htmlContent)
      
      console.log(`🔧 Configurando upload para la canción ${sonContador} recién agregada`)
      setTimeout(() => {
        setupSongUpload(sonContador)
      }, 100)
    })
  }

  function setupSongUpload(cancionId, urlExistente = null) {
    console.log(`🎵 Configurando upload para canción ${cancionId}`)
    
    if (!cloudinaryConfig) {
      console.error("❌ Cloudinary no configurado")
      alert("❌ Cloudinary no está configurado. Espera un momento y recarga la página.")
      return
    }

    const uploadZone = document.getElementById(`upload-cancion-${cancionId}`)
    const fileInput = document.getElementById(`archivo-cancion-${cancionId}`)
    const pathInput = document.getElementById(`path-cancion-${cancionId}`)
    const progressBar = document.getElementById(`progress-cancion-${cancionId}`)
    const progressFill = progressBar?.querySelector(".upload-progress-bar-cancion")
    const preview = document.getElementById(`preview-cancion-${cancionId}`)

    console.log(`📋 Elementos canción ${cancionId}:`, {
      uploadZone: !!uploadZone,
      fileInput: !!fileInput,
      pathInput: !!pathInput,
      progressBar: !!progressBar,
      progressFill: !!progressFill,
      preview: !!preview
    })

    if (!uploadZone || !fileInput) {
      console.error(`❌ Faltan elementos para canción ${cancionId}`)
      return
    }

    // 🎵 Si hay URL existente, guardarla
    if (urlExistente) {
      uploadedFiles.canciones[cancionId] = {
        url: urlExistente,
        nuevo: false,
        urlOriginal: urlExistente
      }
    }

    uploadZone.addEventListener("click", (e) => {
      console.log(`🖱️ Click en zona canción ${cancionId}`)
 
 
      fileInput.click()
    })

    uploadZone.addEventListener("dragover", (e) => {
        e.preventDefault()  
        e.stopPropagation()
      uploadZone.style.borderColor = "#27ae60"
      uploadZone.style.background = "#d5f4e6"
    })

    uploadZone.addEventListener("dragleave", (e) => {
        e.preventDefault()  
        e.stopPropagation()
      uploadZone.style.borderColor = "#95a5a6"
      uploadZone.style.background = "#fafafa"
    })

    uploadZone.addEventListener("drop", (e) => {
      console.log(`📥 Drop en canción ${cancionId}`)
  e.preventDefault()   
  e.stopPropagation()
      uploadZone.style.borderColor = "#95a5a6"
      uploadZone.style.background = "#fafafa"
      
      if (e.dataTransfer.files.length > 0) {
        console.log(`📁 Archivo droppeado: ${e.dataTransfer.files[0].name}`)
        handleSongUpload(e.dataTransfer.files[0])
      }
    })

    fileInput.addEventListener("change", (e) => {
      console.log(`📁 Archivo seleccionado para canción ${cancionId}`)
      if (e.target.files.length > 0) {
        console.log(`📄 Nombre del archivo: ${e.target.files[0].name}`)
        handleSongUpload(e.target.files[0])
      }
    })

    async function handleSongUpload(file) {
const archivoAnterior = uploadedFiles.canciones[cancionId]
if (archivoAnterior && archivoAnterior.url && archivoAnterior.nuevo) {
  console.log(`🗑️ Eliminando archivo anterior de canción ${cancionId}:`, archivoAnterior.url)
  
  try {
    const respDelete = await fetch("/api/cloudinary/cleanup", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: [archivoAnterior.url],
        resource_types: ["video"]
      })
    })
    
    if (respDelete.ok) {
      console.log("✅ Archivo anterior de canción eliminado")
    } else {
      console.warn("⚠️ No se pudo eliminar archivo anterior")
    }
  } catch (error) {
    console.error("❌ Error al eliminar:", error)
  }
}
    }
  }

  // 🗑️ Función auxiliar para eliminar archivos de Cloudinary
  async function eliminarDeCloudinary(url, resourceType = "video") {
    try {
      console.log(`🗑️ Eliminando de Cloudinary: ${url}`)
      
      const resp = await fetch("/api/cloudinary/cleanup", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: [url],
          resource_types: [resourceType]
        })
      })
      
      if (resp.ok) {
        console.log("✅ Archivo eliminado de Cloudinary")
        return true
      } else {
        console.warn("⚠️ No se pudo eliminar el archivo")
        return false
      }
    } catch (error) {
      console.error("❌ Error al eliminar:", error)
      return false
    }
  }

  window.eliminarCancion = async (id) => {
    const cancion = document.getElementById(`cancion-${id}`)
    if (cancion) {
      if (confirm("¿Eliminar esta canción? El archivo se eliminará de Cloudinary.")) {
        // 🗑️ Eliminar archivo de Cloudinary si es nuevo
        const archivoCancion = uploadedFiles.canciones[id]
        if (archivoCancion && archivoCancion.url && archivoCancion.nuevo) {
          await eliminarDeCloudinary(archivoCancion.url, "video")
        }
        
        cancion.remove()
        delete uploadedFiles.canciones[id]
        console.log(`🗑️ Canción ${id} eliminada del formulario`)
      }
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
      const cancion_path = document.getElementById(`path-cancion-${id}`)?.value?.trim() || ""

      if (!nombre || !duracion || !cancion_path) {
        errores.push(`Canción ${index + 1}: Faltan campos obligatorios`)
        return
      }

      const duracionRegex = /^[0-5][0-9]:[0-5][0-9]$/
      if (!duracionRegex.test(duracion)) {
        errores.push(`Canción ${index + 1}: Duración inválida (formato: mm:ss)`)
        return
      }

      if (duracion === "00:00") {
        errores.push(`Canción ${index + 1}: No puede ser 00:00`)
        return
      }

      if (!cancion_path.startsWith("http")) {
        errores.push(`Canción ${index + 1}: URL inválida`)
        return
      }

      songs.push({ nombre, descrip, duracion, cancion_path })
    })

    if (errores.length > 0) {
      alert("❌ Errores encontrados:\n\n" + errores.join("\n"))
      return null
    }

    console.log(`✅ ${songs.length} canciones recolectadas correctamente`)
    return songs
  }

  async function crearAlbum() {
    console.log("🎵 Creando álbum...")

    const nombre_album = document.getElementById("nombre-album")?.value?.trim() || ""
    const caratula_dir = document.getElementById("direccion-caratula")?.value?.trim() || ""
    const descrip = document.getElementById("descripcion-album")?.value?.trim() || ""
    const fecha_lanza = document.getElementById("fecha-album")?.value || ""
    const selectElement = document.getElementById("banda")
    const id_banda_str = selectElement?.value || ""

    if (!nombre_album || !caratula_dir || !fecha_lanza || !id_banda_str) {
      alert("❌ Todos los campos principales son obligatorios")
      return
    }

    const id_banda = Number.parseInt(id_banda_str, 10)
    if (isNaN(id_banda) || id_banda <= 0) {
      alert("❌ Selecciona una banda válida")
      return
    }

    const album = { nombre_album, caratula_dir, descrip, fecha_lanza, id_banda }
    const canciones = recolectar_canciones()

    if (!canciones || canciones.length === 0) {
      alert("❌ Debes agregar al menos una canción")
      return
    }

    console.log("📦 Datos del álbum:", album)
    console.log("🎵 Canciones:", canciones)

    try {
      const resp = await fetch(`${window.location.origin}/api/crear_album_completo`, {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({ album, canciones }),
      })

      const data = await resp.json()
      
      if (resp.ok) {
        alert("✅ ¡Álbum creado exitosamente!")
        // ✅ Marcar archivos como guardados
        uploadedFiles.canciones = Object.fromEntries(
          Object.entries(uploadedFiles.canciones).map(([id, archivo]) => [
            id,
            { ...archivo, nuevo: false }
          ])
        )
        if (uploadedFiles.caratula) {
          uploadedFiles.caratula.nuevo = false
        }
        
        location.reload()
      } else {
        alert("❌ Error: " + (data.error || "Error desconocido"))
      }
    } catch (error) {
      console.error("❌ Error:", error)
      alert("❌ Error de conexión con el servidor")
    }
  }

  async function cargarAlbums() {
    console.log("📦 Cargando álbumes...")
    const tbody = document.getElementById("lista-albums")
    if (!tbody) {
      console.error("❌ No se encontró #lista-albums")
      return
    }

    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Cargando...</td></tr>'

    try {
      const resp = await fetch("/api/albums_listar")
      if (!resp.ok) throw new Error(`Error ${resp.status}`)

      const albums = await resp.json()
      todosLosAlbums = albums

      console.log(`✅ ${albums.length} álbumes cargados`)

      if (albums.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #7f8c8d;">No hay álbumes registrados</td></tr>'
        return
      }

      renderizarAlbums(albums)
    } catch (error) {
      console.error("❌ Error al cargar álbumes:", error)
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: red;">Error al cargar álbumes</td></tr>'
    }
  }

  function renderizarAlbums(albums) {
    const tbody = document.getElementById("lista-albums")
    if (!tbody) return

    if (albums.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #7f8c8d;">No se encontraron álbumes</td></tr>'
      return
    }

    tbody.innerHTML = albums
      .map(
        (album) => `
      <tr style="border-bottom: 1px solid #ecf0f1;">
        <td style="padding: 10px;">
          <img src="${album.caratula_dir}" 
               style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        </td>
        <td style="padding: 10px;"><strong>${album.nombre_album}</strong></td>
        <td style="padding: 10px;">${bandasMap[album.id_banda] || album.id_banda}</td>
        <td style="padding: 10px;">${album.descrip || "Sin descripción"}</td>
        <td style="padding: 10px;">${album.fecha_lanza}</td>
        <td style="padding: 10px;">
          <select onchange="cambiarEstadoAlbum('${album.id_album}', this.value)" style="padding: 5px; border-radius: 4px; border: 1px solid #ddd;">
            <option value="borrador" ${album.estado === "borrador" ? "selected" : ""}>📝 Borrador</option>
            <option value="activo" ${album.estado === "activo" ? "selected" : ""}>✅ Activo</option>
            <option value="deshabilitado" ${album.estado === "deshabilitado" ? "selected" : ""}>🚫 Deshabilitado</option>
          </select>
        </td>
        <td style="padding: 10px;">
          <button onclick="editarAlbum('${album.id_album}')" style="padding: 5px 10px; background: #f39c12; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 2px;">✏️ Editar</button>
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
    `,
      )
      .join("")
  }

  window.cambiarEstadoAlbum = async (id_album, nuevoEstado) => {
    console.log(`🔄 Cambiando estado del álbum ${id_album} a "${nuevoEstado}"`)
    
    try {
      const resp = await fetch("/api/actualizar_estado_album", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id_album: id_album,
          estado: nuevoEstado 
        }),
      })

      if (resp.ok) {
        alert("✅ Estado actualizado correctamente")
        await cargarAlbums()
      } else {
        const data = await resp.json()
        alert("❌ Error: " + (data.error || "Error desconocido"))
      }
    } catch (error) {
      console.error("❌ Error:", error)
      alert("❌ Error de conexión")
    }
  }

  window.toggleCancionesAlbum = async (id_album) => {
    console.log("🎵 Toggle canciones para álbum:", id_album)
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

      renderizarCanciones(id_album, canciones)
      
    } catch (error) {
      console.error("❌ Error al cargar canciones:", error)
      container.innerHTML =
        `<p style="text-align: center; color: red;">Error al cargar canciones: ${error.message}</p>`
    }
  }

function renderizarCanciones(id_album, canciones) {
  const container = document.getElementById(`lista-canciones-${id_album}`)
  if (!container) return

  const totalActivas = canciones.filter(c => c.estado === 'activo').length
  const totalDeshabilitadas = canciones.filter(c => c.estado === 'deshabilitado').length
  const totalReproducciones = canciones.reduce((sum, c) => sum + (c.n_reproduccion || 0), 0)

  container.innerHTML = `
    <!-- Estadísticas -->
<div class="modern-stats">
  <div class="stat-card">
    <div class="stat-number stat-total">${canciones.length}</div>
    <div class="stat-label">Total</div>
  </div>
  <div class="stat-card">
    <div class="stat-number stat-activas">${totalActivas}</div>
    <div class="stat-label">Activas</div>
  </div>
  <div class="stat-card">
    <div class="stat-number stat-deshabilitadas">${totalDeshabilitadas}</div>
    <div class="stat-label">Deshabilitadas</div>
  </div>
  <div class="stat-card">
    <div class="stat-number stat-reproducciones">${totalReproducciones}</div>
    <div class="stat-label">Reproducciones</div>
  </div>
</div>

<!-- Tabla -->
<table class="modern-table">
  <thead>
    <tr>
      <th>#</th>
      <th>Nombre</th>
      <th>Descripción</th>
      <th>Duración</th>
      <th>▶ Reprod.</th>
      <th>Estado</th>
      <th>Archivo</th>
      <th>Acciones</th>
    </tr>
  </thead>
  <tbody id="tbody-canciones-${id_album}">
    ${canciones.map((cancion, index) => {
      const estadoActual = cancion.estado || 'activo'
      const esActivo = estadoActual === 'activo'

      return `
        <tr id="cancion-row-${cancion.id_cancion}" class="cancion-fila" data-nombre="${cancion.nombre.toLowerCase()}" data-estado="${estadoActual}">
          <td class="col-num">${index + 1}</td>
          <td><input type="text" id="nombre-${cancion.id_cancion}" value="${cancion.nombre}" class="song-input" title="${cancion.nombre}"></td>
          <td><input type="text" id="descrip-${cancion.id_cancion}" value="${cancion.descrip || ""}" placeholder="Sin descripción..." class="song-input"></td>
          <td><input type="text" id="duracion-${cancion.id_cancion}" value="${cancion.duracion}" pattern="[0-5][0-9]:[0-5][0-9]" class="song-input duracion-input"></td>
          <td><span class="reprod-count">${cancion.n_reproduccion || 0}</span></td>
          <td><span class="badge ${esActivo ? 'badge-active' : 'badge-disabled'}">${esActivo ? '✅ Activo' : '🚫 Deshabilitado'}</span></td>
          <td>
            <div class="upload-zone-modern" id="upload-admin-${cancion.id_cancion}">
              <input type="file" id="file-admin-${cancion.id_cancion}" accept="audio/*" hidden>
              <input type="hidden" id="path-${cancion.id_cancion}" value="${cancion.cancion_path}">
              <p class="upload-label">🎵 Audio Cargado</p>
              <p class="upload-hint">Click para cambiar</p>
              <div id="progress-admin-${cancion.id_cancion}" class="upload-progress" style="display: none;">
                <div id="progress-bar-admin-${cancion.id_cancion}" class="upload-progress-bar"></div>
              </div>
            </div>
          </td>
          <td>
            <div class="acciones-btns">
              <button onclick="guardarCancion('${cancion.id_cancion}')" class="btn-modern btn-save">💾 Guardar</button>
              <button onclick="toggleEstadoCancion('${cancion.id_cancion}', '${id_album}', '${estadoActual}')" class="btn-modern btn-toggle ${esActivo ? '' : 'activate'}">${esActivo ? '🚫 Deshab.' : '✅ Activar'}</button>
            </div>
          </td>
        </tr>
      `
    }).join("")}
  </tbody>
</table>

  `
  
  // Configurar uploads
  setTimeout(() => {
    inicializarUploadsAdmin(canciones)
  }, 100)
}
// ✅ NUEVA FUNCIÓN: Configurar upload de canciones en vista de álbum
function setupCancionUploadAdmin(cancionId, urlActual) {
  console.log(`🎵 Configurando upload admin para canción ${cancionId}`)
  
  const uploadZone = document.getElementById(`upload-admin-${cancionId}`)
  const fileInput = document.getElementById(`file-admin-${cancionId}`)
  const pathInput = document.getElementById(`path-${cancionId}`)
  const progressBar = document.getElementById(`progress-admin-${cancionId}`)
  const progressFill = document.getElementById(`progress-bar-admin-${cancionId}`)
  
  if (!uploadZone || !fileInput) {
    console.error(`❌ No se encontraron elementos para canción ${cancionId}`)
    return
  }
  
  // Click en zona
  uploadZone.addEventListener("click", (e) => {

    fileInput.click()
  })
  
  // Drag & Drop
  uploadZone.addEventListener("dragover", (e) => {
   e.preventDefault()   
  e.stopPropagation()
    uploadZone.style.borderColor = "#27ae60"
    uploadZone.style.background = "#d5f4e6"
  })
  
  uploadZone.addEventListener("dragleave", (e) => {
  e.preventDefault()   
  e.stopPropagation()
    uploadZone.style.borderColor = "#3498db"
    uploadZone.style.background = "#f8f9fa"
  })
  
  uploadZone.addEventListener("drop", (e) => {
  e.preventDefault()   
  e.stopPropagation()
    uploadZone.style.borderColor = "#3498db"
    uploadZone.style.background = "#f8f9fa"
    
    if (e.dataTransfer.files.length > 0) {
      handleCancionUploadAdmin(e.dataTransfer.files[0], cancionId, urlActual)
    }
  })
  
  // Selección de archivo
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleCancionUploadAdmin(e.target.files[0], cancionId, urlActual)
    }
  })
  
  async function handleCancionUploadAdmin(file, cancionId, urlAnterior) {
    console.log(`🚀 Subiendo nueva canción para ${cancionId}`)
    
    if (!file.type.startsWith("audio/")) {
      alert("❌ Por favor selecciona un archivo de audio")
      return
    }
    
    if (file.size > 50 * 1024 * 1024) {
      alert("❌ El archivo no puede superar 50MB")
      return
    }
    
    if (!cloudinaryConfig) {
      alert("❌ Cloudinary no está configurado")
      return
    }
    
    if (progressBar) progressBar.style.display = "block"
    if (progressFill) progressFill.style.width = "0%"
    
    uploadZone.innerHTML = '<p style="color: #3498db; margin: 10px 0;">⏳ Subiendo audio...</p>'
    
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", cloudinaryConfig.uploadPresetSongs)
      
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && progressFill) {
          const percentComplete = (e.loaded / e.total) * 100
          progressFill.style.width = percentComplete + "%"
        }
      })
      
      xhr.addEventListener("load", async () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          const cloudinaryUrl = response.secure_url
          
          // Actualizar input oculto
          pathInput.value = cloudinaryUrl
          
          // Eliminar archivo anterior de Cloudinary
          if (urlAnterior && urlAnterior !== cloudinaryUrl) {
            console.log(`🗑️ Eliminando archivo anterior: ${urlAnterior}`)
            await eliminarDeCloudinary(urlAnterior, "video")
          }
          
          // Actualizar UI
          uploadZone.innerHTML = `
            <p style="margin: 0; font-size: 12px; color: #27ae60;">✅ Nuevo audio subido</p>
            <p style="margin: 5px 0 0; font-size: 11px; color: #7f8c8d;">Click para cambiar</p>
          `
          
          if (progressBar) progressBar.style.display = "none"
          
          console.log(`✅ Canción ${cancionId} actualizada: ${cloudinaryUrl}`)
          alert("✅ Audio subido. Haz click en 'Guardar' para confirmar los cambios.")
          
        } else {
          throw new Error(`Error ${xhr.status}`)
        }
      })
      
      xhr.addEventListener("error", () => {
        throw new Error("Error de red")
      })
      
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/video/upload`
      xhr.open("POST", uploadUrl)
      xhr.send(formData)
      
    } catch (error) {
      console.error(`❌ Error:`, error)
      alert("❌ Error al subir el archivo")
      uploadZone.innerHTML = `
        <p style="margin: 0; font-size: 12px; color: #7f8c8d;">🎵 Click para subir audio</p>
        <p style="margin: 5px 0 0; font-size: 11px; color: #95a5a6;">MP3, WAV, FLAC - Máx 50MB</p>
      `
      if (progressBar) progressBar.style.display = "none"
    }
  }
}
  window.filtrarCancionesAlbum = (id_album) => {
    const busqueda = document.getElementById(`buscar-cancion-${id_album}`)?.value.toLowerCase().trim() || ""
    const filtroEstado = document.getElementById(`filtro-estado-cancion-${id_album}`)?.value || ""
    
    const filas = document.querySelectorAll(`#tbody-canciones-${id_album} .cancion-fila`)
    
    let visibles = 0
    
    filas.forEach(fila => {
      const nombre = fila.dataset.nombre
      const estado = fila.dataset.estado
      
      let mostrar = true
      
      if (busqueda && !nombre.includes(busqueda)) {
        mostrar = false
      }
      
      if (filtroEstado && estado !== filtroEstado) {
        mostrar = false
      }
      
      fila.style.display = mostrar ? '' : 'none'
      if (mostrar) visibles++
    })
    
    console.log(`🔍 Mostrando ${visibles} de ${filas.length} canciones`)
  }

  window.guardarCancion = async (id_cancion) => {
  console.log("💾 Guardando canción:", id_cancion)
  
  const nombre = document.getElementById(`nombre-${id_cancion}`)?.value.trim()
  const descrip = document.getElementById(`descrip-${id_cancion}`)?.value.trim()
  const duracion = document.getElementById(`duracion-${id_cancion}`)?.value.trim()
  const cancion_path = document.getElementById(`path-${id_cancion}`)?.value.trim()

  console.log("📋 Datos a guardar:", { nombre, descrip, duracion, cancion_path })

  // ✅ VALIDACIONES CORREGIDAS
  if (!nombre) {
    alert("❌ El nombre de la canción es obligatorio")
    return
  }

  if (!duracion) {
    alert("❌ La duración es obligatoria")
    return
  }

  if (!cancion_path) {
    alert("❌ Debe subir un archivo de audio")
    return
  }

  const duracionRegex = /^[0-5][0-9]:[0-5][0-9]$/
  if (!duracionRegex.test(duracion)) {
    alert("❌ Duración inválida. Use formato mm:ss (ejemplo: 03:45)")
    return
  }

  if (duracion === "00:00") {
    alert("❌ La duración no puede ser 00:00")
    return
  }

  if (!cancion_path.startsWith("http://") && !cancion_path.startsWith("https://")) {
    alert("❌ La URL del archivo debe comenzar con http:// o https://")
    return
  }

  try {
    const resp = await fetch(`/api/canciones/actualizar`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_cancion: id_cancion,
        nombre,
        descrip,
        duracion,
        cancion_path,
      }),
    })

    const data = await resp.json()

    if (resp.ok) {
      alert("✅ Canción actualizada correctamente")
      
      // Actualizar cache local
      for (let album_id in cancionesPorAlbum) {
        const index = cancionesPorAlbum[album_id].findIndex(c => c.id_cancion === id_cancion)
        if (index !== -1) {
          cancionesPorAlbum[album_id][index].nombre = nombre
          cancionesPorAlbum[album_id][index].descrip = descrip
          cancionesPorAlbum[album_id][index].duracion = duracion
          cancionesPorAlbum[album_id][index].cancion_path = cancion_path
        }
      }
    } else {
      alert("❌ Error: " + (data.error || "Error desconocido"))
    }
  } catch (error) {
    console.error("❌ Error:", error)
    alert("❌ Error de conexión")
  }
}

  window.toggleEstadoCancion = async (id_cancion, id_album, estadoActual) => {
    console.log(`🔄 Toggle estado canción ${id_cancion} desde "${estadoActual}"`)
    
    const nuevoEstado = estadoActual === 'activo' ? 'deshabilitado' : 'activo'
    const accion = nuevoEstado === 'activo' ? 'activar' : 'deshabilitar'
    
    const confirmar = confirm(`¿Deseas ${accion} esta canción?`)

    if (!confirmar) return

    try {
      const resp = await fetch(`/api/canciones/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          id_cancion: id_cancion,
          estado: nuevoEstado
        }),
      })

      const data = await resp.json()

      if (resp.ok) {
        alert(`✅ Canción ${nuevoEstado === 'activo' ? 'activada' : 'deshabilitada'}`)
        
        if (cancionesPorAlbum[id_album]) {
          const index = cancionesPorAlbum[id_album].findIndex(c => c.id_cancion === id_cancion)
          if (index !== -1) {
            cancionesPorAlbum[id_album][index].estado = nuevoEstado
          }
        }
        
        delete cancionesPorAlbum[id_album]
        await cargarCancionesAlbum(id_album)
      } else {
        alert("❌ Error: " + (data.error || "Error desconocido"))
      }
    } catch (error) {
      console.error("❌ Error:", error)
      alert("❌ Error de conexión")
    }
  }

  window.editarAlbum = async (id_album) => {
    console.log("✏️ Editando álbum:", id_album)
    
    const album = todosLosAlbums.find((a) => a.id_album === id_album)

    if (!album) {
      alert("❌ Álbum no encontrado")
      return
    }

    // 🔒 Activar modo edición
    modoEdicion = true
    albumEditandoId = id_album

    document.querySelector('.albums_gestion').scrollIntoView({ behavior: 'smooth' })

    if ($ && $.fn.select2 && $('#banda').hasClass('select2-hidden-accessible')) {
      $('#banda').select2('destroy')
    }

    document.getElementById('nombre-album').value = album.nombre_album
    document.getElementById('direccion-caratula').value = album.caratula_dir
    document.getElementById('descripcion-album').value = album.descrip || ''
    const date = new Date(album.fecha_lanza);
    const fechaISO=date.toISOString().split('T')[0];
    document.getElementById('fecha-album').value = fechaISO
    document.getElementById('banda').value = album.id_banda

    const previewImg = document.getElementById('preview-img-caratula')
    const preview = document.getElementById('preview-caratula')
    if (previewImg && preview) {
      previewImg.src = album.caratula_dir
      preview.style.display = 'block'
    }

    if ($ && $.fn.select2) {
      $('#banda').select2({
        placeholder: 'Buscar Banda...',
        allowClear: true,
        width: '100%'
      })
      $('#banda').val(album.id_banda).trigger('change')
    }

    const form = document.querySelector('.albums_gestion')
    const submitBtn = form.querySelector('button[type="submit"]')
    
    form.dataset.editandoId = id_album

    submitBtn.textContent = '💾 Actualizar álbum'
    submitBtn.style.background = 'linear-gradient(45deg, #f39c12, #e67e22)'

    const nuevoHandler = async (e) => {
      e.preventDefault()
      await actualizarAlbum(id_album)
    }

    form.removeEventListener('submit', nuevoHandler)
    form.addEventListener('submit', nuevoHandler)

    let cancelBtn = form.querySelector('.btn-cancelar-edicion')
    if (!cancelBtn) {
      cancelBtn = document.createElement('button')
      cancelBtn.type = 'button'
      cancelBtn.className = 'btn-cancelar-edicion'
      cancelBtn.textContent = '❌ Cancelar edición'
      cancelBtn.style.cssText = 'margin-left: 10px; padding: 12px 25px; background: #95a5a6; color: white; border: none; border-radius: 5px; cursor: pointer;'
      submitBtn.parentNode.insertBefore(cancelBtn, submitBtn.nextSibling)

      cancelBtn.addEventListener('click', async () => {
        if (confirm('¿Cancelar edición? Se eliminarán los archivos subidos que no se hayan guardado.')) {
          await limpiarArchivosTemporales()
          location.reload()
        }
      })
    }

    await cargarCancionesParaEdicion(id_album)
  }

  async function actualizarAlbum(id_album) {
    console.log("💾 Actualizando álbum:", id_album)

    const nombre_album = document.getElementById('nombre-album')?.value?.trim() || ""
    const caratula_dir = document.getElementById('direccion-caratula')?.value?.trim() || ""
    const descrip = document.getElementById('descripcion-album')?.value?.trim() || ""
    const fecha_lanza = document.getElementById('fecha-album')?.value || ""
    const selectElement = document.getElementById('banda')
    let id_banda_str = selectElement?.value || ""

    if (!nombre_album || !caratula_dir || !fecha_lanza || !id_banda_str) {
      alert("❌ Todos los campos son obligatorios")
      return
    }

    const id_banda = parseInt(id_banda_str, 10)
    if (isNaN(id_banda) || id_banda <= 0) {
      alert("❌ Selecciona una banda válida")
      return
    }

    const album = {
      id_album,
      nombre_album,
      caratula_dir,
      descrip,
      fecha_lanza,
      id_banda,
    }

    const canciones = recolectar_canciones_con_id()

    if (canciones === null) {
      return
    }

    if (canciones.length === 0) {
      alert("❌ Debes tener al menos una canción")
      return
    }

    const payload = { album, canciones }

    console.log("📤 Payload actualización:", JSON.stringify(payload, null, 2))

    try {
      const resp = await fetch(`/api/actualizar_album_completo`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await resp.json()
      console.log("📥 Respuesta:", data)

      if (resp.ok) {
        alert(data.mensaje || "¡Álbum actualizado exitosamente!")
        
        // ✅ Marcar archivos como guardados
        uploadedFiles.canciones = Object.fromEntries(
          Object.entries(uploadedFiles.canciones).map(([id, archivo]) => [
            id,
            { ...archivo, nuevo: false }
          ])
        )
        if (uploadedFiles.caratula) {
          uploadedFiles.caratula.nuevo = false
        }
        
        modoEdicion = false
        albumEditandoId = null
        
        location.reload()
      } else {
        alert("❌ Error: " + (data.error || "No se pudo actualizar"))
      }
    } catch (error) {
      console.error("❌ Error:", error)
      alert("❌ Error de conexión con el servidor")
    }
  }

  function recolectar_canciones_con_id() {
    const songBloques = document.querySelectorAll(".cancion-item")
    const songs = []
    const errores = []

    songBloques.forEach((bloque, index) => {
      const id = bloque.id.split("-")[1]
      const id_cancion = bloque.dataset.idCancion || ""
      const nombre = document.getElementById(`nombre-cancion-${id}`)?.value?.trim() || ""
      const descrip = document.getElementById(`descripcion-cancion-${id}`)?.value?.trim() || ""
      const duracion = document.getElementById(`duracion-cancion-${id}`)?.value?.trim() || ""
      const cancion_path = document.getElementById(`path-cancion-${id}`)?.value?.trim() || ""

      if (!nombre || !duracion || !cancion_path) {
        errores.push(`Canción ${index + 1}: Faltan campos obligatorios`)
        return
      }

      const duracionRegex = /^[0-5][0-9]:[0-5][0-9]$/
      if (!duracionRegex.test(duracion)) {
        errores.push(`Canción ${index + 1} ("${nombre}"): Duración inválida`)
        return
      }

      if (duracion === "00:00") {
        errores.push(`Canción ${index + 1} ("${nombre}"): La duración no puede ser 00:00`)
        return
      }

      if (!cancion_path.startsWith("http://") && !cancion_path.startsWith("https://")) {
        errores.push(`Canción ${index + 1} ("${nombre}"): URL debe comenzar con http:// o https://`)
        return
      }

      const cancion = {
        nombre,
        descrip,
        duracion,
        cancion_path,
      }

      if (id_cancion) {
        cancion.id_cancion = id_cancion
      }

      songs.push(cancion)
    })

    if (errores.length > 0) {
      alert("❌ Errores en las canciones:\n\n" + errores.join("\n"))
      return null
    }

    console.log(`📦 Canciones recolectadas para actualización: ${songs.length}`)
    return songs
  }

  async function cargarCancionesParaEdicion(id_album) {
    try {
      const resp = await fetch(`/api/albums/canciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_album: id_album }),
      })

      if (resp.ok) {
        const canciones = await resp.json()
        
        const cancionContainer = document.querySelector('.cancion-container')
        if (cancionContainer && canciones.length > 0) {
          cancionContainer.innerHTML = '<button type="button" class="btn-añadir-cancion btn-success">+ Agregar canción</button>'
          añadirCanciones()

          canciones.forEach(cancion => {
            sonContador++
            const htmlContent = `
              <div class="form-grid cancion-item" id="cancion-${sonContador}" data-id-cancion="${cancion.id_cancion}" style="border: 1px solid #ddd; padding: 15px; margin-top: 15px; border-radius: 8px; background: #f9f9f9;">
                <div class="form-group">
                  <label>Nombre de la canción</label>
                  <input type="text" id="nombre-cancion-${sonContador}" value="${cancion.nombre}" placeholder="Título de la canción" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                  <label>Descripción de la canción</label>
                  <input type="text" id="descripcion-cancion-${sonContador}" value="${cancion.descrip || ''}" placeholder="Descripción" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                  <label>Duración (mm:ss)</label>
                  <input type="text" id="duracion-cancion-${sonContador}" value="${cancion.duracion}" placeholder="03:45" pattern="[0-5][0-9]:[0-5][0-9]" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="form-group">
                  <label>🎵 Archivo de música</label>
                  <div class="upload-zone-cancion" id="upload-cancion-${sonContador}" style="border: 2px dashed #95a5a6; padding: 20px; text-align: center; border-radius: 6px; background: #fafafa; cursor: pointer;">
                    <input type="file" id="archivo-cancion-${sonContador}" accept="audio/*" style="display: none;">
                    <p style="margin: 0; font-size: 14px;">📁 Haz clic o arrastra para cambiar el archivo</p>
                    <p style="margin: 5px 0 0 0; color: #7f8c8d; font-size: 12px;">MP3, WAV, FLAC - Máx 50MB</p>
                    <div class="upload-progress-cancion" id="progress-cancion-${sonContador}" style="display: none; margin-top: 10px; width: 100%; height: 6px; background: #ecf0f1; border-radius: 3px;">
                      <div class="upload-progress-bar-cancion" style="height: 100%; background: #3498db; width: 0%; transition: width 0.3s;"></div>
                    </div>
                    <div id="preview-cancion-${sonContador}" style="margin-top: 10px;">
                      <p style="color: #3498db; font-size: 12px;">📎 Archivo actual cargado</p>
                    </div>
                  </div>
                  <input type="hidden" id="path-cancion-${sonContador}" value="${cancion.cancion_path}" required>
                </div>
                <div class="form-group">
                  <button type="button" class="btn-eliminar" onclick="eliminarCancion(${sonContador})" style="padding: 10px 20px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">🗑️ Eliminar canción</button>
                </div>
              </div>
            `
            cancionContainer.insertAdjacentHTML('beforeend', htmlContent)
            
            // ⚙️ Configurar upload con URL existente
            setTimeout(() => {
              setupSongUpload(sonContador, cancion.cancion_path)
            }, 100)
          })
        }
      }
    } catch (error) {
      console.error("❌ Error al cargar canciones para edición:", error)
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
        mensaje += `⚠️ No se pudieron cargar las canciones`
      }
    } catch (error) {
      console.error("❌ Error:", error)
      mensaje += `⚠️ Error al cargar canciones`
    }

    alert(mensaje)
  }

  window.limpiarFormularioAlbum = async () => {
    if (!confirm("¿Deseas cancelar? Se eliminarán los archivos subidos.")) {
      return
    }
    
    await limpiarArchivosTemporales()
    
    modoEdicion = false
    albumEditandoId = null
    uploadedFiles = { caratula: null, canciones: {} }
    
    location.reload()
  }
  // ============================================
// 🎵 FUNCIONES PARA UPLOAD DE CANCIONES EN VISTA DE ÁLBUM
// ============================================

// Configurar upload de canciones después de renderizar
function inicializarUploadsAdmin(canciones) {
  canciones.forEach(cancion => {
    setupCancionUploadAdmin(cancion.id_cancion, cancion.cancion_path)
  })
}

// Configurar upload para una canción específica
function setupCancionUploadAdmin(cancionId, urlActual) {
  console.log(`🎵 Configurando upload para canción ${cancionId}`)
  
  const uploadZone = document.getElementById(`upload-admin-${cancionId}`)
  const fileInput = document.getElementById(`file-admin-${cancionId}`)
  const pathInput = document.getElementById(`path-${cancionId}`)
  const progressBar = document.getElementById(`progress-admin-${cancionId}`)
  const progressFill = document.getElementById(`progress-bar-admin-${cancionId}`)
  
  if (!uploadZone || !fileInput) {
    console.error(`❌ No se encontraron elementos para canción ${cancionId}`)
    return
  }
  
  // Click en zona
  uploadZone.addEventListener("click", (e) => {
   
    fileInput.click()
  })
  
  // Drag & Drop
  uploadZone.addEventListener("dragover", (e) => {
  e.preventDefault() 
  e.stopPropagation()
    uploadZone.style.borderColor = "#27ae60"
    uploadZone.style.background = "#d5f4e6"
  })
  
  uploadZone.addEventListener("dragleave", (e) => {
  e.preventDefault()
  e.stopPropagation()
    uploadZone.style.borderColor = "#3498db"
    uploadZone.style.background = "#f8f9fa"
  })
  
  uploadZone.addEventListener("drop", (e) => {
  e.preventDefault()  
  e.stopPropagation()
    uploadZone.style.borderColor = "#3498db"
    uploadZone.style.background = "#f8f9fa"
    
    if (e.dataTransfer.files.length > 0) {
      handleCancionUploadAdmin(e.dataTransfer.files[0], cancionId, urlActual)
    }
  })
  
  // Selección de archivo
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleCancionUploadAdmin(e.target.files[0], cancionId, urlActual)
    }
  })
}

// Manejar la subida de archivo
async function handleCancionUploadAdmin(file, cancionId, urlAnterior) {
  console.log(`🚀 Subiendo nueva canción para ${cancionId}`)
  
  if (!file.type.startsWith("audio/")) {
    alert("❌ Por favor selecciona un archivo de audio")
    return
  }
  
  if (file.size > 50 * 1024 * 1024) {
    alert("❌ El archivo no puede superar 50MB")
    return
  }
  
  if (!cloudinaryConfig) {
    alert("❌ Cloudinary no está configurado. Recarga la página.")
    return
  }
  
  const uploadZone = document.getElementById(`upload-admin-${cancionId}`)
  const pathInput = document.getElementById(`path-${cancionId}`)
  const progressBar = document.getElementById(`progress-admin-${cancionId}`)
  const progressFill = document.getElementById(`progress-bar-admin-${cancionId}`)
  
  if (progressBar) progressBar.style.display = "block"
  if (progressFill) progressFill.style.width = "0%"
  
  uploadZone.innerHTML = `
    <p style="color: #3498db; margin: 8px 0; font-size: 11px;">⏳ Subiendo...</p>
    <div id="progress-admin-${cancionId}" style="display: block; margin-top: 6px; width: 100%; height: 3px; background: #ecf0f1; border-radius: 2px; overflow: hidden;">
      <div id="progress-bar-admin-${cancionId}" style="height: 100%; background: linear-gradient(90deg, #3498db, #2ecc71); width: 0%; transition: width 0.3s;"></div>
    </div>
  `
  
  try {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", cloudinaryConfig.uploadPresetSongs)
    
    const xhr = new XMLHttpRequest()
    
    // Actualizar barra de progreso
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100
        const newProgressFill = document.getElementById(`progress-bar-admin-${cancionId}`)
        if (newProgressFill) {
          newProgressFill.style.width = percentComplete + "%"
        }
      }
    })
    
    xhr.addEventListener("load", async () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        const cloudinaryUrl = response.secure_url
        
        // Actualizar input oculto
        pathInput.value = cloudinaryUrl
        
        // Eliminar archivo anterior de Cloudinary (si existe y es diferente)
        if (urlAnterior && urlAnterior !== cloudinaryUrl && urlAnterior.includes('cloudinary.com')) {
          console.log(`🗑️ Eliminando archivo anterior: ${urlAnterior}`)
          
          try {
            const respDelete = await fetch("/api/cloudinary/cleanup", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                urls: [urlAnterior],
                resource_types: ["video"]
              })
            })
            
            if (respDelete.ok) {
              console.log("✅ Archivo anterior eliminado")
            }
          } catch (error) {
            console.error("⚠️ Error al eliminar archivo anterior:", error)
          }
        }
        
        // Actualizar UI
        const newUploadZone = document.getElementById(`upload-admin-${cancionId}`)
        if (newUploadZone) {
          newUploadZone.innerHTML = `
            <p style="margin: 0; font-size: 11px; color: #27ae60;">✅ Nuevo audio subido</p>
            <p style="margin: 3px 0 0; font-size: 10px; color: #7f8c8d;">Click para cambiar</p>
          `
        }
        
        console.log(`✅ Canción ${cancionId} actualizada: ${cloudinaryUrl}`)
        alert("✅ Audio subido correctamente.\n\n⚠️ IMPORTANTE: Haz click en '💾 Guardar' para confirmar los cambios.")
        
      } else {
        throw new Error(`Error ${xhr.status}`)
      }
    })
    
    xhr.addEventListener("error", () => {
      throw new Error("Error de red")
    })
    
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/video/upload`
    xhr.open("POST", uploadUrl)
    xhr.send(formData)
    
  } catch (error) {
    console.error(`❌ Error:`, error)
    alert("❌ Error al subir el archivo: " + error.message)
    
    // Restaurar UI
    uploadZone.innerHTML = `
      <p style="margin: 0; font-size: 11px; color: #7f8c8d;">🎵 Click para subir audio</p>
      <p style="margin: 3px 0 0; font-size: 10px; color: #95a5a6;">MP3, WAV, FLAC - Máx 50MB</p>
    `
  }
}
// ✅ MEJORADO: Detecta si estás creando/editando álbum
window.addEventListener('beforeunload', (e) => {
  const archivosALimpiar = []
  
  // Solo limpiar si hay archivos NUEVOS no guardados
  const hayCaratulaNueva = uploadedFilesAlbum.caratula && uploadedFilesAlbum.caratula.nuevo === true
  const hayCancionesNuevas = Object.values(uploadedFilesAlbum.canciones).some(c => c && c.nuevo === true)
  
  // Verificar si estamos en modo edición/creación
  const enFormulario = document.getElementById('albumForm') !== null
  const modalAbierto = document.getElementById('albumFormModal')?.style.display === 'flex'
  
  if (!enFormulario && !modalAbierto) {
    // No estamos en formulario, no hay nada que limpiar
    return
  }
  
  if (!hayCaratulaNueva && !hayCancionesNuevas) {
    // No hay archivos nuevos, permitir salida
    return
  }
  
  // Recolectar archivos a limpiar
  if (hayCaratulaNueva) {
    archivosALimpiar.push({
      url: uploadedFilesAlbum.caratula.url,
      type: "image"
    })
    console.log("🗑️ Carátula marcada para limpieza:", uploadedFilesAlbum.caratula.url)
  }
  
  Object.entries(uploadedFilesAlbum.canciones).forEach(([id, cancion]) => {
    if (cancion && cancion.url && cancion.nuevo === true) {
      archivosALimpiar.push({
        url: cancion.url,
        type: "video"
      })
      console.log("🗑️ Canción marcada para limpieza:", cancion.url)
    }
  })
  
  if (archivosALimpiar.length > 0) {
    console.log(`🗑️ Limpiando ${archivosALimpiar.length} archivos sin guardar...`)
    
    const payload = JSON.stringify({
      urls: archivosALimpiar.map(f => f.url),
      resource_types: archivosALimpiar.map(f => f.type)
    })
    
    const blob = new Blob([payload], { type: 'application/json' })
    const enviado = navigator.sendBeacon(`${state.baseUrl}/api/cloudinary/cleanup-async`, blob)
    
    console.log(enviado ? '✅ Limpieza enviada' : '⚠️ Error al enviar limpieza')
    
    e.preventDefault()
    e.returnValue = '¿Seguro que quieres salir? Los archivos subidos se eliminarán.'
    return e.returnValue
  }
})
})