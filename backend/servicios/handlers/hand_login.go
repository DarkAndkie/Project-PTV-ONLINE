package handlers

import (
	"fmt"
	"log"
	servicios "proyecto-ptv-online/backend/servicios/config"
	"proyecto-ptv-online/backend/servicios/models"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func LoginValidacion(_db *gorm.DB, c *fiber.Ctx) error {
	user := servicios.Usuario{}
	validador_user := servicios.Usuario{}

	if err := c.BodyParser(&user); err != nil {
		return c.Status(400).SendString("Error en el parseo del body" + err.Error())
	}
	//se vienen la condiciones 7w7

	if err1 := _db.Where("correo=?", user.Correo).First(&validador_user).Error; err1 != nil {
		return c.Status(400).SendString("El usuario no existe o el correo es incorrecto " + err1.Error())
	}

	if err := bcrypt.CompareHashAndPassword([]byte(validador_user.Password), []byte(user.Password)); err != nil {
		return c.Status(401).SendString("Contraseña incorrecta " + err.Error())
	}
	var validacion models.ValidacionCorreo
	err := _db.First(&validacion, "id_user = ?", validador_user.Id_user).Error
	if err != nil {
		return c.Status(401).SendString("Contraseña usuario no encontrado paara validar " + err.Error())
	}
	if validacion.Verificado == false {
		// Si existe un registro de validación y NO está verificado
		if !validacion.Verificado {
			log.Printf("⚠️ Usuario %s necesita verificar correo", validador_user.Correo)
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error":                 "Por favor verifica tu correo antes de iniciar sesión",
				"requiere_verificacion": true,
				"correo":                validador_user.Correo,
			})
		}
	}
	fmt.Printf("usuario Logueado ", user.Id_user)
	fmt.Printf("El tipo usuario: " + validador_user.Tipo_user)
	if validador_user.Tipo_user == "admin" || validador_user.Tipo_user == "Admin" {
		// por implementar tokens
		return c.JSON(fiber.Map{
			"direccion": "/SRC/html_templates/home_admin.html",
			"mensaje":   "Login exitoso",
			"usuario":   validador_user.Nombre,
		})
	}
	return c.JSON(fiber.Map{
		"direccion": "/SRC/html_templates/home.html",
		"mensaje":   "Login exitoso",
		"usuario":   validador_user.Nombre,
	})

}
