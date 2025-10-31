package utils

import (
	"errors"
	"log"
	models "proyecto-ptv-online/backend/servicios/models"
	"unicode/utf8"

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

	// Verificar que el álbum existe
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

	// Obtener todas las canciones del álbum
	var canciones []models.Cancion
	if err := _db.Where("id_album = ?", body.IdAlbum).Find(&canciones).Error; err != nil {
		log.Println("❌ Error al consultar canciones:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al consultar las canciones",
		})
	}

	log.Printf("✅ Canciones encontradas para álbum %s: %d\n", body.IdAlbum, len(canciones))
	return c.JSON(canciones)
}

// ActualizarCancion actualiza los datos de una canción
func ActualizarCancion(_db *gorm.DB, c *fiber.Ctx) error {
	idCancion := c.Params("id")

	if idCancion == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El ID de la canción es requerido",
		})
	}

	// Estructura para recibir los datos a actualizar
	var body struct {
		Nombre      string `json:"nombre"`
		Descrip     string `json:"descrip"`
		CancionPath string `json:"cancion_path"`
		Duracion    string `json:"duracion"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Datos inválidos",
		})
	}

	// Verificar que la canción existe
	var cancion models.Cancion
	if err := _db.Where("id_cancion = ?", idCancion).First(&cancion).Error; err != nil {
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

	// Validar los datos antes de actualizar
	if body.Nombre != "" {
		if utf8.RuneCountInString(body.Nombre) > 40 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "El nombre de la canción no puede ser superior a 40 caracteres",
			})
		}
		cancion.Nombre = body.Nombre
	}

	if body.Descrip != "" {
		if utf8.RuneCountInString(body.Descrip) > 300 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "La descripción de la canción no puede ser superior a 300 caracteres",
			})
		}
		cancion.Descrip = body.Descrip
	}

	if body.CancionPath != "" {
		// Validar URL
		if !existeElArchivo(body.CancionPath, "audio") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "El enlace de la canción es inválido",
			})
		}
		cancion.Cancion_path = body.CancionPath
	}

	if body.Duracion != "" {
		if err := validarDuracionCancion(body.Duracion); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		cancion.Duracion = body.Duracion
	}

	// Actualizar la canción en la base de datos
	if err := _db.Save(&cancion).Error; err != nil {
		log.Println("❌ Error al actualizar canción:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al actualizar la canción",
		})
	}

	log.Printf("✅ Canción actualizada: %s\n", idCancion)
	return c.JSON(fiber.Map{
		"mensaje": "Canción actualizada correctamente",
		"cancion": cancion,
	})
}

// CambiarEstadoCancion cambia el estado de una canción (habilitada/deshabilitada)
// Nota: Como el modelo Cancion no tiene un campo "estado" explícito,
// usaremos una convención: si n_reproduccion es -1, está deshabilitada
// O puedes agregar un campo "estado" al modelo si lo prefieres
func CambiarEstadoCancion(_db *gorm.DB, c *fiber.Ctx) error {
	idCancion := c.Params("id")

	if idCancion == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El ID de la canción es requerido",
		})
	}

	var body struct {
		Estado string `json:"estado"` // "activo" o "deshabilitado"
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Datos inválidos",
		})
	}

	if body.Estado != "activo" && body.Estado != "deshabilitado" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Estado inválido. Debe ser 'activo' o 'deshabilitado'",
		})
	}

	// Verificar que la canción existe
	var cancion models.Cancion
	if err := _db.Where("id_cancion = ?", idCancion).First(&cancion).Error; err != nil {
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

	// Actualizar el estado
	// Como el modelo no tiene campo "estado", usamos n_reproduccion como indicador
	// -1 = deshabilitado, >= 0 = activo
	var nuevoValor int
	if body.Estado == "deshabilitado" {
		nuevoValor = -1
	} else {
		// Si estaba deshabilitado, lo ponemos en 0, si no, mantenemos el valor actual
		if cancion.N_reproduccion == -1 {
			nuevoValor = 0
		} else {
			nuevoValor = cancion.N_reproduccion
		}
	}

	result := _db.Model(&models.Cancion{}).
		Where("id_cancion = ?", idCancion).
		Update("n_reproduccion", nuevoValor)

	if result.Error != nil {
		log.Println("❌ Error al actualizar estado:", result.Error)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al actualizar el estado",
		})
	}

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Canción no encontrada",
		})
	}

	log.Printf("✅ Estado de canción actualizado: %s -> %s\n", idCancion, body.Estado)
	return c.JSON(fiber.Map{
		"mensaje": "Estado actualizado correctamente",
		"estado":  body.Estado,
	})
}

// EliminarCancion elimina una canción de la base de datos
func EliminarCancion(_db *gorm.DB, c *fiber.Ctx) error {
	idCancion := c.Params("id")

	if idCancion == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El ID de la canción es requerido",
		})
	}

	// Verificar que la canción existe
	var cancion models.Cancion
	if err := _db.Where("id_cancion = ?", idCancion).First(&cancion).Error; err != nil {
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
