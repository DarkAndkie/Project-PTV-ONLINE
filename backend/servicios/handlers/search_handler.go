package handlers

import (
	"proyecto-ptv-online/backend/servicios/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// BuscarAlbumes busca álbumes por nombre
func BuscarAlbumes(_db *gorm.DB, c *fiber.Ctx) error {
	searchReq := struct {
		Query string `json:"query"`
	}{}

	if err := c.BodyParser(&searchReq); err != nil {
		return c.Status(400).SendString("Error parseando body: " + err.Error())
	}

	if searchReq.Query == "" {
		return c.Status(400).SendString("El parámetro 'query' es requerido")
	}

	var albumes []models.Albums
	if err := _db.Where("nombre_album ILIKE ? AND estado = ?", "%"+searchReq.Query+"%", "activo").
		Find(&albumes).Error; err != nil {
		return c.Status(500).SendString("Error en búsqueda: " + err.Error())
	}

	return c.JSON(albumes)
}

// BuscarCanciones busca canciones activas por nombre
func BuscarCanciones(_db *gorm.DB, c *fiber.Ctx) error {
	searchReq := struct {
		Query string `json:"query"`
	}{}

	if err := c.BodyParser(&searchReq); err != nil {
		return c.Status(400).SendString("Error parseando body: " + err.Error())
	}

	if searchReq.Query == "" {
		return c.Status(400).SendString("El parámetro 'query' es requerido")
	}

	var canciones []models.Cancion
	if err := _db.Where("nombre ILIKE ? AND estado = ?", "%"+searchReq.Query+"%", "activo").
		Find(&canciones).Error; err != nil {
		return c.Status(500).SendString("Error en búsqueda: " + err.Error())
	}

	return c.JSON(canciones)
}
