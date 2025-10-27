package main

import (
	"fmt"
	"log"
	config "proyecto-ptv-online/backend/servicios/config"
	"proyecto-ptv-online/backend/servicios/handlers"
	utils "proyecto-ptv-online/backend/servicios/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/joho/godotenv"
)

func init() {
	err := godotenv.Load("env.env")
	if err != nil {
		log.Fatal("Error cargando el archivo .env")
	}
}

func main() {
	fmt.Print("Hello world!")
	log.Println("Comenzamos proyecto PTV-Online")
	_DB := config.ConnectDB()
	sqlDB, err := _DB.DB()
	if err != nil {
		log.Fatal("Error obteniendo sql.DB:", err)
	}
	defer sqlDB.Close()
	app := fiber.New()
	app.Static("/", "./frontend")
	// app.Static("/Login_Imagenes", "./frontend/Login_Imagenes")

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendFile("./frontend/SRC/html_templates/index.html")
	})

	app.Get("/html_registro", func(c *fiber.Ctx) error {
		return c.SendFile("./frontend/SRC/html_templates/registro.html")
	})
	app.Get("/html_reg_album", func(c *fiber.Ctx) error {
		return c.SendFile("./frontend/SRC/html_templates/home_admin.html")
	})

	app.Post("/registro_post", func(c *fiber.Ctx) error {
		return utils.CrearUsuario(_DB, c)
	})
	app.Post("/login_Post", func(c *fiber.Ctx) error {
		return handlers.LoginValidacion(_DB, c)
	})
	app.Post("/api/crear_album_completo", func(c *fiber.Ctx) error {
		return utils.CrearAlbumCompleto(_DB, c)
	})
	app.Get(("/api/albums_listar"), func(c *fiber.Ctx) error {
		return utils.ListarAlbums(_DB, c)
	})
	app.Post("/verificar_codigo", func(c *fiber.Ctx) error {
		return utils.VerificarCodigo(_DB, c)
	})
	app.Get("/api/bandas", func(c *fiber.Ctx) error {
		return utils.ListarBandas(_DB, c)
	})
	app.Put("/api/actualizar_estado_album/:id", func(c *fiber.Ctx) error {
		return utils.ActualizarEstadoAlbum(_DB, c)
	})
	app.Get("/api/usuarios", func(c *fiber.Ctx) error {
		return utils.ListarUsuarios(_DB, c)
	})

	app.Get("/api/usuarios/buscar/:nombre", func(c *fiber.Ctx) error {
		return utils.BuscarUsuariosPorNombre(_DB, c)
	})

	app.Put("/api/usuarios/:id/tipo", func(c *fiber.Ctx) error {
		return utils.CambiarTipoUsuario(_DB, c)
	})

	app.Put("/api/usuarios/:id/estado", func(c *fiber.Ctx) error {
		return utils.CambiarEstadoUsuario(_DB, c)
	})

	app.Delete("/api/usuarios/:id", func(c *fiber.Ctx) error {
		return utils.EliminarUsuarioPorID(_DB, c)
	})
	log.Fatal(app.Listen(":3000"))
}
