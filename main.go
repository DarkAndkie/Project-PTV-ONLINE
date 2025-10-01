package main

import (
	"fmt"
	"log"
	"proyecto-ptv-online/servicios/handlers"
	servicios "proyecto-ptv-online/servicios/models"

	"github.com/gofiber/fiber/v2"
)

func main() {
	fmt.Print("Hello world!")
	log.Println("Comenzamos proyecto PTV-Online")
	_DB := servicios.ConnectDB()
	sqlDB, err := _DB.DB()
	if err != nil {
		log.Fatal("Error obteniendo sql.DB:", err)
	}
	defer sqlDB.Close()
	app := fiber.New()
	app.Static("/static", "./static")

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendFile("./static/SRC/html_templates/index.html")
	})

	app.Get("/html_registro", func(c *fiber.Ctx) error {
		return c.SendFile("./static/SRC/html_templates/registro.html")
	})

	app.Post("/registro_post", func(c *fiber.Ctx) error {
		return handlers.RegistrarUsuario(_DB, c)

	})
	app.Post("/login_Post", func(c *fiber.Ctx) error {
		return handlers.LoginValidacion(_DB, c)
	})

	log.Fatal(app.Listen(":3000"))
}
