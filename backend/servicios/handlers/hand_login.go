package handlers

import (
	"fmt"
	servicios "proyecto-ptv-online/servicios/models"

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
	fmt.Printf("usuario Logueado ", user.Id_user)
	return c.JSON(fiber.Map{
		"direccion": "./static/SRC/html_templates/home.html",
		"mensaje":   "Login exitoso",
		"usuario":   validador_user.Nombre,
	})

}
