package utils

import (
	"errors"
	"log"
	models "proyecto-ptv-online/backend/servicios/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ObtenerCancionesPorAlbum obtiene todas las canciones de un álbum específico
func ObtenerCancionesPorAlbum(_db *gorm.DB, c *fiber.Ctx) error {
	var body struct {
		IdAlbum string `json:"id_album"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Datos inválidos",
		})
	}

	if body.IdAlbum == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El ID del álbum es requerido",
		})
	}

	log.Printf("🔍 Buscando canciones para álbum: %s\n", body.IdAlbum)

	var album models.Albums
	if err := _db.Where("id_album = ?", body.IdAlbum).First(&album).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Álbum no encontrado",
			})
		}
		log.Println("❌ Error al buscar álbum:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al buscar el álbum",
		})
	}

	// ✅ CRÍTICO: Seleccionar TODOS los campos incluyendo estado
	var canciones []models.Cancion
	if err := _db.Select("*").Where("id_album = ?", body.IdAlbum).Find(&canciones).Error; err != nil {
		log.Println("❌ Error al consultar canciones:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al consultar las canciones",
		})
	}

	// ✅ Log para debugging
	for _, cancion := range canciones {
		log.Printf("   📀 %s | Estado: '%s' | Reprod: %d\n", cancion.Nombre, cancion.Estado, cancion.N_reproduccion)
	}

	log.Printf("✅ Canciones encontradas para álbum %s: %d\n", body.IdAlbum, len(canciones))
	return c.JSON(canciones)
}

// ActualizarCancion actualiza los datos de una canción
// ActualizarCancion actualiza una canción por su ID (recibido en el body)
func ActualizarCancion(_db *gorm.DB, c *fiber.Ctx) error {
	var body struct {
		IdCancion   string `json:"id_cancion"`
		Nombre      string `json:"nombre"`
		Descrip     string `json:"descrip"`
		Duracion    string `json:"duracion"`
		CancionPath string `json:"cancion_path"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Datos inválidos",
		})
	}

	if body.IdCancion == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El ID de la canción es requerido",
		})
	}

	var cancion models.Cancion
	if err := _db.Where("id_cancion = ?", body.IdCancion).First(&cancion).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Canción no encontrada",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al buscar la canción",
		})
	}

	// ✅ Actualizar TODOS los campos (incluyendo duración)
	result := _db.Model(&models.Cancion{}).
		Where("id_cancion = ?", body.IdCancion).
		Updates(map[string]interface{}{
			"nombre":       body.Nombre,
			"descrip":      body.Descrip,
			"duracion":     body.Duracion,
			"cancion_path": body.CancionPath,
		})

	if result.Error != nil {
		log.Println("❌ Error al actualizar canción:", result.Error)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al actualizar la canción",
		})
	}

	log.Printf("✅ Canción actualizada: %s\n", body.IdCancion)
	return c.JSON(fiber.Map{
		"mensaje": "Canción actualizada correctamente",
	})
}

func CambiarEstadoCancion(_db *gorm.DB, c *fiber.Ctx) error {
	var body struct {
		IdCancion string `json:"id_cancion"`
		Estado    string `json:"estado"`
	}

	if err := c.BodyParser(&body); err != nil {
		log.Println("❌ Error al parsear body:", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Datos inválidos",
		})
	}

	log.Printf("📥 Recibido: id_cancion='%s', estado='%s'\n", body.IdCancion, body.Estado)

	if body.IdCancion == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El ID de la canción es requerido",
		})
	}

	if body.Estado != "activo" && body.Estado != "deshabilitado" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Estado inválido. Debe ser 'activo' o 'deshabilitado'",
		})
	}

	var cancion models.Cancion
	if err := _db.Where("id_cancion = ?", body.IdCancion).First(&cancion).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Canción no encontrada",
			})
		}
		log.Println("❌ Error al buscar canción:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al buscar la canción",
		})
	}

	log.Printf("🔍 Canción encontrada: '%s' | Estado actual: '%s'\n", cancion.Nombre, cancion.Estado)

	// ✅ Usar Update (singular) no Updates (plural)
	result := _db.Model(&models.Cancion{}).
		Where("id_cancion = ?", body.IdCancion).
		Update("estado", body.Estado)

	if result.Error != nil {
		log.Println("❌ Error al actualizar estado:", result.Error)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al actualizar el estado",
		})
	}

	if result.RowsAffected == 0 {
		log.Println("⚠️ No se actualizó ninguna fila")
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "No se pudo actualizar el estado",
		})
	}

	log.Printf("✅ Estado actualizado: '%s' -> '%s' (Filas: %d)\n", body.IdCancion, body.Estado, result.RowsAffected)

	return c.JSON(fiber.Map{
		"mensaje": "Estado actualizado correctamente",
		"estado":  body.Estado,
	})
}

// EliminarCancion elimina una canción de la base de datos
func EliminarCancion(_db *gorm.DB, c *fiber.Ctx) error {
	var idCancion struct {
		Id_cancion string `json:"id_cancion"`
	}
	c.BodyParser(&idCancion)
	log.Println("id cancion", idCancion.Id_cancion)
	if idCancion.Id_cancion == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El ID de la canción es requerido",
		})
	}

	// Verificar que la canción existe
	var cancion models.Cancion
	if err := _db.Where("id_cancion = ?", idCancion.Id_cancion).First(&cancion).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "Canción no encontrada",
			})
		}
		log.Println("❌ Error al buscar canción:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al buscar la canción",
		})
	}

	// Eliminar la canción
	if err := _db.Delete(&cancion).Error; err != nil {
		log.Println("❌ Error al eliminar canción:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al eliminar la canción",
		})
	}

	log.Printf("✅ Canción eliminada: %s\n", idCancion)
	return c.JSON(fiber.Map{
		"mensaje": "Canción eliminada correctamente",
	})
}

// DeshabilitarCancion desabilita una canción (solo para banda/curador)
func DeshabilitarCancion(_db *gorm.DB, c *fiber.Ctx) error {
	usuarioTipo := c.Locals("usuario_tipo").(string)

	if usuarioTipo != "banda" && usuarioTipo != "curador" && usuarioTipo != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "No tienes permisos para deshabilitar canciones",
		})
	}

	var body struct {
		IdCancion string `json:"id_cancion"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Datos inválidos",
		})
	}

	if body.IdCancion == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El ID de la canción es requerido",
		})
	}

	var cancion models.Cancion
	if err := _db.Where("id_cancion = ?", body.IdCancion).First(&cancion).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Canción no encontrada",
		})
	}

	// Actualizar estado a deshabilitado
	result := _db.Model(&models.Cancion{}).
		Where("id_cancion = ?", body.IdCancion).
		Update("estado", "deshabilitado")

	if result.Error != nil {
		log.Println("❌ Error al deshabilitar canción:", result.Error)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al deshabilitar la canción",
		})
	}

	log.Printf("✅ Canción deshabilitada: %s\n", body.IdCancion)
	return c.JSON(fiber.Map{
		"mensaje": "Canción deshabilitada correctamente",
	})
}

// HabilitarCancion habilita una canción (solo para admin o banda propietaria)
func HabilitarCancion(_db *gorm.DB, c *fiber.Ctx) error {
	usuarioTipo := c.Locals("usuario_tipo").(string)

	if usuarioTipo != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Solo administradores pueden habilitar canciones",
		})
	}

	var body struct {
		IdCancion string `json:"id_cancion"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Datos inválidos",
		})
	}

	if body.IdCancion == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El ID de la canción es requerido",
		})
	}

	var cancion models.Cancion
	if err := _db.Where("id_cancion = ?", body.IdCancion).First(&cancion).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Canción no encontrada",
		})
	}

	// Actualizar estado a activo
	result := _db.Model(&models.Cancion{}).
		Where("id_cancion = ?", body.IdCancion).
		Update("estado", "activo")

	if result.Error != nil {
		log.Println("❌ Error al habilitar canción:", result.Error)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al habilitar la canción",
		})
	}

	log.Printf("✅ Canción habilitada: %s\n", body.IdCancion)
	return c.JSON(fiber.Map{
		"mensaje": "Canción habilitada correctamente",
	})

}
