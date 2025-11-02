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
	fmt.Println("Hello world!")
	log.Println("Comenzamos proyecto PTV-Online")

	// 🔗 Conexión a la base de datos
	_DB := config.ConnectDB()
	sqlDB, err := _DB.DB()
	if err != nil {
		log.Fatal("Error obteniendo sql.DB:", err)
	}
	defer sqlDB.Close()

	// 🚀 Inicializar Fiber
	app := fiber.New()

	// 🌐 Servir archivos estáticos
	app.Static("/", "./frontend")

	// -------------------------------
	// 🌍 Rutas HTML
	// -------------------------------
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendFile("./frontend/SRC/html_templates/index.html")
	})

	app.Get("/html_registro", func(c *fiber.Ctx) error {
		return c.SendFile("./frontend/SRC/html_templates/registro.html")
	})

	// 🔒 Solo el admin puede entrar al panel
	app.Get("/html_reg_album", utils.AutenticacionRequerida("admin"), func(c *fiber.Ctx) error {
		return c.SendFile("./frontend/SRC/html_templates/home_admin.html")
	})

	// -------------------------------
	// 👤 AUTENTICACIÓN
	// -------------------------------
	app.Post("/registro_post", func(c *fiber.Ctx) error {
		return utils.CrearUsuario(_DB, c)
	})

	app.Post("/login_Post", func(c *fiber.Ctx) error {
		return handlers.LoginValidacion(_DB, c)
	})

	app.Post("/verificar_codigo", func(c *fiber.Ctx) error {
		return utils.VerificarCodigo(_DB, c)
	})

	app.Post("/reenviar_codigo", func(c *fiber.Ctx) error {
		return utils.ReenviarCodigo(_DB, c)
	})

	// -------------------------------
	// 🎵 ÁLBUMES (solo admin)
	// -------------------------------
	app.Post("/api/crear_album_completo", utils.AutenticacionRequerida("admin"), func(c *fiber.Ctx) error {
		return utils.CrearAlbumCompleto(_DB, c)
	})

	app.Put("/api/actualizar_album_completo", utils.AutenticacionRequerida("admin"), func(c *fiber.Ctx) error {
		return utils.ActualizarAlbumConCanciones(_DB, c)
	})

	app.Get("/api/albums_listar", func(c *fiber.Ctx) error {
		return utils.ListarAlbums(_DB, c)
	})

	app.Put("/api/actualizar_estado_album/", utils.AutenticacionRequerida("admin"), func(c *fiber.Ctx) error {
		return utils.ActualizarEstadoAlbum(_DB, c)
	})

	app.Get("/api/albums/:id/canciones", func(c *fiber.Ctx) error {
		return utils.ObtenerCancionesPorAlbum(_DB, c)
	})

	// -------------------------------
	// 🎶 CANCIONES (solo admin)
	// -------------------------------
	app.Put("/api/canciones/actualizar", utils.AutenticacionRequerida("admin"), func(c *fiber.Ctx) error {
		return utils.ActualizarCancion(_DB, c)
	})

	app.Put("/api/canciones/estado", utils.AutenticacionRequerida("admin"), func(c *fiber.Ctx) error {
		return utils.CambiarEstadoCancion(_DB, c)
	})

	app.Delete("/api/canciones/:id", utils.AutenticacionRequerida("admin"), func(c *fiber.Ctx) error {
		return utils.EliminarCancion(_DB, c)
	})

	// -------------------------------
	// 🎸 BANDAS (público)
	// -------------------------------
	app.Get("/api/bandas", func(c *fiber.Ctx) error {
		return utils.ListarBandas(_DB, c)
	})

	// -------------------------------
	// 👥 USUARIOS (solo admin)
	// -------------------------------
	app.Get("/api/usuarios", utils.AutenticacionRequerida("admin"), func(c *fiber.Ctx) error {
		return utils.ListarUsuarios(_DB, c)
	})

	app.Get("/api/usuarios/buscar/:nombre", utils.AutenticacionRequerida("admin"), func(c *fiber.Ctx) error {
		return utils.BuscarUsuariosPorNombre(_DB, c)
	})

	app.Put("/api/usuarios/:id/tipo", utils.AutenticacionRequerida("admin"), func(c *fiber.Ctx) error {
		return utils.CambiarTipoUsuario(_DB, c)
	})

	app.Put("/api/usuarios/:id/estado", utils.AutenticacionRequerida("admin"), func(c *fiber.Ctx) error {
		return utils.CambiarEstadoUsuario(_DB, c)
	})

	app.Delete("/api/usuarios/:id", utils.AutenticacionRequerida("admin"), func(c *fiber.Ctx) error {
		return utils.EliminarUsuarioPorID(_DB, c)
	})

	// -------------------------------
	// 🚀 Inicio del servidor
	// -------------------------------
	log.Println("🚀 Servidor iniciado en http://localhost:3000")
	log.Fatal(app.Listen(":3000"))
}
