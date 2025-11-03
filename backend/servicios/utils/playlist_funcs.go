package utils

import (
	"fmt"
	"proyecto-ptv-online/backend/servicios/models"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// CrearPlaylist - Crear playlist para usuario final
func CrearPlaylist(db *gorm.DB, c *fiber.Ctx) error {
	usuarioIDInterface := c.Locals("usuario_id")
	if usuarioIDInterface == nil {
		return c.Status(401).JSON(fiber.Map{"error": "No autenticado"})
	}

	userID, ok := usuarioIDInterface.(int)
	if !ok {
		return c.Status(400).JSON(fiber.Map{"error": "Usuario ID inválido"})
	}

	req := struct {
		Nombre string `json:"nombre"`
	}{}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos"})
	}

	if req.Nombre == "" {
		return c.Status(400).JSON(fiber.Map{"error": "El nombre es requerido"})
	}

	playlist := models.Playlist{
		Nombre:        req.Nombre,
		Id_user_final: userID,
		Estado:        "activo",
		Fecha_cracion: time.Now().Format("2006-01-02 15:04:05"),
	}

	if err := db.Create(&playlist).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error creando playlist"})
	}

	return c.JSON(fiber.Map{
		"mensaje":     "Playlist creada",
		"id_playlist": playlist.Id_playlist,
		"nombre":      playlist.Nombre,
	})
}

// ObtenerPlaylistsPorUsuario - Obtener playlists del usuario autenticado
func ObtenerPlaylistsPorUsuario(db *gorm.DB, c *fiber.Ctx) error {
	usuarioIDInterface := c.Locals("usuario_id")
	if usuarioIDInterface == nil {
		return c.Status(401).JSON(fiber.Map{"error": "No autenticado"})
	}

	userID, ok := usuarioIDInterface.(int)
	if !ok {
		return c.Status(400).JSON(fiber.Map{"error": "Usuario ID inválido"})
	}

	var playlists []models.Playlist
	if err := db.Where("id_user_final = ? AND estado = ?", userID, "activo").Find(&playlists).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error obteniendo playlists"})
	}

	if len(playlists) == 0 {
		return c.JSON([]models.Playlist{})
	}

	return c.JSON(playlists)
}

// AgregarCancionAPlaylist - Agregar canción a playlist
func AgregarCancionAPlaylist(db *gorm.DB, c *fiber.Ctx) error {
	usuarioIDInterface := c.Locals("usuario_id")
	if usuarioIDInterface == nil {
		return c.Status(401).JSON(fiber.Map{"error": "No autenticado"})
	}

	userID, ok := usuarioIDInterface.(int)
	if !ok {
		return c.Status(400).JSON(fiber.Map{"error": "Usuario ID inválido"})
	}

	req := struct {
		Id_playlist string `json:"id_playlist"` // Cambiar a string porque id_playlist es text en la BD
		Id_cancion  string `json:"id_cancion"`
	}{}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos"})
	}

	var playlist models.Playlist
	if err := db.Where("id_playlist = ? AND id_user_final = ?", req.Id_playlist, userID).First(&playlist).Error; err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "Playlist no encontrada"})
	}

	// Verificar si la canción ya está en la playlist
	var existe models.Add_Playlist
	if db.Where("id_playlist = ? AND id_cancion = ?", req.Id_playlist, req.Id_cancion).First(&existe).RowsAffected > 0 {
		return c.Status(400).JSON(fiber.Map{"error": "La canción ya está en la playlist"})
	}

	addPlaylist := models.Add_Playlist{
		Id_cancion:  req.Id_cancion,
		Id_playlist: req.Id_playlist,
	}

	if err := db.Create(&addPlaylist).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error agregando canción"})
	}

	return c.JSON(fiber.Map{"mensaje": "Canción agregada a playlist"})
}

// EliminarCancionDePlaylist - Eliminar canción de playlist
func EliminarCancionDePlaylist(db *gorm.DB, c *fiber.Ctx) error {
	usuarioIDInterface := c.Locals("usuario_id")
	if usuarioIDInterface == nil {
		return c.Status(401).JSON(fiber.Map{"error": "No autenticado"})
	}

	userID, ok := usuarioIDInterface.(int)
	if !ok {
		return c.Status(400).JSON(fiber.Map{"error": "Usuario ID inválido"})
	}

	req := struct {
		Id_playlist string `json:"id_playlist"` // Cambiar a string
		Id_cancion  string `json:"id_cancion"`
	}{}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos"})
	}

	var playlist models.Playlist
	if err := db.Where("id_playlist = ? AND id_user_final = ?", req.Id_playlist, userID).First(&playlist).Error; err != nil {
		return c.Status(403).JSON(fiber.Map{"error": "Playlist no encontrada"})
	}

	if err := db.Where("id_playlist = ? AND id_cancion = ?", req.Id_playlist, req.Id_cancion).Delete(&models.Add_Playlist{}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error eliminando canción"})
	}

	return c.JSON(fiber.Map{"mensaje": "Canción eliminada de playlist"})
}

// ObtenerCancionesDePLaylist - Obtener canciones de una playlist
func ObtenerCancionesDePLaylist(db *gorm.DB, c *fiber.Ctx) error {
	req := struct {
		Id_playlist string `json:"id_playlist"` // Cambiar a string
	}{}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos"})
	}

	var canciones []models.Cancion
	if err := db.Joins("JOIN add_playlist ON cancion.id_cancion = add_playlist.id_cancion").
		Where("add_playlist.id_playlist = ? AND cancion.estado = ?", req.Id_playlist, "activo").
		Find(&canciones).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error obteniendo canciones"})
	}

	return c.JSON(canciones)
}

// BuscarCanciones - Buscar canciones por nombre
func BuscarCanciones(db *gorm.DB, c *fiber.Ctx) error {
	req := struct {
		Nombre string `json:"nombre"`
	}{}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos"})
	}

	if req.Nombre == "" {
		return c.JSON([]models.Cancion{})
	}

	var canciones []models.Cancion
	query := "%" + req.Nombre + "%"
	if err := db.Where("nombre ILIKE ? AND estado = ?", query, "activo").Limit(20).Find(&canciones).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error en búsqueda"})
	}

	return c.JSON(canciones)
}

// BuscarAlbumes - Buscar álbumes por nombre
func BuscarAlbumes(db *gorm.DB, c *fiber.Ctx) error {
	req := struct {
		Nombre string `json:"nombre"`
	}{}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos"})
	}

	if req.Nombre == "" {
		return c.JSON([]models.Albums{})
	}

	var albumes []models.Albums
	query := "%" + req.Nombre + "%"
	if err := db.Where("nombre_album ILIKE ? AND estado = ?", query, "activo").Limit(20).Find(&albumes).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error en búsqueda"})
	}

	return c.JSON(albumes)
}

// IncrementarReproducciones - Incrementar reproducciones de una canción
func IncrementarReproducciones(db *gorm.DB, c *fiber.Ctx) error {
	req := struct {
		Id_cancion string `json:"id_cancion"`
	}{}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos"})
	}

	if err := db.Model(&models.Cancion{}).Where("id_cancion = ?", req.Id_cancion).Update("n_reproduccion", gorm.Expr("n_reproduccion + 1")).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error incrementando reproducciones"})
	}

	return c.JSON(fiber.Map{"mensaje": "Reproducciones incrementadas"})
}

// ObtenerCancionesPorAlbumActivas - Obtener solo canciones activas de un álbum
func ObtenerCancionesPorAlbumActivas(db *gorm.DB, c *fiber.Ctx) error {
	req := struct {
		Id_album string `json:"id_album"`
	}{}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos"})
	}

	var canciones []models.Cancion
	if err := db.Where("id_album = ? AND estado = ?", req.Id_album, "activo").Find(&canciones).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Error obteniendo canciones"})
	}

	return c.JSON(canciones)
}
func EliminarPlaylist(db *gorm.DB, c *fiber.Ctx) error {
	var body = models.Playlist{}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "body inválido: " + err.Error()})
	}

	if body.Id_playlist == "" {
		return c.Status(400).JSON(fiber.Map{"error": "id_playlist requerido"})
	}

	// intentar convertir a int si tu BD guarda id numérico
	// si usas string en BD, ajusta la query
	// aquí asumo id numérico:
	var id int
	_, err := fmt.Sscanf(body.Id_playlist, "%d", &id)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "id_playlist inválido"})
	}

	// 1) eliminar relaciones canciones-playlist
	if err := db.Exec("DELETE FROM playlist_canciones WHERE id_playlist = ?", id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "error al eliminar canciones de playlist: " + err.Error()})
	}

	// 2) eliminar la playlist
	if err := db.Exec("DELETE FROM playlist WHERE id_playlist = ?", id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "error al eliminar playlist: " + err.Error()})
	}

	return c.JSON(fiber.Map{"mensaje": "Playlist eliminada"})
}
