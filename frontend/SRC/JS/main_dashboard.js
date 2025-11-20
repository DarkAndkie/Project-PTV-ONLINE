// ========================================
// ESTADO GLOBAL
// ========================================
// ========================================
// VARIABLES GLOBALES PARA ÁLBUMES
// ========================================
let elements = {}
let albumEditandoId = null
let uploadedFilesAlbum = { caratula: null, canciones: {} }
let contadorCancionesBanda = 0
let cloudinaryConfig = null
const state = {

  token: localStorage.getItem("token"),
  userRole: localStorage.getItem("tipo_user") || "finalusuario",
  userId: localStorage.getItem("id_user"),
  currentSong: null,
  isPlaying: false,
  songs: [],
  playlists: [],
  currentPlaylist: null,
  queue: [],
  queueIndex: 0,
  baseUrl: window.location.origin,
  searchFilter: "all",
  currentAlbumSongs: [],
  shuffleMode: false,
  originalQueue: [],
}
console.log(`id usuario ${state.userId}`);



// ========================================
// FUNCIONES GLOBALES - DEBEN ESTAR FUERA DEL DOMContentLoaded
// ========================================
async function cargarConfigCloudinary() {
  if (cloudinaryConfig) return cloudinaryConfig
  
  try {
    const resp = await fetch(`${window.location.origin}/api/cloudinary-config`)
    if (resp.ok) {
      cloudinaryConfig = await resp.json()
      console.log("☁️ Cloudinary configurado:", cloudinaryConfig)
      return cloudinaryConfig
    }
  } catch (error) {
    console.error("❌ Error al cargar configuración de Cloudinary:", error)
  }
  return null
}

// ========================================
// GESTIÓN DE ÁLBUMES (SOLO BANDAS)
// ========================================
// ========================================
// GESTIÓN DE ÁLBUMES (SOLO BANDAS) - MEJORADO
// ========================================


// ========================================
// CARGAR CONFIGURACIÓN DE CLOUDINARY
// ========================================

// ========================================
// LIMPIEZA DE ARCHIVOS TEMPORALES
// ========================================
async function limpiarArchivosTemporales() {
  const urlsALimpiar = []
  
  if (uploadedFilesAlbum.caratula && uploadedFilesAlbum.caratula.nuevo) {
    urlsALimpiar.push({
      url: uploadedFilesAlbum.caratula.url,
      type: "image"
    })
  }
  
  Object.values(uploadedFilesAlbum.canciones).forEach(cancion => {
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
      const resp = await fetch(`${state.baseUrl}/api/cloudinary/cleanup`, {
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

// ========================================
// CARGAR ÁLBUMES DE LA BANDA
// ========================================
// ========================================
// CONFIGURAR UPLOAD DE CARÁTULA
// ========================================
async function setupCaratulaBandaUpload() {
  console.log("🔧 Configurando zona de subida de carátula...")
  
  const uploadZone = document.getElementById("upload-caratula-banda")
  const fileInput = document.getElementById("caratula-banda-input")
  const preview = document.getElementById("preview-caratula-banda")
  const previewImg = document.getElementById("preview-img-caratula-banda")
  const urlInput = document.getElementById("caratula-url-hidden")
  const progressBar = document.getElementById("progress-caratula-banda")
  const progressFill = document.getElementById("progress-bar-caratula-banda")
  
  if (!uploadZone || !fileInput) {
    console.error("❌ No se encontraron elementos de carátula")
    return
  }
  
  console.log("✅ Elementos encontrados, configurando eventos...")
  
  // Click en zona de upload - CORREGIDO
  uploadZone.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log("🖱️ Click detectado en zona de carátula")
    fileInput.click()
  })
  
  // Drag & Drop - CORREGIDO
  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault()
    e.stopPropagation()
    uploadZone.style.borderColor = "var(--primary)"
    uploadZone.style.background = "rgba(26, 188, 156, 0.1)"
  })
  
  uploadZone.addEventListener("dragleave", (e) => {
    e.preventDefault()
    e.stopPropagation()
    uploadZone.style.borderColor = "var(--border-color)"
    uploadZone.style.background = "rgba(26, 188, 156, 0.05)"
  })
  
  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault()
    e.stopPropagation()
    uploadZone.style.borderColor = "var(--border-color)"
    uploadZone.style.background = "rgba(26, 188, 156, 0.05)"
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleCaratulaUpload(files[0])
    }
  })
  
  // Selección de archivo
  fileInput.addEventListener("change", (e) => {
    console.log("📁 Archivo seleccionado via input")
    const files = e.target.files
    if (files && files.length > 0) {
      handleCaratulaUpload(files[0])
    }
  })
  
  async function handleCaratulaUpload(file) {
    console.log("🚀 Subiendo carátula:", file.name)
    
    if (!file.type.startsWith("image/")) {
      alert("❌ Selecciona una imagen válida")
      return
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert("❌ La imagen no puede superar 10MB")
      return
    }
    
    // 🗑️ Eliminar carátula anterior si existe y es nueva
    if (uploadedFilesAlbum.caratula && uploadedFilesAlbum.caratula.nuevo) {
      await eliminarDeCloudinary(uploadedFilesAlbum.caratula.url, "image")
    }
    
    // Vista previa local
    const reader = new FileReader()
    reader.onload = (e) => {
      previewImg.src = e.target.result
      preview.style.display = "block"
    }
    reader.readAsDataURL(file)
    
    // Verificar configuración de Cloudinary
    if (!cloudinaryConfig) {
      alert("❌ Cloudinary no está configurado. Recarga la página.")
      return
    }
    
    // Mostrar barra de progreso
    if (progressBar) progressBar.style.display = "block"
    if (progressFill) progressFill.style.width = "0%"
    
    uploadZone.innerHTML = '<p style="color: var(--primary); margin: 20px 0;">⏳ Subiendo imagen...</p>'
    
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", cloudinaryConfig.uploadPresetCovers)
      
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
          
          urlInput.value = cloudinaryUrl
          previewImg.src = cloudinaryUrl
          preview.style.display = "block"
          if (progressBar) progressBar.style.display = "none"
          
          uploadedFilesAlbum.caratula = {
            url: cloudinaryUrl,
            publicId: response.public_id,
            nuevo: true
          }
          
          uploadZone.innerHTML = `
            <p style="margin: 0; font-size: 16px; color: var(--text-secondary);">✅ Imagen subida</p>
            <p style="margin: 8px 0 0; font-size: 12px; color: var(--text-secondary);">📁 Haz clic para cambiar</p>
            <img src="${cloudinaryUrl}" style="max-width: 150px; margin-top: 10px; border-radius: 8px; border: 2px solid var(--primary);">
          `
          
          console.log("✅ Carátula subida:", cloudinaryUrl)
        } else {
          throw new Error(`Error ${xhr.status}`)
        }
      })
      
      xhr.addEventListener("error", () => {
        throw new Error("Error de red")
      })
      
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`
      xhr.open("POST", uploadUrl)
      xhr.send(formData)
      
    } catch (error) {
      console.error("❌ Error:", error)
      alert("❌ Error al subir la carátula")
      uploadZone.innerHTML = `
        <p style="margin: 0; font-size: 16px; color: var(--text-secondary);">📁 Haz clic o arrastra una imagen</p>
        <p style="margin: 8px 0 0; font-size: 12px; color: var(--text-secondary);">JPG, PNG - Máx 10MB</p>
      `
      if (progressBar) progressBar.style.display = "none"
    }
  }
}

// ========================================
// CONFIGURAR UPLOAD DE CANCIÓN
// ========================================
function setupCancionUpload(cancionId, urlExistente = null) {
  console.log(`🎵 Configurando upload para canción ${cancionId}`)
  
  const uploadZone = document.getElementById(`upload-cancion-${cancionId}`)
  const fileInput = document.getElementById(`archivo-cancion-${cancionId}`)
  const pathInput = document.getElementById(`cancion-path-${cancionId}`)
  const progressBar = document.getElementById(`progress-cancion-${cancionId}`)
  const progressFill = document.getElementById(`progress-bar-cancion-${cancionId}`)
  const preview = document.getElementById(`preview-cancion-${cancionId}`)
  
  if (!uploadZone || !fileInput) {
    console.error(`❌ Faltan elementos para canción ${cancionId}`)
    return
  }
  
  // Si hay URL existente, guardarla
  if (urlExistente) {
    uploadedFilesAlbum.canciones[cancionId] = {
      url: urlExistente,
      nuevo: false,
      urlOriginal: urlExistente
    }
  }
  
  // Click en zona de upload
  uploadZone.addEventListener("click", (e) => {
    e.preventDefault()
    e.stopPropagation()
    console.log(`🖱️ Click en zona canción ${cancionId}`)
    fileInput.click()
  })
  
  // Drag & Drop
  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault()
    e.stopPropagation()
    uploadZone.style.borderColor = "var(--primary)"
    uploadZone.style.background = "rgba(26, 188, 156, 0.1)"
  })
  
  uploadZone.addEventListener("dragleave", (e) => {
    e.preventDefault()
    e.stopPropagation()
    uploadZone.style.borderColor = "var(--border-color)"
    uploadZone.style.background = "rgba(255, 255, 255, 0.02)"
  })
  
  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault()
    e.stopPropagation()
    uploadZone.style.borderColor = "var(--border-color)"
    uploadZone.style.background = "rgba(255, 255, 255, 0.02)"
    
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleSongUpload(files[0])
    }
  })
  
  // Selección de archivo
  fileInput.addEventListener("change", (e) => {
    console.log(`📁 Archivo seleccionado para canción ${cancionId}`)
    const files = e.target.files
    if (files && files.length > 0) {
      handleSongUpload(files[0])
    }
  })
  
  async function handleSongUpload(file) {
    console.log(`🚀 Subiendo canción ${cancionId}:`, file.name)
    
    if (!file.type.startsWith("audio/")) {
      alert("❌ Por favor selecciona un archivo de audio")
      return
    }
    
    if (file.size > 50 * 1024 * 1024) {
      alert("❌ El archivo no puede superar 50MB")
      return
    }
    
    // 🗑️ Eliminar archivo anterior si existe y es nuevo
    const archivoAnterior = uploadedFilesAlbum.canciones[cancionId]
    if (archivoAnterior && archivoAnterior.url && archivoAnterior.nuevo) {
      await eliminarDeCloudinary(archivoAnterior.url, "video")
    }
    
    // Verificar configuración de Cloudinary
    if (!cloudinaryConfig) {
      alert("❌ Cloudinary no está configurado. Recarga la página.")
      return
    }
    
    if (progressBar) progressBar.style.display = "block"
    if (progressFill) progressFill.style.width = "0%"
    
    uploadZone.innerHTML = '<p style="color: var(--primary); margin: 20px 0;">⏳ Subiendo audio...</p>'
    
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("upload_preset", cloudinaryConfig.uploadPresetSongs)
      
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable && progressFill) {
          const percentComplete = (e.loaded / e.total) * 100
          progressFill.style.width = percentComplete + "%"
          console.log(`📊 Canción ${cancionId}: ${percentComplete.toFixed(0)}%`)
        }
      })
      
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          const cloudinaryUrl = response.secure_url
          
          pathInput.value = cloudinaryUrl
          if (preview) preview.style.display = "block"
          if (progressBar) progressBar.style.display = "none"
          
          uploadedFilesAlbum.canciones[cancionId] = {
            url: cloudinaryUrl,
            publicId: response.public_id,
            nuevo: true,
            urlOriginal: archivoAnterior?.urlOriginal || null
          }
          
          uploadZone.innerHTML = `
            <p style="margin: 0; font-size: 14px; color: var(--primary);">✅ Audio subido correctamente</p>
            <p style="margin: 5px 0 0; font-size: 12px; color: var(--text-secondary);">📁 Haz clic para cambiar</p>
          `
          
          console.log(`✅ Canción ${cancionId} subida:`, cloudinaryUrl)
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
      console.error(`❌ Error al procesar canción ${cancionId}:`, error)
      alert("❌ Error al procesar el archivo")
      uploadZone.innerHTML = `
        <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">📁 Haz clic o arrastra un archivo</p>
        <p style="margin: 5px 0 0; font-size: 12px; color: var(--text-secondary);">MP3, WAV, FLAC - Máx 50MB</p>
      `
      if (progressBar) progressBar.style.display = "none"
    }
  }
}
// ========================================
// EDITAR ÁLBUM EXISTENTE
// ========================================
async function editarAlbumBanda(id_album) {
  console.log("✏️ Editando álbum:", id_album)
  
  // Cargar config de Cloudinary
  await cargarConfigCloudinary()
  
  if (!cloudinaryConfig) {
    alert("❌ Error al cargar configuración. Por favor recarga la página.")
    return
  }
  
  try {
    // Obtener datos del álbum
    const resp = await fetch(`${state.baseUrl}/api/albums_listar`, {
      headers: { Authorization: `Bearer ${state.token}` }
    })
    
    if (!resp.ok) throw new Error("Error al cargar álbumes")
    
    const albums = await resp.json()
    const album = albums.find(a => a.id_album === id_album)
    
    if (!album) {
      alert("❌ Álbum no encontrado")
      return
    }
    
    // Resetear variables
    albumEditandoId = id_album
    uploadedFilesAlbum = { caratula: null, canciones: {} }
    contadorCancionesBanda = 0
    
    // Crear modal con datos del álbum
    const modalHTML = `
      <div id="albumFormModal" class="modal" style="display: flex;">
        <div class="modal-content large-modal">
          <div class="modal-header">
            <h3 id="albumFormTitle">Editar Álbum</h3>
            <button class="modal-close" onclick="cerrarFormularioAlbum()">&times;</button>
          </div>
          <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
            <form id="albumForm" onsubmit="guardarAlbumBanda(event)">
              <input type="hidden" id="album-id-hidden" value="${album.id_album}">
              
              <div class="form-group">
                <label>Nombre del Álbum *</label>
                <input type="text" id="nombre-album-form" placeholder="Nombre del álbum" value="${album.nombre_album}" required>
              </div>
              
              <div class="form-group">
                <label>Descripción</label>
                <textarea id="descripcion-album-form" placeholder="Descripción del álbum" rows="3">${album.descrip || ''}</textarea>
              </div>
              
              <div class="form-group">
                <label>Fecha de Lanzamiento *</label>
                <input type="date" id="fecha-album-form" value="${new Date(album.fecha_lanza).toISOString().split('T')[0]}" required>
              </div>
              
              <div class="form-group">
                <label>Carátula del Álbum *</label>
                <div class="upload-zone" id="upload-caratula-banda" style="border: 2px dashed var(--border-color); padding: 30px; text-align: center; border-radius: 10px; cursor: pointer; background: rgba(26, 188, 156, 0.05); transition: all 0.3s ease;">
                  <input type="file" id="caratula-banda-input" accept="image/*" style="display: none;">
                  <p style="margin: 0; font-size: 16px; color: var(--text-secondary);">📁 Haz clic para cambiar la imagen</p>
                  <img src="${album.caratula_dir}" style="max-width: 200px; margin-top: 15px; border-radius: 8px; border: 2px solid var(--primary);">
                  <div id="preview-caratula-banda" style="display: none; margin-top: 15px;">
                    <img id="preview-img-caratula-banda" style="max-width: 200px; border-radius: 8px; border: 2px solid var(--primary);">
                  </div>
                  <div id="progress-caratula-banda" style="display: none; margin-top: 10px; width: 100%; height: 6px; background: #ecf0f1; border-radius: 3px;">
                    <div id="progress-bar-caratula-banda" style="height: 100%; background: var(--primary); width: 0%; transition: width 0.3s;"></div>
                  </div>
                </div>
                <input type="hidden" id="caratula-url-hidden" value="${album.caratula_dir}" required>
              </div>
              
              <div class="form-group">
                <label>Canciones *</label>
                <div id="cancionesContainer"></div>
                <button type="button" onclick="agregarCancionFormulario()" class="btn-secondary" style="margin-top: 10px; width: 100%;">+ Agregar Canción</button>
              </div>
              
              <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; padding-top: 20px; border-top: 1px solid var(--border-color); margin-top: 20px;">
                <button type="button" onclick="cerrarFormularioAlbum()" class="btn-secondary">Cancelar</button>
                <button type="submit" class="btn-primary">Actualizar Álbum</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `
    
    document.body.insertAdjacentHTML('beforeend', modalHTML)
    
    // Configurar upload de carátula
    requestAnimationFrame(() => {
      setupCaratulaBandaUpload()
      
      // Marcar carátula existente
      uploadedFilesAlbum.caratula = {
        url: album.caratula_dir,
        nuevo: false,
        urlOriginal: album.caratula_dir
      }
    })
    
    // Cargar canciones del álbum
    await cargarCancionesParaEdicion(id_album)
    
  } catch (error) {
    console.error("Error al editar álbum:", error)
    alert("❌ Error al cargar datos del álbum")
  }
}
async function cargarAlbumesBanda() {
  const grid = document.getElementById("albumsGrid")
  if (!grid) return

  grid.innerHTML = '<div class="loading-spinner">Cargando tus álbumes...</div>'

  try {
    const resp = await fetch(`${state.baseUrl}/api/albums_listar`, {
      headers: { Authorization: `Bearer ${state.token}` }
    })

    if (!resp.ok) throw new Error("Error al cargar álbumes")

    const todosAlbums = await resp.json()
    const misAlbums = todosAlbums.filter(a => a.id_banda === parseInt(state.userId))

    if (misAlbums.length === 0) {
      grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1; padding: 40px;">No tienes álbumes aún. ¡Crea tu primer álbum!</p>'
      return
    }

    renderizarAlbumesBanda(misAlbums)
  } catch (error) {
    console.error("Error:", error)
    grid.innerHTML = '<div class="loading-spinner" style="color: #e74c3c;">Error al cargar álbumes</div>'
  }
}

function renderizarAlbumesBanda(albums) {
  const grid = document.getElementById("albumsGrid")
  
  if (albums.length === 0) {
    grid.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1; padding: 40px;">No tienes álbumes aún. ¡Crea tu primer álbum!</p>'
    return
  }
  
  grid.innerHTML = albums.map(album => {
    const fecha = new Date(album.fecha_lanza).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    return `
      <div class="album-band-card" style="background: rgba(26, 188, 156, 0.05); border: 1px solid var(--border-color); border-radius: 12px; padding: 15px; transition: all 0.3s ease; display: flex; flex-direction: column; gap: 12px;">
        <img src="${album.caratula_dir}" alt="${album.nombre_album}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; border: 2px solid var(--border-color);">
        <div class="album-band-info" style="flex: 1;">
          <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; color: var(--text-primary);">${album.nombre_album}</h4>
          <p style="margin: 0 0 8px 0; color: var(--text-secondary); font-size: 0.85rem;">${fecha}</p>
          <span class="badge-estado ${album.estado}" style="padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; display: inline-block;">${album.estado}</span>
        </div>
        <div class="album-band-actions" style="display: flex; gap: 8px; margin-top: auto;">
          <button onclick="editarAlbumBanda('${album.id_album}')" class="btn-mini" style="flex: 1; padding: 8px 16px; background: rgba(26, 188, 156, 0.1); border: 1px solid var(--primary); color: var(--primary); border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.8rem;">✏️ Editar</button>
          <button onclick="showAlbumDetail('${album.id_album}')" class="btn-mini" style="flex: 1; padding: 8px 16px; background: rgba(26, 188, 156, 0.1); border: 1px solid var(--primary); color: var(--primary); border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.8rem;">🎵 Canciones</button>
        </div>
      </div>
    `
  }).join("")
}
// ========================================
// MODAL FORMULARIO ÁLBUM
// ========================================
async function mostrarFormularioAlbum() {
  // Cargar config de Cloudinary primero
  await cargarConfigCloudinary()
  
  if (!cloudinaryConfig) {
    alert("❌ Error al cargar configuración. Por favor recarga la página.")
    return
  }
  
  albumEditandoId = null
  uploadedFilesAlbum = { caratula: null, canciones: {} }
  contadorCancionesBanda = 0
  
  const modalHTML = `
    <div id="albumFormModal" class="modal" style="display: flex;">
      <div class="modal-content large-modal">
        <div class="modal-header">
          <h3 id="albumFormTitle">Crear Nuevo Álbum</h3>
          <button class="modal-close" onclick="cerrarFormularioAlbum()">&times;</button>
        </div>
        <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
          <form id="albumForm" onsubmit="guardarAlbumBanda(event)">
            <input type="hidden" id="album-id-hidden">
            
            <div class="form-group">
              <label>Nombre del Álbum *</label>
              <input type="text" id="nombre-album-form" placeholder="Nombre del álbum" required>
            </div>
            
            <div class="form-group">
              <label>Descripción</label>
              <textarea id="descripcion-album-form" placeholder="Descripción del álbum" rows="3"></textarea>
            </div>
            
            <div class="form-group">
              <label>Fecha de Lanzamiento *</label>
              <input type="date" id="fecha-album-form" required>
            </div>
            
            <div class="form-group">
              <label>Carátula del Álbum *</label>
              <div class="upload-zone" id="upload-caratula-banda" style="border: 2px dashed var(--border-color); padding: 30px; text-align: center; border-radius: 10px; cursor: pointer; background: rgba(26, 188, 156, 0.05); transition: all 0.3s ease;">
                <input type="file" id="caratula-banda-input" accept="image/*" style="display: none;">
                <p style="margin: 0; font-size: 16px; color: var(--text-secondary);">📁 Haz clic o arrastra una imagen</p>
                <p style="margin: 8px 0 0; font-size: 12px; color: var(--text-secondary);">JPG, PNG - Máx 10MB</p>
                <div id="preview-caratula-banda" style="display: none; margin-top: 15px;">
                  <img id="preview-img-caratula-banda" style="max-width: 200px; border-radius: 8px; border: 2px solid var(--primary);">
                </div>
                <div id="progress-caratula-banda" style="display: none; margin-top: 10px; width: 100%; height: 6px; background: #ecf0f1; border-radius: 3px;">
                  <div id="progress-bar-caratula-banda" style="height: 100%; background: var(--primary); width: 0%; transition: width 0.3s;"></div>
                </div>
              </div>
              <input type="hidden" id="caratula-url-hidden" required>
            </div>
            
            <div class="form-group">
              <label>Canciones *</label>
              <div id="cancionesContainer"></div>
              <button type="button" onclick="agregarCancionFormulario()" class="btn-secondary" style="margin-top: 10px; width: 100%;">+ Agregar Canción</button>
            </div>
            
            <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; padding-top: 20px; border-top: 1px solid var(--border-color); margin-top: 20px;">
              <button type="button" onclick="cerrarFormularioAlbum()" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary">Guardar Álbum</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
  
  document.body.insertAdjacentHTML('beforeend', modalHTML)
  
  setTimeout(() => {
    setupCaratulaBandaUpload()
  }, 100)
}

function cerrarFormularioAlbum() {
  if (Object.keys(uploadedFilesAlbum.canciones).length > 0 || uploadedFilesAlbum.caratula) {
    if (!confirm("¿Cerrar el formulario? Se eliminarán los archivos subidos que no se guardaron.")) {
      return
    }
    limpiarArchivosTemporales()
  }
  
  const modal = document.getElementById("albumFormModal")
  if (modal) modal.remove()
  
  uploadedFilesAlbum = { caratula: null, canciones: {} }
  contadorCancionesBanda = 0
  albumEditandoId = null
}

// ========================================
// CONFIGURAR UPLOAD DE CARÁTULA
// ========================================
async function handleCaratulaUpload(file) {
  console.log("🚀 Subiendo carátula:", file.name)
  
  if (!file.type.startsWith("image/")) {
    alert("❌ Selecciona una imagen válida")
    return
  }
  
  if (file.size > 10 * 1024 * 1024) {
    alert("❌ La imagen no puede superar 10MB")
    return
  }
  
  // 🗑️ Eliminar carátula anterior si existe y es nueva
  if (uploadedFilesAlbum.caratula && uploadedFilesAlbum.caratula.nuevo) {
    await eliminarDeCloudinary(uploadedFilesAlbum.caratula.url, "image")
  }
  
  // Vista previa local
  const reader = new FileReader()
  reader.onload = (e) => {
    previewImg.src = e.target.result
    preview.style.display = "block"
  }
  reader.readAsDataURL(file)
  
  // Verificar configuración de Cloudinary
  if (!cloudinaryConfig) {
    alert("❌ Cloudinary no está configurado. Recarga la página.")
    return
  }
  
  // Mostrar barra de progreso
  if (progressBar) progressBar.style.display = "block"
  if (progressFill) progressFill.style.width = "0%"
  
  uploadZone.innerHTML = '<p style="color: var(--primary); margin: 20px 0;">⏳ Subiendo imagen...</p>'
  
  try {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", cloudinaryConfig.uploadPresetCovers)
    
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
        
        urlInput.value = cloudinaryUrl
        previewImg.src = cloudinaryUrl
        preview.style.display = "block"
        if (progressBar) progressBar.style.display = "none"
        
        uploadedFilesAlbum.caratula = {
          url: cloudinaryUrl,
          publicId: response.public_id,
          nuevo: true
        }
        
        uploadZone.innerHTML = `
          <p style="margin: 0; font-size: 16px; color: var(--text-secondary);">✅ Imagen subida</p>
          <p style="margin: 8px 0 0; font-size: 12px; color: var(--text-secondary);">📁 Haz clic para cambiar</p>
          <img src="${cloudinaryUrl}" style="max-width: 150px; margin-top: 10px; border-radius: 8px; border: 2px solid var(--primary);">
        `
        
        console.log("✅ Carátula subida:", cloudinaryUrl)
      } else {
        throw new Error(`Error ${xhr.status}`)
      }
    })
    
    xhr.addEventListener("error", () => {
      throw new Error("Error de red")
    })
    
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`
    xhr.open("POST", uploadUrl)
    xhr.send(formData)
    
  } catch (error) {
    console.error("❌ Error:", error)
    alert("❌ Error al subir la carátula")
    uploadZone.innerHTML = `
      <p style="margin: 0; font-size: 16px; color: var(--text-secondary);">📁 Haz clic o arrastra una imagen</p>
      <p style="margin: 8px 0 0; font-size: 12px; color: var(--text-secondary);">JPG, PNG - Máx 10MB</p>
    `
    if (progressBar) progressBar.style.display = "none"
  }
}
// ========================================
// AGREGAR CANCIÓN AL FORMULARIO
// ========================================
function agregarCancionFormulario(cancion = null) {
  contadorCancionesBanda++
  const id = contadorCancionesBanda
  
  const html = `
    <div class="cancion-form-item" id="cancion-form-${id}" data-id-cancion="${cancion?.id_cancion || ''}" style="background: rgba(26, 188, 156, 0.05); padding: 15px; border-radius: 8px; margin-bottom: 12px; border: 1px solid var(--border-color);">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
        <div>
          <label style="display: block; margin-bottom: 5px; font-size: 12px; color: var(--text-secondary);">Nombre de la canción *</label>
          <input type="text" placeholder="Título de la canción" value="${cancion?.nombre || ''}" id="cancion-nombre-${id}" required style="width: 100%; padding: 8px; background: var(--bg-darker); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
        </div>
        <div>
          <label style="display: block; margin-bottom: 5px; font-size: 12px; color: var(--text-secondary);">Duración (mm:ss) *</label>
          <input type="text" placeholder="03:45" value="${cancion?.duracion || ''}" pattern="[0-5][0-9]:[0-5][0-9]" id="cancion-duracion-${id}" required style="width: 100%; padding: 8px; background: var(--bg-darker); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
        </div>
      </div>
      
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px; font-size: 12px; color: var(--text-secondary);">Descripción</label>
        <input type="text" placeholder="Descripción de la canción" value="${cancion?.descrip || ''}" id="cancion-descrip-${id}" style="width: 100%; padding: 8px; background: var(--bg-darker); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-primary);">
      </div>
      
      <div style="margin-bottom: 10px;">
        <label style="display: block; margin-bottom: 5px; font-size: 12px; color: var(--text-secondary);">🎵 Archivo de audio *</label>
        <div class="upload-zone-cancion" id="upload-cancion-${id}" style="border: 2px dashed var(--border-color); padding: 20px; text-align: center; border-radius: 6px; background: rgba(255, 255, 255, 0.02); cursor: pointer; transition: all 0.3s ease;">
          <input type="file" id="archivo-cancion-${id}" accept="audio/*" style="display: none;">
          <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">📁 Haz clic o arrastra un archivo</p>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: var(--text-secondary);">MP3, WAV, FLAC - Máx 50MB</p>
          <div id="progress-cancion-${id}" style="display: none; margin-top: 10px; width: 100%; height: 6px; background: var(--bg-darker); border-radius: 3px;">
            <div id="progress-bar-cancion-${id}" style="height: 100%; background: var(--primary); width: 0%; transition: width 0.3s;"></div>
          </div>
          <div id="preview-cancion-${id}" style="margin-top: 10px; display: ${cancion ? 'block' : 'none'};">
            <p style="color: var(--primary); font-size: 12px;">${cancion ? '✅ Archivo cargado' : ''}</p>
          </div>
        </div>
        <input type="hidden" id="cancion-path-${id}" value="${cancion?.cancion_path || ''}" required>
      </div>
      
  
    </div>
  `
  
  document.getElementById("cancionesContainer").insertAdjacentHTML("beforeend", html)
  
  // Configurar upload para esta canción
  setTimeout(() => {
    setupCancionUpload(id, cancion?.cancion_path || null)
  }, 100)
}

// ========================================
// CONFIGURAR UPLOAD DE CANCIÓN
// ========================================
async function handleSongUpload(file) {
  console.log(`🚀 Subiendo canción ${cancionId}:`, file.name)
  
  if (!file.type.startsWith("audio/")) {
    alert("❌ Por favor selecciona un archivo de audio")
    return
  }
  
  if (file.size > 50 * 1024 * 1024) {
    alert("❌ El archivo no puede superar 50MB")
    return
  }
  
  // 🗑️ Eliminar archivo anterior si existe y es nuevo
  const archivoAnterior = uploadedFilesAlbum.canciones[cancionId]
  if (archivoAnterior && archivoAnterior.url && archivoAnterior.nuevo) {
    await eliminarDeCloudinary(archivoAnterior.url, "video")
  }
  
  // Verificar configuración de Cloudinary
  if (!cloudinaryConfig) {
    alert("❌ Cloudinary no está configurado. Recarga la página.")
    return
  }
  
  if (progressBar) progressBar.style.display = "block"
  if (progressFill) progressFill.style.width = "0%"
  
  uploadZone.innerHTML = '<p style="color: var(--primary); margin: 20px 0;">⏳ Subiendo audio...</p>'
  
  try {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", cloudinaryConfig.uploadPresetSongs)
    
    const xhr = new XMLHttpRequest()
    
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && progressFill) {
        const percentComplete = (e.loaded / e.total) * 100
        progressFill.style.width = percentComplete + "%"
        console.log(`📊 Canción ${cancionId}: ${percentComplete.toFixed(0)}%`)
      }
    })
    
    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        const cloudinaryUrl = response.secure_url
        
        pathInput.value = cloudinaryUrl
        if (preview) preview.style.display = "block"
        if (progressBar) progressBar.style.display = "none"
        
        uploadedFilesAlbum.canciones[cancionId] = {
          url: cloudinaryUrl,
          publicId: response.public_id,
          nuevo: true,
          urlOriginal: archivoAnterior?.urlOriginal || null
        }
        
        uploadZone.innerHTML = `
          <p style="margin: 0; font-size: 14px; color: var(--primary);">✅ Audio subido correctamente</p>
          <p style="margin: 5px 0 0; font-size: 12px; color: var(--text-secondary);">📁 Haz clic para cambiar</p>
        `
        
        console.log(`✅ Canción ${cancionId} subida:`, cloudinaryUrl)
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
    console.error(`❌ Error al procesar canción ${cancionId}:`, error)
    alert("❌ Error al procesar el archivo")
    uploadZone.innerHTML = `
      <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">📁 Haz clic o arrastra un archivo</p>
      <p style="margin: 5px 0 0; font-size: 12px; color: var(--text-secondary);">MP3, WAV, FLAC - Máx 50MB</p>
    `
    if (progressBar) progressBar.style.display = "none"
  }
}
// ========================================
// ELIMINAR ARCHIVO DE CLOUDINARY
// ========================================
async function eliminarDeCloudinary(url, resourceType = "video") {
  try {
    console.log(`🗑️ Eliminando de Cloudinary: ${url}`)
    
    const resp = await fetch(`${state.baseUrl}/api/cloudinary/cleanup`, {
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

// ========================================
// ELIMINAR CANCIÓN DEL FORMULARIO
// ========================================
// ========================================
// ELIMINAR CANCIÓN DEL FORMULARIO - CORREGIDO
// ========================================
window.eliminarCancionForm = async function(id) {
  const cancion = document.getElementById(`cancion-form-${id}`)
  if (!cancion) return
  
  const idCancion = cancion.dataset.idCancion
  
  if (!confirm("¿Eliminar esta canción? Se eliminará permanentemente.")) return
  
  // Si la canción tiene ID (existe en DB), eliminarla de la base de datos
  if (idCancion && idCancion !== '') {
    try {
      console.log(`🗑️ Eliminando canción ${idCancion} de la base de datos...`)
      
      const resp = await fetch(`${state.baseUrl}/api/canciones/eliminar_cancion`, {
        method: "DELETE",
        headers: { 
          Authorization: `Bearer ${state.token}` ,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ "id_cancion": idCancion })
      })
      
      if (resp.ok) {
        const data = await resp.json()
        console.log("✅ Canción eliminada de DB:", data)
        
        // Eliminar de Cloudinary
        const archivoCancion = uploadedFilesAlbum.canciones[id]
        if (archivoCancion && archivoCancion.url) {
          await eliminarDeCloudinary(archivoCancion.url, "video")
        }
      } else {
        const error = await resp.json()
        alert("❌ Error al eliminar de DB: " + (error.error || "Error desconocido"))
        return
      }
    } catch (error) {
      console.error("❌ Error:", error)
      alert("❌ Error de conexión al eliminar canción")
      return
    }
  } else {
    // Es una canción nueva que no se ha guardado aún
    const archivoCancion = uploadedFilesAlbum.canciones[id]
    if (archivoCancion && archivoCancion.url && archivoCancion.nuevo) {
      await eliminarDeCloudinary(archivoCancion.url, "video")
    }
  }
  
  // Remover del DOM
  cancion.remove()
  delete uploadedFilesAlbum.canciones[id]
  console.log(`✅ Canción ${id} eliminada del formulario`)
}
// ========================================
// RECOLECTAR CANCIONES CON ELIMINACIÓN
// ========================================
function recolectarCanciones() {
  const songBloques = document.querySelectorAll(".cancion-form-item")
  const songs = []
  const errores = []
  
  // Obtener IDs de canciones originales (al cargar edición)
  const cancionesOriginales = Array.from(songBloques)
    .map(bloque => bloque.dataset.idCancion)
    .filter(id => id && id !== '')

  songBloques.forEach((bloque, index) => {
    const id = bloque.id.split("-")[2]
    const idCancion = bloque.dataset.idCancion || ""
    const nombre = document.getElementById(`cancion-nombre-${id}`)?.value?.trim() || ""
    const descrip = document.getElementById(`cancion-descrip-${id}`)?.value?.trim() || ""
    const duracion = document.getElementById(`cancion-duracion-${id}`)?.value?.trim() || ""
    const cancion_path = document.getElementById(`cancion-path-${id}`)?.value?.trim() || ""

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

    const cancion = { nombre, descrip, duracion, cancion_path }
    if (idCancion) {
      cancion.id_cancion = idCancion
    }
    
    songs.push(cancion)
  })

  if (errores.length > 0) {
    alert("❌ Errores encontrados:\n\n" + errores.join("\n"))
    return null
  }

  console.log(`✅ ${songs.length} canciones recolectadas correctamente`)
  return songs
}

// ========================================
// ACTUALIZAR ÁLBUM - MEJORADO
// ========================================
async function guardarAlbumBanda(e) {
  e.preventDefault()
  
  const albumId = document.getElementById("album-id-hidden").value
  const nombre = document.getElementById("nombre-album-form").value.trim()
  const descrip = document.getElementById("descripcion-album-form").value.trim()
  const fecha = document.getElementById("fecha-album-form").value
  const caratula = document.getElementById("caratula-url-hidden").value
  
  if (!nombre || !fecha || !caratula) {
    return alert("❌ Completa todos los campos obligatorios")
  }
  
  const canciones = recolectarCanciones()
  
  if (canciones === null) {
    return
  }
  
  if (canciones.length === 0) {
    return alert("❌ Agrega al menos una canción")
  }
  
  const payload = {
    album: {
      nombre_album: nombre,
      descrip,
      fecha_lanza: fecha,
      caratula_dir: caratula,
      id_banda: parseInt(state.userId)
    },
    canciones
  }
  
  if (albumId) {
    payload.album.id_album = albumId
  }
  
  console.log("📤 Enviando payload:", payload)
  
  try {
    const endpoint = albumId ? "/api/actualizar_album_completo" : "/api/crear_album_completo"
    const method = albumId ? "PUT" : "POST"
    
    const resp = await fetch(`${state.baseUrl}${endpoint}`, {
      method,
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${state.token}` 
      },
      body: JSON.stringify(payload)
    })
    
    if (resp.ok) {
      alert(albumId ? "✅ Álbum actualizado" : "✅ Álbum creado")
      
      // Marcar archivos como guardados
      uploadedFilesAlbum.canciones = Object.fromEntries(
        Object.entries(uploadedFilesAlbum.canciones).map(([id, archivo]) => [
          id,
          { ...archivo, nuevo: false }
        ])
      )
      if (uploadedFilesAlbum.caratula) {
        uploadedFilesAlbum.caratula.nuevo = false
      }
      
      cerrarFormularioAlbum()
      await cargarAlbumesBanda()
    } else {
      const error = await resp.json()
      alert("❌ Error: " + (error.error || "No se pudo guardar"))
    }
  } catch (error) {
    console.error("Error:", error)
    alert("❌ Error de conexión")
  }
}

// ========================================
// ELIMINAR DE CLOUDINARY - MEJORADO
// ========================================

// ========================================
// EXPONER FUNCIONES GLOBALES
// ========================================
window.eliminarCancionForm = eliminarCancionForm
window.guardarAlbumBanda = guardarAlbumBanda
window.recolectarCanciones = recolectarCanciones
// ========================================
// EDITAR ÁLBUM EXISTENTE
// ========================================
// Configurar upload de carátula
// setTimeout(() => {
//   setupCaratulaBandaUpload()
  
//   // Marcar carátula existente
//   uploadedFilesAlbum.caratula = {
//     url: album.caratula_dir,
//     nuevo: false,
//     urlOriginal: album.caratula_dir
//   }
// }, 100)
// ========================================
// CARGAR CANCIONES PARA EDICIÓN
// ========================================
async function cargarCancionesParaEdicion(id_album) {
  try {
    const resp = await fetch(`${state.baseUrl}/api/albums/canciones`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${state.token}` 
      },
      body: JSON.stringify({ id_album: id_album })
    })
    
    if (!resp.ok) {
      console.error("Error al cargar canciones")
      return
    }
    
    const canciones = await resp.json()
    console.log("✅ Canciones cargadas para edición:", canciones)
    
    const container = document.getElementById("cancionesContainer")
    if (!container) return
    
    container.innerHTML = ""
    
    // Agregar cada canción existente
    canciones.forEach(cancion => {
      agregarCancionFormulario(cancion)
    })
    
  } catch (error) {
    console.error("Error al cargar canciones para edición:", error)
  }
}

// ========================================
// VER CANCIONES DEL ÁLBUM
// ========================================
async function verCancionesAlbum(albumId) {
  await showAlbumDetail(albumId)
}

// ========================================
// EXPONER FUNCIONES GLOBALES
// ========================================
window.editarAlbumBanda = editarAlbumBanda
window.verCancionesAlbum = verCancionesAlbum
window.agregarCancionFormulario = agregarCancionFormulario
window.guardarAlbumBanda = guardarAlbumBanda
window.cerrarFormularioAlbum = cerrarFormularioAlbum
window.mostrarFormularioAlbum = mostrarFormularioAlbum
window.cargarAlbumesBanda = cargarAlbumesBanda

// ========================================
// GLOBALES
// ========================================
// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener("DOMContentLoaded", () => {
  // Cargar configuración de Cloudinary al inicio
// Inicializar elementos del DOM
  elements = {
    audioPlayer: document.getElementById("audioPlayer"),
    playBtn: document.getElementById("playBtn"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    progressSlider: document.getElementById("progressSlider"),
    progressFill: document.getElementById("progressFill"),
    currentTimeEl: document.getElementById("currentTime"),
    durationEl: document.getElementById("duration"),
    volumeSlider: document.getElementById("volumeSlider"),
    volumeValue: document.getElementById("volumeValue"),
    playerTitle: document.getElementById("playerTitle"),
    playerArtist: document.getElementById("playerArtist"),
    playerCover: document.getElementById("playerCover"),
    queueList: document.getElementById("queueList"),
    songsGrid: document.getElementById("songsGrid"),
    playlistsList: document.getElementById("playlistsList"),
    navBtns: document.querySelectorAll(".nav-btn"),
    contentSections: document.querySelectorAll(".content-section"),
    createPlaylistBtn: document.getElementById("createPlaylistBtn"),
    savePlaylistBtn: document.getElementById("savePlaylistBtn"),
    createPlaylistModal: document.getElementById("createPlaylistModal"),
    songDetailModal: document.getElementById("songDetailModal"),
    addToPlaylistModal: document.getElementById("addToPlaylistModal"),
    albumDetailModal: document.getElementById("albumDetailModal"),
    refreshBtn: document.getElementById("refreshBtn"),
    logoutBtn: document.getElementById("btnLogout"),
    playlistName: document.getElementById("playlistName"),
    albumsGrid: document.getElementById("albumsGrid"),
    btnCreateAlbum: document.getElementById("btnCreateAlbum"),
    playlistDescription: document.getElementById("playlistDescription"),
    modalCloseButtons: document.querySelectorAll(".modal-close"),
    searchInput: document.getElementById("searchInput"),
    searchResults: document.getElementById("searchResults"),
    filterBtns: document.querySelectorAll(".filter-btn"),
    userRole: document.getElementById("userRole"),
    contextMenu: null,
  }




// Llamar al cargar la página
cargarConfigCloudinary()
  if (!state.token) {
    alert("No estás autenticado")
    window.location.href = "/"
    return
  }

  console.log("Dashboard inicializado")
  console.log("User role:", state.userRole)

  const roleMap = {
    admin: "Administrador",
    curador: "Curador",
    banda: "banda",
    artista: "Artista",
    finalusuario: "Usuario",
  }
  if (elements.userRole) {
    elements.userRole.textContent = roleMap[state.userRole] || "Usuario"
  }

  initEventListeners()
  loadSongs()
  loadPlaylists()
  if (state.userRole === "banda") {
    switchSection("admin-cuenta");
    // Además, desactiva el botón 'Descubrir' y activa 'Administración' en el nav
    elements.navBtns.forEach((btn) => btn.classList.remove("active"));
    document.querySelector('[data-section="admin-cuenta"]')?.classList.add("active");
  }
})

// ========================================
// EVENT LISTENERS
// ========================================
function initEventListeners() {
  // Mostrar opciones según rol

  elements.navBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const section = e.target.getAttribute("data-section")
      switchSection(section)
    })
  })

  elements.playBtn?.addEventListener("click", togglePlay)
  elements.prevBtn?.addEventListener("click", playPrevious)
  elements.nextBtn?.addEventListener("click", playNext)
  elements.audioPlayer?.addEventListener("timeupdate", updateProgress)
  // Listener para crear álbum (solo para bandas)
elements.btnCreateAlbum?.addEventListener("click", mostrarFormularioAlbum)
  elements.audioPlayer?.addEventListener("ended", playNext)
  elements.progressSlider?.addEventListener("change", seek)
  elements.volumeSlider?.addEventListener("change", setVolume)

  elements.createPlaylistBtn?.addEventListener("click", () => {
    elements.createPlaylistModal.style.display = "flex"
  })

  elements.savePlaylistBtn?.addEventListener("click", saveNewPlaylist)

  elements.modalCloseButtons.forEach((btn) => {
    btn.addEventListener("click", closeAllModals)
  })

  elements.refreshBtn?.addEventListener("click", loadSongs)
  elements.logoutBtn?.addEventListener("click", logout)
  elements.searchInput?.addEventListener("input", performSearch)

  elements.filterBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      elements.filterBtns.forEach((b) => b.classList.remove("active"))
      e.target.classList.add("active")
      state.searchFilter = e.target.getAttribute("data-filter")
      performSearch()
    })
  })

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal")) {
      closeAllModals()
    }
  })
  
  document.addEventListener("click", (e) => {
    if (elements.contextMenu && !e.target.closest(".song-card") && !e.target.closest(".context-menu")) {
      elements.contextMenu.remove()
      elements.contextMenu = null
    }
  })
}

// ========================================
// NAVEGACIÓN
// ========================================
function switchSection(section) {
  elements.navBtns.forEach((btn) => btn.classList.remove("active"))
  elements.contentSections.forEach((sec) => sec.classList.remove("active"))
  document.querySelector(`[data-section="${section}"]`)?.classList.add("active")
  document.getElementById(`section-${section}`)?.classList.add("active")
  
  // Si cambia a sección admin-cuenta, configurar según el rol
  if (section === "admin-cuenta") {
    const bandaContent = document.getElementById("banda-content")
    const otherContent = document.getElementById("other-content")
    const btnCreateAlbum = document.getElementById("btnCreateAlbum")
    
    if (state.userRole === "banda") {
      // Mostrar panel de banda
      if (bandaContent) bandaContent.style.display = "block"
      if (otherContent) otherContent.style.display = "none"
      if (btnCreateAlbum) btnCreateAlbum.style.display = "block"
      
      // Cargar álbumes
      setTimeout(() => cargarAlbumesBanda(), 300)
    } else {
      // Ocultar panel de banda y mostrar perfil personal
      if (bandaContent) bandaContent.style.display = "none"
      if (otherContent) otherContent.style.display = "block"
      if (btnCreateAlbum) btnCreateAlbum.style.display = "none"
      
      // 👉 AGREGAR ESTO: Cargar datos del usuario
      setTimeout(() => cargarDatosUsuario(), 100)
    }
  }
}
// ========================================
// CARGAR CANCIONES
// ========================================
async function loadSongs() {
  console.log("Cargando canciones...")
  elements.songsGrid.innerHTML = '<div class="loading-spinner">Cargando canciones...</div>'

  try {
    const resp = await fetch(`${state.baseUrl}/api/albums_listar`, {
      headers: { Authorization: `Bearer ${state.token}` },
    })

    if (!resp.ok) throw new Error(`Error ${resp.status}`)

    const albums = await resp.json()
    const allSongs = []

    for (const album of albums) {
      // ✅ FILTRO: Solo álbumes ACTIVOS
      if (album.estado !== "activo") {
        console.log(`⏭️ Saltando álbum "${album.nombre_album}" (Estado: ${album.estado})`)
        continue
      }

      const cancioneResp = await fetch(`${state.baseUrl}/api/albums/canciones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({ id_album: album.id_album }),
      })

      if (cancioneResp.ok) {
        const canciones = await cancioneResp.json()
        canciones.forEach((cancion) => {
          // ✅ DOBLE FILTRO: Solo canciones activas de álbumes activos
          if (cancion.estado === "activo") {
            allSongs.push({
              ...cancion,
              album_name: album.nombre_album,
              album_cover: album.caratula_dir,
            })
          }
        })
      }
    }
    
    console.log(`✅ Total canciones activas cargadas: ${allSongs.length}`)
    
    for (let i = 0; i < allSongs.length; i++) {
      allSongs[i] = await enrichSongData(allSongs[i])
    }
    
    state.songs = allSongs
    const randomSongs = shuffleArray([...allSongs]).slice(0, 12)
    renderSongs(randomSongs)
  } catch (error) {
    console.error("Error:", error)
    elements.songsGrid.innerHTML = '<div class="loading-spinner" style="color: #e74c3c;">Error al cargar canciones</div>'
  }
}

function renderSongs(songs) {
  elements.songsGrid.innerHTML = songs.map((song) => `
    <div class="song-card" data-song-id="${song.id_cancion}">
      <div class="song-card-image" onclick="selectSong('${song.id_cancion}')">
        <img src="${song.album_cover}" alt="${song.nombre}">
        <div class="song-card-overlay">
          <div class="play-icon">▶</div>
        </div>
      </div>
      <div class="song-card-info">
        <div class="song-card-header">
          <div>
            <div class="song-card-title">${song.nombre}</div>
            <div class="song-card-artist">${song.album_name}</div>
          </div>
          <button class="song-options-btn" onclick="showContextMenu(event, '${song.id_cancion}', '${song.nombre}')">⋮</button>
        </div>
        <div class="song-card-duration">⏱️ ${song.duracion}</div>
      </div>
    </div>
  `).join("")
}

function showContextMenu(event, songId, songName) {
  event.stopPropagation()
  if (elements.contextMenu) elements.contextMenu.remove()

  const song = state.songs.find((s) => s.id_cancion === songId)
  if (!song) return

  const menu = document.createElement("div")
  menu.className = "context-menu"
  menu.style.cssText = `position: absolute; background: var(--bg-secondary, #2a2a2a); border: 1px solid var(--border-color, #444); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000; min-width: 200px;`

  const options = [
    { text: "▶️ Reproducir", action: () => selectSong(songId) },
    { text: "📋 Agregar a Playlist", action: () => showAddToPlaylistModalForSong(song) },
  ]

  // ❌ ELIMINADO: No mostrar opciones de deshabilitar para bandas

  options.forEach((opt) => {
    const item = document.createElement("div")
    item.textContent = opt.text
    item.style.cssText = `padding: 10px 16px; cursor: pointer; border-bottom: 1px solid var(--border-color, #444); font-size: 14px; transition: background 0.2s;`
    item.onmouseover = () => (item.style.background = "var(--bg-hover, #333)")
    item.onmouseout = () => (item.style.background = "")
    item.onclick = (e) => {
      e.stopPropagation()
      opt.action()
      closeContextMenu()
    }
    menu.appendChild(item)
  })

  document.body.appendChild(menu)
  const rect = event.target.getBoundingClientRect()
  menu.style.top = rect.bottom + 5 + "px"
  menu.style.left = rect.left - 150 + "px"
  elements.contextMenu = menu
}
function closeContextMenu() {
  if (elements.contextMenu) {
    elements.contextMenu.remove()
    elements.contextMenu = null
  }
}

// ========================================
// BÚSQUEDA
// ========================================
async function traer_caratulas(id_song){
        let song_carat="";
        const song_rsep = await fetch(`${state.baseUrl}/api/buscar_album_individual`,{
          method:"POST",
          headers:{"Content-Type":"application/json",Authorization: `Bearer ${state.token}`},
          body: JSON.stringify({id_album:id_song})
        });
        if(song_rsep.ok){
          song_carat = await song_rsep.json();
          return song_carat
        }
        return ""
      
}

async function performSearch() {
  const query = elements.searchInput.value.trim()

  if (!query) {
    elements.searchResults.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Empieza a buscar...</p>'
    return
  }

  elements.searchResults.innerHTML = '<div class="loading-spinner">Buscando...</div>'

  try {
    const results = { songs: [], albums: [] }

    if (state.searchFilter === "all" || state.searchFilter === "songs") {
      const songResp = await fetch(`${state.baseUrl}/api/buscar/canciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
        body: JSON.stringify({ nombre: query }),
      })

      if (songResp.ok) {
        const songs = await songResp.json()
        if (songs && Array.isArray(songs)) {
          // ✅ FILTRAR: Solo canciones de álbumes activos
          const songsFiltradas = []
          for (const song of songs) {
            const albumResp = await fetch(`${state.baseUrl}/api/albums_listar`, {
              headers: { Authorization: `Bearer ${state.token}` }
            })
            if (albumResp.ok) {
              const albums = await albumResp.json()
              const album = albums.find(a => a.id_album === song.id_album)
              if (album && album.estado === 'activo' && song.estado === 'activo') {
                songsFiltradas.push({ ...song, type: "song" })
              }
            }
          }
          results.songs = songsFiltradas
        }
      }
    }
    
    const caratulas = await Promise.all(results.songs.map(async(song)=>{
      const carat = await traer_caratulas(song.id_album);
      return {...song,caratula_path:carat};
    }))
    results.songs = caratulas;

    if (state.searchFilter === "all" || state.searchFilter === "albums") {
      const albumResp = await fetch(`${state.baseUrl}/api/buscar/albumes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
        body: JSON.stringify({ nombre: query }),
      })

      if (albumResp.ok) { 
        const albums = await albumResp.json()
        if (albums && Array.isArray(albums)) {
          // ✅ FILTRAR: Solo álbumes activos
          results.albums = albums.filter((a) => a.estado === "activo").map((album) => ({ ...album, type: "album" }))
        }
      }
    }

    renderSearchResults(results)
  } catch (error) {
    console.error("Error en búsqueda:", error)
    elements.searchResults.innerHTML = '<div class="loading-spinner" style="color: #e74c3c;">Error al buscar</div>'
  }
}

function renderSearchResults(results) {
  const { songs, albums } = results

  if (songs.length === 0 && albums.length === 0) {
    elements.searchResults.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1 / -1;">No se encontraron resultados</p>'
    return
  }

  let html = ""

  albums.forEach((album) => {
    html += `
      <div class="album-search-card" onclick="showAlbumDetail('${album.id_album}')">
        <div class="album-card-image">
          <img src="${album.caratula_dir}" alt="${album.nombre_album}">
          <div class="album-card-overlay"><div class="album-icon">💿</div></div>
        </div>
        <div class="album-card-info">
          <div class="album-card-title">${album.nombre_album}</div>
          <div class="album-card-label">Álbum</div>
        </div>
      </div>`
  })

  songs.forEach((song) => {
    html += `
      <div class="song-card" data-song-id="${song.id_cancion}">
        <div class="song-card-image" onclick="selectSong('${song.id_cancion}')">
          <img src="${song.caratula_path}" alt="${song.nombre}">
          <div class="song-card-overlay"><div class="play-icon">▶</div></div>
        </div>
        <div class="song-card-info">
          <div class="song-card-header">
            <div>
              <div class="song-card-title">${song.nombre}</div>
              <div class="song-card-artist">Canción</div>
            </div>
            <button class="song-options-btn" onclick="showContextMenu(event, '${song.id_cancion}', '${song.nombre}')">⋮</button>
          </div>
          <div class="song-card-duration">⏱️ ${song.duracion}</div>
        </div>
      </div>`
  })

  elements.searchResults.innerHTML = html
}

// ========================================
// DETALLES DE ÁLBUM
// ========================================
async function showAlbumDetail(albumId) {
  try {
    const albumResp = await fetch(`${state.baseUrl}/api/albums_listar`, {
      headers: { Authorization: `Bearer ${state.token}` },
    })

    if (!albumResp.ok) throw new Error("Error al cargar álbumes")

    const albums = await albumResp.json()
    const album = albums.find((a) => a.id_album === albumId)

    if (!album) {
      alert("Álbum no encontrado")
      return
    }

    const cancionResp = await fetch(`${state.baseUrl}/api/albums/canciones-activas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
      body: JSON.stringify({ id_album: albumId }),
    })

    let albumSongs = []
    if (cancionResp.ok) albumSongs = await cancionResp.json()

    state.currentAlbumSongs = albumSongs.map(s => s.id_cancion)

    document.getElementById("albumModalTitle").textContent = album.nombre_album
    document.getElementById("albumModalCover").src = album.caratula_dir
    document.getElementById("albumDetailName").textContent = album.nombre_album
    document.getElementById("albumDetailDescription").textContent = album.descrip || "Sin descripción"
    
    const songCountDiv = document.getElementById("albumDetailSongCount")
    songCountDiv.innerHTML = `
      <div style="margin-bottom: 10px;">${albumSongs.length} canciones</div>
      <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
        <button onclick="playAlbum('${albumId}', false)" style="
          flex: 1;
          padding: 10px;
          background: #27ae60;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='#2ecc71'"
           onmouseout="this.style.background='#27ae60'">
          ▶ Reproducir
        </button>
        <button onclick="playAlbum('${albumId}', true)" style="
          flex: 1;
          padding: 10px;
          background: #3498db;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
        " onmouseover="this.style.background='#5dade2'"
           onmouseout="this.style.background='#3498db'">
          ⛕ Aleatorio
        </button>
      </div>
      <button onclick="addAlbumToPlaylist()" style="
        padding: 10px 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        width: 100%;
      " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.5)'"
         onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)'">
        📋 Agregar álbum completo a Playlist
      </button>
    `

    const songsList = document.getElementById("albumSongsList")
    if (albumSongs.length === 0) {
      songsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay canciones en este álbum</p>'
    } else {
      songsList.innerHTML = albumSongs.map((song) => `
        <div class="album-song-item" onclick="event.stopPropagation(); selectSong('${song.id_cancion}')">
          <div class="album-song-info">
            <div class="album-song-title">${song.nombre}</div>
            <div class="album-song-duration">⏱️ ${song.duracion}</div>
          </div>
          <div class="album-song-actions">
            <button onclick="event.stopPropagation(); addSingleToPlaylist('${song.id_cancion}', '${song.nombre}')" class="btn-mini">Agregar a Playlist</button>
            ${state.userRole === "admin" || state.userRole === "curador" ? `<button onclick="event.stopPropagation(); toggleSongDisabled('${song.id_cancion}', ${song.estado === "activo"})" class="btn-mini disable-btn">Deshabilitar</button>` : ""}
          </div>
        </div>
      `).join("")
    }

    elements.albumDetailModal.style.display = "flex"
  } catch (error) {
    console.error("Error:", error)
    alert("Error al cargar detalles del álbum")
  }
}

// ========================================
// REPRODUCIR ÁLBUM (CON OPCIÓN DE ALEATORIO)
// ========================================
async function playAlbum(albumId, shuffle = false) {
  try {
    const cancionResp = await fetch(`${state.baseUrl}/api/albums/canciones-activas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
      body: JSON.stringify({ id_album: albumId }),
    })

    if (!cancionResp.ok) throw new Error("Error al cargar canciones")

    let albumSongs = await cancionResp.json()

    if (!albumSongs || albumSongs.length === 0) {
      alert("⚠️ Este álbum no tiene canciones.")
      return
    }

    for (let i = 0; i < albumSongs.length; i++) {
      albumSongs[i] = await enrichSongData(albumSongs[i])
    }

    state.originalQueue = [...albumSongs]
    state.shuffleMode = shuffle

    if (shuffle) {
      albumSongs = shuffleArray(albumSongs)
    }

    state.queue = albumSongs
    state.queueIndex = 0
    state.currentSong = albumSongs[0]

    updatePlayerUI()
    playSong()
    updateQueue()
    closeAllModals()
  } catch (error) {
    console.error("Error al reproducir álbum:", error)
    alert("❌ No se pudo reproducir el álbum.")
  }
}

// ========================================
// AGREGAR ÁLBUM COMPLETO
// ========================================
async function addAlbumToPlaylist() {
  if (!state.currentAlbumSongs || state.currentAlbumSongs.length === 0) {
    alert("⚠️ No hay canciones en este álbum para agregar.")
    return
  }

  const container = document.getElementById("playlistsForAdd")

  if (!state.playlists || state.playlists.length === 0) {
    container.innerHTML = '<p style="text-align:center;">No tienes playlists aún.</p>'
    elements.addToPlaylistModal.style.display = "flex"
    return
  }

  container.innerHTML = ""
  state.playlists.forEach((pl) => {
    const div = document.createElement("div")
    div.className = "playlist-option"
    div.style.cssText = `
      cursor: pointer;
      padding: 15px;
      margin: 8px 0;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      transition: all 0.2s ease;
      border: 1px solid rgba(255, 255, 255, 0.1);
    `
    div.innerHTML = `
      <div class="playlist-option-info">
        <div class="playlist-option-title" style="font-size: 15px; font-weight: 600; margin-bottom: 5px;">${pl.nombre}</div>
        <div class="playlist-option-count" style="font-size: 12px; color: var(--text-secondary);">Creada: ${pl.fecha_cracion}</div>
      </div>
    `
    
    div.onmouseover = () => {
      div.style.background = "rgba(255, 255, 255, 0.1)"
      div.style.transform = "translateX(5px)"
    }
    div.onmouseout = () => {
      div.style.background = "rgba(255, 255, 255, 0.05)"
      div.style.transform = "translateX(0)"
    }

    div.addEventListener("click", async () => {
      await addMultipleSongsToPlaylist(pl.id_playlist, state.currentAlbumSongs)
    })

    container.appendChild(div)
  })

  elements.addToPlaylistModal.style.display = "flex"
  elements.addToPlaylistModal.style.zIndex = "10000"
}

async function addMultipleSongsToPlaylist(playlistId, songIds) {
  let added = 0, errors = 0

  for (const songId of songIds) {
    try {
      const resp = await fetch(`${state.baseUrl}/api/agregar_cancion_playlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
        body: JSON.stringify({ id_playlist: playlistId, id_cancion: songId }),
      })
      if (resp.ok) added++
      else errors++
    } catch (error) {
      errors++
    }
  }

  closeAllModals()
  alert(errors === 0 ? `✅ Se agregaron ${added} canciones a la playlist correctamente.` : `⚠️ Se agregaron ${added} canciones. ${errors} canciones no pudieron agregarse.`)
}

// ========================================
// AUDIO
// ========================================
async function selectSong(songId) {
  let song = state.songs.find((s) => s.id_cancion === songId)
  if (!song) return

  song = await enrichSongData(song)
  state.currentSong = song
  state.queue = [song]
  state.queueIndex = 0

  updatePlayerUI()
  playSong()
  showSongDetail(song)
  closeContextMenu()
}

function playSong() {
  if (!state.currentSong) return

  const song = state.currentSong
  elements.audioPlayer.src = song.cancion_path
  elements.audioPlayer.play()
  state.isPlaying = true
  updatePlayBtn()

  fetch(`${state.baseUrl}/api/incrementar_reproducciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
    body: JSON.stringify({ id_cancion: song.id_cancion }),
  }).catch((e) => console.log("Error incrementando reproducciones:", e))

  updateQueue()
}

function togglePlay() {
  if (state.isPlaying) {
    elements.audioPlayer.pause()
    state.isPlaying = false
  } else {
    if (state.currentSong) {
      elements.audioPlayer.play()
      state.isPlaying = true
    }
  }
  updatePlayBtn()
}

function updatePlayBtn() {
  elements.playBtn.textContent = state.isPlaying ? "⏸️" : "▶️"
}

function playNext() {
  if (state.queue.length === 0) return
  state.queueIndex = (state.queueIndex + 1) % state.queue.length
  state.currentSong = state.queue[state.queueIndex]
  updatePlayerUI()
  playSong()
}

function playPrevious() {
  if (state.queue.length === 0) return
  state.queueIndex = (state.queueIndex - 1 + state.queue.length) % state.queue.length
  state.currentSong = state.queue[state.queueIndex]
  updatePlayerUI()
  playSong()
}

function updatePlayerUI() {
  if (!state.currentSong) return
  const song = state.currentSong
  elements.playerTitle.textContent = song.nombre
  elements.playerArtist.textContent = song.album_name
  elements.playerCover.src = song.album_cover || song.caratula_path
}

function updateProgress() {
  const current = elements.audioPlayer.currentTime
  const duration = elements.audioPlayer.duration

  elements.currentTimeEl.textContent = formatTime(current)
  elements.durationEl.textContent = formatTime(duration)

  if (duration) {
    const percent = (current / duration) * 100
    elements.progressFill.style.width = percent + "%"
    elements.progressSlider.value = percent
  }
}

function seek(e) {
  const duration = elements.audioPlayer.duration
  const percent = e.target.value / 100
  elements.audioPlayer.currentTime = duration * percent
}

function setVolume(e) {
  const volume = e.target.value / 100
  elements.audioPlayer.volume = volume
  elements.volumeValue.textContent = e.target.value + "%"
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

// ========================================
// PLAYLISTS
// ========================================
async function loadPlaylists() {
  try {
    const resp = await fetch(`${state.baseUrl}/api/obtener_playlists`, {
      headers: { Authorization: `Bearer ${state.token}` },
    })
    if (resp.ok) state.playlists = await resp.json() || []
    else state.playlists = []
    renderPlaylists()
  } catch (error) {
    console.error("Error:", error)
    state.playlists = []
    renderPlaylists()
  }
}

function renderPlaylists() {
  if (state.playlists.length === 0) {
    elements.playlistsList.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1 / -1;">No tienes playlists aún</p>'
    return
  }

  elements.playlistsList.innerHTML = state.playlists.map((pl) => `
    <div class="playlist-card" data-playlist-id="${pl.id_playlist}" style="
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
      cursor: pointer;
    " onmouseover="this.style.background='rgba(255, 255, 255, 0.08)'; this.style.transform='translateY(-2px)'"
       onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'; this.style.transform='translateY(0)'">
      <div class="playlist-header" onclick="togglePlaylistExpand(event, '${pl.id_playlist}')" style="display: flex; align-items: center; gap: 15px;">
        <div class="playlist-icon" style="font-size: 32px;">📋</div>
        <div class="playlist-card-info" style="flex: 1;">
          <div class="playlist-card-title" style="font-size: 18px; font-weight: 600; margin-bottom: 5px;">${pl.nombre || "Mi Playlist"}</div>
          <div class="playlist-card-count" style="font-size: 13px; color: var(--text-secondary);">Creada: ${pl.fecha_cracion}</div>
        </div>
        <span class="playlist-expand-btn" style="font-size: 20px;">▼</span>
      </div>
      <div class="playlist-content" id="playlist-${pl.id_playlist}" style="display: none; padding: 15px 0; margin-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
        <p style="text-align: center; color: var(--text-secondary);">Cargando canciones...</p>
      </div>
      <div class="playlist-actions" style="display: flex; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
        <button onclick="event.stopPropagation(); playPlaylist('${pl.id_playlist}')" style="
          flex: 1;
          padding: 10px 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.5)'"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)'">
          ▶ Reproducir
        </button>
        <button onclick="event.stopPropagation(); deletePlaylist('${pl.id_playlist}')" style="
          padding: 10px 16px;
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
        " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(231, 76, 60, 0.5)'"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(231, 76, 60, 0.3)'">
          🗑️
        </button>
      </div>
    </div>
  `).join("")
}

function togglePlaylistExpand(event, playlistId) {
  event.stopPropagation()
  const content = document.getElementById(`playlist-${playlistId}`)
  if (!content) return

  if (content.style.display === "none") {
    content.style.display = "block"
    loadPlaylistSongs(playlistId)
  } else {
    content.style.display = "none"
  }
}

async function loadPlaylistSongs(playlistId) {
  const content = document.getElementById(`playlist-${playlistId}`)
  if (!content) return

  try {
    const resp = await fetch(`${state.baseUrl}/api/obtener_canciones_playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
      body: JSON.stringify({ id_playlist: String(playlistId) }),
    })

    if (!resp.ok) throw new Error("Error al cargar canciones")

    const songs = await resp.json()

    if (!songs || songs.length === 0) {
      content.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Sin canciones</p>'
      return
    }

    for (let i = 0; i < songs.length; i++) {
      songs[i] = await enrichSongData(songs[i])
    }

    content.innerHTML = songs.map((song) => `
      <div class="playlist-song-item" style="padding: 8px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <div onclick="selectSong('${song.id_cancion}')" style="flex: 1; cursor: pointer;">
          <div style="font-size: 14px; font-weight: 500;">${song.nombre}</div>
          <div style="font-size: 12px; color: var(--text-secondary);">⏱ ${song.duracion} • ▶ ${song.n_reproduccion || 0}</div>
        </div>
        <button onclick="event.stopPropagation(); removeFromPlaylist('${playlistId}', '${song.id_cancion}')" class="btn-mini" style="margin-left: 10px; color: #e74c3c;">✕</button>
      </div>
    `).join("")
  } catch (error) {
    console.error("Error:", error)
    content.innerHTML = '<p style="text-align: center; color: #e74c3c;">Error al cargar</p>'
  }
}

async function removeFromPlaylist(playlistId, songId) {
  if (!confirm("¿Eliminar canción de la playlist?")) return

  try {
    const resp = await fetch(`${state.baseUrl}/api/eliminar_cancion_playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
      body: JSON.stringify({ id_playlist: String(playlistId), id_cancion: songId }),
    })

    if (resp.ok) {
      loadPlaylistSongs(playlistId)
      loadPlaylists()
    } else {
      const error = await resp.json()
      alert("Error: " + (error.error || "No se pudo eliminar"))
    }
  } catch (error) {
    console.error("Error:", error)
    alert("Error al eliminar canción")
  }
}

async function saveNewPlaylist() {
  const name = elements.playlistName.value.trim()

  if (!name) {
    alert("El nombre es obligatorio")
    return
  }

  try {
    const resp = await fetch(`${state.baseUrl}/api/crear_playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
      body: JSON.stringify({ nombre: name }),
    })

    if (resp.ok) {
      alert("Playlist creada correctamente")
      elements.playlistName.value = ""
      elements.playlistDescription.value = ""
      closeAllModals()
      loadPlaylists()
    } else {
      const error = await resp.json()
      alert("Error: " + (error.error || "No se pudo crear"))
    }
  } catch (error) {
    console.error("Error:", error)
    alert("Error al crear playlist")
  }
}

async function deletePlaylist(id) {
  if (!confirm("¿Seguro que quieres eliminar esta playlist?")) return
  try {
    const res = await fetch("/api/eliminar_playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${state.token}` },
      body: JSON.stringify({ id_playlist: id }),
    })

    const data = await res.json()
    if (res.ok) {
      alert("Playlist eliminada correctamente")
      loadPlaylists()
    } else {
      console.error("Error eliminando playlist:", data)
      alert("Error eliminando playlist: " + (data.error || "desconocido"))
    }
  } catch (error) {
    console.error(error)
    alert("Error de conexión con el servidor")
  }
}

async function playPlaylist(playlistId) {
  try {
    const resp = await fetch(`${state.baseUrl}/api/obtener_canciones_playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
      body: JSON.stringify({ id_playlist: String(playlistId) }),
    })

    if (!resp.ok) throw new Error("Error al obtener canciones")

    let songs = await resp.json()

    if (!songs || songs.length === 0) {
      alert("⚠️ Esta playlist no tiene canciones.")
      return
    }

    for (let i = 0; i < songs.length; i++) {
      songs[i] = await enrichSongData(songs[i])
    }

    state.currentPlaylist = playlistId
    state.queue = songs
    state.queueIndex = 0
    state.currentSong = songs[0]

    updatePlayerUI()
    playSong()
    updateQueue()
  } catch (error) {
    console.error("Error al reproducir playlist:", error)
    alert("❌ No se pudo reproducir la playlist.")
  }
}

function updateQueue() {
  if (state.queue.length === 0) {
    elements.queueList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Queue vacía</p>'
    return
  }

  const shuffleBtn = `
    <div style="padding: 10px; border-bottom: 1px solid var(--border-color, #444); display: flex; justify-content: center;">
      <button onclick="toggleShuffle()" style="
        padding: 8px 20px;
        background: ${state.shuffleMode ? 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)' : 'rgba(255, 255, 255, 0.1)'};
        color: white;
        border: 1px solid ${state.shuffleMode ? '#3498db' : 'rgba(255, 255, 255, 0.2)'};
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        transition: all 0.2s ease;
      " onmouseover="this.style.opacity='0.8'"
         onmouseout="this.style.opacity='1'">
        🔀 ${state.shuffleMode ? 'Desactivar Aleatorio' : 'Activar Aleatorio'}
      </button>
    </div>
  `

  elements.queueList.innerHTML = shuffleBtn + state.queue.map((song, idx) => `
    <div class="queue-item ${idx === state.queueIndex ? "playing" : ""}" onclick="playFromQueue(${idx})" style="
      padding: 12px;
      border-bottom: 1px solid var(--border-color, #444);
      cursor: pointer;
      transition: background 0.2s;
      ${idx === state.queueIndex ? 'background: rgba(102, 126, 234, 0.2); font-weight: 600;' : ''}
    " onmouseover="this.style.background='rgba(255, 255, 255, 0.05)'"
       onmouseout="this.style.background='${idx === state.queueIndex ? 'rgba(102, 126, 234, 0.2)' : 'transparent'}'">
      ${idx === state.queueIndex ? "▶ " : ""}${song.nombre} <span style="color: var(--text-secondary); font-size: 12px;">(${song.duracion})</span>
    </div>
  `).join("")
}

function toggleShuffle() {
  if (state.queue.length === 0) return

  state.shuffleMode = !state.shuffleMode

  if (state.shuffleMode) {
    // Guardar cola original si no existe
    if (state.originalQueue.length === 0) {
      state.originalQueue = [...state.queue]
    }
    
    const currentSong = state.queue[state.queueIndex]
    const otherSongs = state.queue.filter((_, idx) => idx !== state.queueIndex)
    const shuffledOthers = shuffleArray(otherSongs)
    
    state.queue = [currentSong, ...shuffledOthers]
    state.queueIndex = 0
  } else {
    // Restaurar orden original
    if (state.originalQueue.length > 0) {
      const currentSong = state.queue[state.queueIndex]
      state.queue = [...state.originalQueue]
      state.queueIndex = state.queue.findIndex(s => s.id_cancion === currentSong.id_cancion)
      if (state.queueIndex === -1) state.queueIndex = 0
    }
  }

  updateQueue()
}

function playFromQueue(idx) {
  state.queueIndex = idx
  state.currentSong = state.queue[idx]
  updatePlayerUI()
  playSong()
}

// ========================================
// DETALLES DE CANCIÓN
// ========================================
function showSongDetail(song) {
  document.getElementById("modalTitle").textContent = song.nombre
  document.getElementById("modalArtist").textContent = song.album_name || "Artista"
  document.getElementById("modalDuration").textContent = "⏱️ Duración: " + song.duracion
  document.getElementById("modalAlbum").textContent = "💿 " + (song.album_name || "Álbum")
  document.getElementById("modalCover").src = song.album_cover || song.caratula_path

  document.getElementById("addToPlaylistBtn").onclick = () => showAddToPlaylistModalForSong(song)

  // ❌ ELIMINADO: Ocultar botón de deshabilitar y favoritos para bandas
  const disableBtn = document.getElementById("toggleDisableBtn")
  const disableSection = document.getElementById("modalDisableSection")
  const favBtn = document.getElementById("toggleFavBtn")
  
  if (disableBtn) disableBtn.style.display = "none"
  if (disableSection) disableSection.style.display = "none"
  if (favBtn) favBtn.style.display = "none"

  elements.songDetailModal.style.display = "flex"
}
async function toggleSongDisabled(songId, isCurrentlyActive) {
  try {
    const endpoint = isCurrentlyActive ? "/api/canciones/deshabilitar" : "/api/canciones/habilitar"

    const resp = await fetch(`${state.baseUrl}${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
      body: JSON.stringify({ id_cancion: songId }),
    })

    if (!resp.ok) {
      const error = await resp.json()
      alert("Error: " + (error.error || "No se pudo cambiar el estado"))
      return
    }

    alert(isCurrentlyActive ? "Canción deshabilitada" : "Canción habilitada")
    closeAllModals()
    loadSongs()
  } catch (error) {
    console.error("Error:", error)
    alert("Error al cambiar el estado de la canción")
  }
}

function addSingleToPlaylist(songId, songName) {
  const song = state.songs.find((s) => s.id_cancion === songId)

  if (!song) {
    const tempSong = { id_cancion: songId, nombre: songName, duracion: "00:00" }
    showAddToPlaylistModalForSong(tempSong)
  } else {
    showAddToPlaylistModalForSong(song)
  }
}

// ========================================
// AGREGAR A PLAYLIST
// ========================================
function showAddToPlaylistModalForSong(song) {
  const container = document.getElementById("playlistsForAdd")

  if (!song || !song.id_cancion) {
    alert("No se pudo identificar la canción.")
    return
  }

  if (!state.playlists || state.playlists.length === 0) {
    container.innerHTML = '<p style="text-align:center;">No tienes playlists aún.</p>'
    elements.addToPlaylistModal.style.display = "flex"
    elements.addToPlaylistModal.style.zIndex = "10000"
    return
  }

  container.innerHTML = ""
  state.playlists.forEach((pl) => {
    const div = document.createElement("div")
    div.className = "playlist-option"
    div.style.cssText = `
      cursor: pointer;
      padding: 15px;
      margin: 8px 0;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      transition: all 0.2s ease;
      border: 1px solid rgba(255, 255, 255, 0.1);
    `
    div.innerHTML = `
      <div class="playlist-option-info">
        <div class="playlist-option-title" style="font-size: 15px; font-weight: 600; margin-bottom: 5px;">${pl.nombre}</div>
        <div class="playlist-option-count" style="font-size: 12px; color: var(--text-secondary);">Creada: ${pl.fecha_cracion}</div>
      </div>
    `

    div.onmouseover = () => {
      div.style.background = "rgba(255, 255, 255, 0.1)"
      div.style.transform = "translateX(5px)"
    }
    div.onmouseout = () => {
      div.style.background = "rgba(255, 255, 255, 0.05)"
      div.style.transform = "translateX(0)"
    }

    div.addEventListener("click", async () => {
      await addSongToPlaylist(pl.id_playlist, song.id_cancion)
    })

    container.appendChild(div)
  })

  elements.addToPlaylistModal.style.display = "flex"
  elements.addToPlaylistModal.style.zIndex = "10000"
}

async function addSongToPlaylist(playlistId, songId) {
  try {
    const resp = await fetch(`${state.baseUrl}/api/agregar_cancion_playlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
      body: JSON.stringify({ id_playlist: playlistId, id_cancion: songId }),
    })

    const data = await resp.json()

    if (resp.ok) {
      alert("✅ Canción agregada a la playlist correctamente.")
      closeAllModals()
    } else {
      alert("❌ Error: " + (data.error || "No se pudo agregar."))
    }
  } catch (error) {
    console.error("Error al agregar canción:", error)
    alert("⚠️ Error inesperado al agregar la canción.")
  }
}

// ========================================
// ENRIQUECER DATOS DE CANCIÓN
// ========================================
async function enrichSongData(song) {
  try {
    if (!song || song.album_cover || song.caratula_path) return song

    const resp = await fetch(`${state.baseUrl}/api/albums_listar`, {
      headers: { Authorization: `Bearer ${state.token}` },
    })

    if (!resp.ok) throw new Error("No se pudieron obtener los álbumes")

    const albums = await resp.json()
    let match = song.id_album ? albums.find(a => a.id_album === song.id_album) : null

    if (!match) {
      match = albums.find(a => song.nombre?.toLowerCase().includes(a.nombre_album?.toLowerCase() || ""))
    }

    if (match) {
      song.album_cover = match.caratula_dir
      song.album_name = match.nombre_album
    }

    return song
  } catch (err) {
    console.warn("Error completando datos de canción:", err)
    return song
  }
}

// ========================================
// MODALES
// ========================================
function closeAllModals() {
  elements.createPlaylistModal.style.display = "none"
  elements.songDetailModal.style.display = "none"
  elements.addToPlaylistModal.style.display = "none"
  elements.albumDetailModal.style.display = "none"
  closeContextMenu()
}

// ========================================
// LOGOUT
// ========================================
function logout() {
  if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
    localStorage.removeItem("token")
    localStorage.removeItem("userRole")
    localStorage.removeItem("userId")
    window.location.href = "/"
  }
}

// ========================================
// UTILIDADES
// ========================================
function shuffleArray(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
// ========================================
// PERFIL PERSONAL - USUARIOS FINALES
// ========================================
async function cargarDatosUsuario() {
  try {
    const resp = await fetch(`${state.baseUrl}/api/usuarios/mi-perfil`, {
      headers: { Authorization: `Bearer ${state.token}` }
    })
    
    if (resp.ok) {
      const user = await resp.json()
      
      // Verificar que los elementos existan antes de asignar
      const nombreInput = document.getElementById("user-nombre")
      const apellidoInput = document.getElementById("user-apellido")
      const emailInput = document.getElementById("user-email")
      const telInput = document.getElementById("user-tel")
      
      if (nombreInput) nombreInput.value = user.nombre || ""
      if (apellidoInput) apellidoInput.value = user.apellido || ""
      if (emailInput) emailInput.value = user.email || ""
      if (telInput) telInput.value = user.celular || ""
      
      console.log("✅ Datos del usuario cargados:", user.nombre)
    } else {
      console.error("❌ Error al cargar perfil")
    }
  } catch (error) {
    console.error("❌ Error cargando datos:", error)
  }
}

async function guardarDatosPersonales() {
  const nombre = document.getElementById("user-nombre")?.value.trim()
  const apellido = document.getElementById("user-apellido")?.value.trim()
  const email = document.getElementById("user-email")?.value.trim()
  const celular = document.getElementById("user-tel")?.value.trim()
  const password = document.getElementById("user-password")?.value.trim()
  
  if (!nombre || !email) {
    alert("❌ Nombre y correo son obligatorios")
    return
  }
  
  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    alert("❌ El correo no es válido")
    return
  }
  
  const payload = { nombre, apellido, email, celular }
  
  // Si hay contraseña, validarla
  const cambioPassword = !!password // 👈 Detectar si cambió contraseña
  if (password) {
    if (password.length < 8) {
      alert("❌ La contraseña debe tener al menos 8 caracteres")
      return
    }
    payload.password = password
  }
  
  try {
    const resp = await fetch(`${state.baseUrl}/api/usuarios/actualizar-perfil`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.token}` 
      },
      body: JSON.stringify(payload)
    })
    
    const data = await resp.json()
    
    if (resp.ok) {
      alert("✅ Perfil actualizado correctamente" + (cambioPassword ? ". Debes iniciar sesión nuevamente." : ""))
      
      if (cambioPassword) {
        // ✅ Si cambió contraseña, cerrar sesión
        localStorage.removeItem('token')
        localStorage.removeItem('tipo_user')
        localStorage.removeItem('id_user')
        window.location.href = '/'
      } else {
        // Solo limpiar campo de contraseña si NO la cambió
        const passwordInput = document.getElementById("user-password")
        if (passwordInput) passwordInput.value = ""
        
        // Recargar datos
        cargarDatosUsuario()
      }
    } else {
      alert("❌ " + (data.error || "Error al actualizar"))
    }
  } catch (error) {
    console.error("❌ Error:", error)
    alert("❌ Error de conexión")
  }
}
//GLOBALES//
window.guardarDatosPersonales = guardarDatosPersonales
window.cargarDatosUsuario = cargarDatosUsuario
window.selectSong = selectSong
window.playFromQueue = playFromQueue
window.showSongDetail = showSongDetail
window.showAddToPlaylistModalForSong = showAddToPlaylistModalForSong
window.addSongToPlaylist = addSongToPlaylist
window.addAlbumToPlaylist = addAlbumToPlaylist
window.playAlbum = playAlbum
window.playPlaylist = playPlaylist
window.deletePlaylist = deletePlaylist
window.closeAllModals = closeAllModals
window.showAlbumDetail = showAlbumDetail
window.toggleSongDisabled = toggleSongDisabled
window.addSingleToPlaylist = addSingleToPlaylist
window.performSearch = performSearch
window.showContextMenu = showContextMenu
window.closeContextMenu = closeContextMenu
window.togglePlaylistExpand = togglePlaylistExpand
window.loadPlaylistSongs = loadPlaylistSongs
window.removeFromPlaylist = removeFromPlaylist
window.saveNewPlaylist = saveNewPlaylist
window.loadPlaylists = loadPlaylists
window.logout = logout

// Advertencia al salir sin guardar

window.addEventListener('beforeunload', async (e) => {
  const hayArchivosNuevos = Object.values(uploadedFilesAlbum.canciones).some(c => c?.nuevo) || 
                            (uploadedFilesAlbum.caratula && uploadedFilesAlbum.caratula.nuevo)
  
  if (hayArchivosNuevos) {
    e.preventDefault()
    e.returnValue = '¿Seguro que quieres salir? Los archivos subidos se eliminarán.'
    return e.returnValue
  }
})