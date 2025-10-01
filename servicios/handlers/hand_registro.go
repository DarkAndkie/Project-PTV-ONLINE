package handlers

import (
	"log"
	servicios "proyecto-ptv-online/servicios/models"
	utils "proyecto-ptv-online/servicios/utils"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func RegistrarUsuario(_db *gorm.DB, c *fiber.Ctx) error {
	user := servicios.Usuario{}
	if err := c.BodyParser(&user); err != nil {
		return c.Status(400).SendString("Error en el parseo del body: " + err.Error())
	}

	validador_user := servicios.Usuario{}
	//validaremos esta wea
	if err_1 := _db.First(&validador_user, "id_user =? ", user.Id_user).Error; err_1 == nil {
		return c.Status(400).SendString("El usuario ya existe")
	}
	if err_2 := _db.First(&validador_user, "correo =?", user.Correo).Error; err_2 == nil {
		return c.Status(400).SendString("El correo ya está Registrado")
	}
	if err_3 := utils.PasswordFormato(user.Password); err_3 != nil {
		return c.Status(400).SendString(("Error en el formato de contraseña:" + err_3.Error()))
	}
	//cifraré la wea contraseñosa
	hash, err := utils.CifrarContraseña(user.Password)
	if err != nil {
		return c.Status(400).SendString("Error en el cifrado de contrasñea: " + err.Error())
	}
	user.Password = hash
	log.Printf("Usuario a registrar: %+v\n", user)

	_db.Create(&user)

	return c.JSON(user)
}
