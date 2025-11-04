// ========================================
// ESTADO GLOBAL
// ========================================
const state = {
  token: localStorage.getItem("token"),
  userRole: localStorage.getItem("userRole") || "finalusuario",
  userId: localStorage.getItem("userId"),
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

// ========================================
// ELEMENTOS DEL DOM
// ========================================
const elements = {
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
  playlistDescription: document.getElementById("playlistDescription"),
  modalCloseButtons: document.querySelectorAll(".modal-close"),
  searchInput: document.getElementById("searchInput"),
  searchResults: document.getElementById("searchResults"),
  filterBtns: document.querySelectorAll(".filter-btn"),
  userRole: document.getElementById("userRole"),
  contextMenu: null,
}

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener("DOMContentLoaded", () => {
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
    banda: "Banda",
    artista: "Artista",
    finalusuario: "Usuario",
  }
  if (elements.userRole) {
    elements.userRole.textContent = roleMap[state.userRole] || "Usuario"
  }

  initEventListeners()
  loadSongs()
  loadPlaylists()
})

// ========================================
// EVENT LISTENERS
// ========================================
function initEventListeners() {
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
      if (album.estado !== "activo") continue

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
          <div class="play-icon">▶️</div>
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

  if (state.userRole === "admin" || state.userRole === "curador") {
    options.push({
      text: song.estado === "activo" ? "🚫 Deshabilitar" : "✅ Habilitar",
      action: () => toggleSongDisabled(songId, song.estado === "activo"),
    })
  }

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
        if (songs && Array.isArray(songs)) results.songs = songs.map((song) => ({ ...song, type: "song" }))
      }
    }

    if (state.searchFilter === "all" || state.searchFilter === "albums") {
      const albumResp = await fetch(`${state.baseUrl}/api/buscar/albumes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}` },
        body: JSON.stringify({ nombre: query }),
      })

      if (albumResp.ok) {
        const albums = await albumResp.json()
        if (albums && Array.isArray(albums)) {
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
          <div class="song-card-overlay"><div class="play-icon">▶️</div></div>
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
          ▶️ Reproducir
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
          🔀 Aleatorio
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
          ▶️ Reproducir
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
          <div style="font-size: 12px; color: var(--text-secondary);">⏱️ ${song.duracion} • ▶️ ${song.n_reproduccion || 0}</div>
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
      ${idx === state.queueIndex ? "▶️ " : ""}${song.nombre} <span style="color: var(--text-secondary); font-size: 12px;">(${song.duracion})</span>
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

  const disableBtn = document.getElementById("toggleDisableBtn")
  const disableSection = document.getElementById("modalDisableSection")

  if (state.userRole === "curador") {
    disableBtn.style.display = "block"
    disableBtn.textContent = song.estado === "activo" ? "Deshabilitar canción" : "Habilitar canción"
    disableBtn.onclick = () => toggleSongDisabled(song.id_cancion, song.estado === "activo")
    disableSection.style.display = "block"
    document.getElementById("disableInfo").textContent = song.estado === "activo" ? "Eres administrador/curador. Puedes deshabilitar esta canción." : "Esta canción está deshabilitada."
  } else {
    disableBtn.style.display = "none"
    disableSection.style.display = "none"
  }

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
// GLOBALES
// ========================================
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