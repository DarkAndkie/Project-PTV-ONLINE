package handlers

import (
	"fmt"
	"log"

	servicios "proyecto-ptv-online/backend/servicios/config"
	"proyecto-ptv-online/backend/servicios/models"
	utils "proyecto-ptv-online/backend/servicios/utils"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func LoginValidacion(_db *gorm.DB, c *fiber.Ctx) error {
	user := servicios.Usuario{}
	validador_user := servicios.Usuario{}

	// Parsear body
	if err := c.BodyParser(&user); err != nil {

		// ✅ POR ESTA:
		return c.Status(400).JSON(fiber.Map{"error": "Error en el parseo del body: " + err.Error()})
	}

	// Buscar usuario por correo
	if err1 := _db.Where("correo = ?", user.Correo).First(&validador_user).Error; err1 != nil {

		// ✅ POR ESTA:
		return c.Status(400).JSON(fiber.Map{"error": "Usuario no encontrado o correo incorrecto"})
	}

	// Comparar contraseñas
	if err := bcrypt.CompareHashAndPassword([]byte(validador_user.Password), []byte(user.Password)); err != nil {

		// ✅ POR ESTA:
		return c.Status(401).JSON(fiber.Map{"error": "Contraseña incorrecta"})
	}

	// Verificar si el correo fue validado
	var validacion models.ValidacionCorreo
	err := _db.First(&validacion, "id_user = ?", validador_user.Id_user).Error
	if err != nil {

		// ✅ POR ESTA:
		return c.Status(401).JSON(fiber.Map{"error": "Error al verificar usuario"})
	}

	if validacion.Verificado == false {
		log.Printf("⚠️ Usuario %s necesita verificar correo", validador_user.Correo)
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error":                 "Por favor verifica tu correo antes de iniciar sesión",
			"requiere_verificacion": true,
			"correo":                validador_user.Correo,
		})
	}

	// ✅ Generar token JWT con los datos del usuario
	token, err := utils.GenerarTokenFromFields(
		validador_user.Id_user,
		validador_user.Correo,
		string(validador_user.Tipo_user),
	)
	if err != nil {

		// ✅ POR ESTA:
		return c.Status(500).JSON(fiber.Map{"error": "Error al generar token de sesión"})
	}

	// Logs en consola
	fmt.Printf("✅ Usuario logueado: %s (%s)\n", validador_user.Nombre, validador_user.Tipo_user)

	// Si es admin, redirige al home admin
	if validador_user.Tipo_user == "admin" || validador_user.Tipo_user == "master" {
		return c.JSON(fiber.Map{
			"direccion": "/SRC/html_templates/home_admin.html",
			"mensaje":   "Login exitoso",
			"usuario":   validador_user.Nombre,
			"id_user":   validador_user.Id_user,
			"token":     token,
			"tipo_user": validador_user.Tipo_user,
		})
	}

	// Si es usuario final
	return c.JSON(fiber.Map{
		"direccion": "/SRC/html_templates/home.html",
		"mensaje":   "Login exitoso",
		"usuario":   validador_user.Nombre,
		"id_user":   validador_user.Id_user,
		"token":     token,
		"tipo_user": validador_user.Tipo_user,
	})
}
