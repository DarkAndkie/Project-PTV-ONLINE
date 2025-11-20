package main

import (
	"fmt"
	"log"
	"os"

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

	app.Use(func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader != "" {
			userID, userRole, err := utils.ExtraerInfoDelToken(authHeader)
			if err == nil {
				c.Locals("userID", userID)
				c.Locals("userRole", userRole)
			}
		}
		return c.Next()
	})

	// -------------------------------
	// 🌍 Rutas HTML
	// -------------------------------
	// 🗑️ CLOUDINARY - Limpiar archivos
	app.Delete("/api/cloudinary/cleanup", func(c *fiber.Ctx) error {
		return utils.LimpiarCloudinary(c)
	})

	//para quitar archivos de cloudinary en tiempo asyn
	// 🗑️ CLOUDINARY - Limpieza asíncrona (NUEVA RUTA)
	app.Post("/api/cloudinary/cleanup-async", func(c *fiber.Ctx) error {
		var body struct {
			URLs          []string `json:"urls"`
			ResourceTypes []string `json:"resource_types"`
		}

		if err := c.BodyParser(&body); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Error al parsear datos",
			})
		}

		// Procesar en background sin esperar respuesta
		go func() {
			log.Printf("🗑️ Limpiando %d archivos de Cloudinary (async)...", len(body.URLs))
			utils.LimpiarCloudinaryAsync(body.URLs, body.ResourceTypes)
		}()

		// Responder inmediatamente
		return c.SendStatus(204)
	})
	app.Get("/api/cloudinary-config", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"cloudName":          os.Getenv("CLOUDINARY_CLOUD_NAME"),
			"uploadPresetSongs":  os.Getenv("CLOUDINARY_UPLOAD_PRESET_SONGS"),
			"uploadPresetCovers": os.Getenv("CLOUDINARY_UPLOAD_PRESET_COVERS"),
		})
	})

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendFile("./frontend/SRC/html_templates/index.html")
	})

	app.Get("/html_registro", func(c *fiber.Ctx) error {
		return c.SendFile("./frontend/SRC/html_templates/registro.html")
	})

	// 🔒 Solo el admin puede entrar al panel
	var tiposMaster = []string{"admin", "master"}
	app.Get("/html_reg_album", utils.AutenticacionRequerida(tiposMaster), func(c *fiber.Ctx) error {
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
	// var tipoAdminAlbum = []string{"admin", "master", "banda"}

	app.Post("/api/crear_album_completo", func(c *fiber.Ctx) error {
		return utils.CrearAlbumCompleto(_DB, c)
	})

	app.Put("/api/actualizar_album_completo", func(c *fiber.Ctx) error {
		return utils.ActualizarAlbumConCanciones(_DB, c)
	})

	app.Get("/api/albums_listar", func(c *fiber.Ctx) error {
		return utils.ListarAlbums(_DB, c)
	})

	app.Put("/api/actualizar_estado_album", func(c *fiber.Ctx) error {
		return utils.ActualizarEstadoAlbum(_DB, c)
	})
	app.Get("/api/Buscar_Albums_Aleatorios", func(c *fiber.Ctx) error {
		return utils.Buscar_Albums_Aleatorios(_DB, c)
	})
	app.Delete("/api/buscar_album_individual", func(c *fiber.Ctx) error {
		return utils.Buscar_album(_DB, c)
	})

	// ✅ CAMBIADO: De GET con param a POST con body
	app.Post("/api/albums/canciones", func(c *fiber.Ctx) error {
		return utils.ObtenerCancionesPorAlbum(_DB, c)
	})

	// -------------------------------
	// 🎶 CANCIONES (solo admin)
	// -------------------------------
	app.Put("/api/canciones/actualizar", func(c *fiber.Ctx) error {
		return utils.ActualizarCancion(_DB, c)
	})

	app.Put("/api/canciones/estado", func(c *fiber.Ctx) error {
		return utils.CambiarEstadoCancion(_DB, c)
	})

	app.Delete("/api/canciones/eliminar_cancion", func(c *fiber.Ctx) error {
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

	// 📝 Actualizar info usuario (solo admin)
	app.Put("/api/usuarios/:id/actualizar-info", func(c *fiber.Ctx) error {
		return utils.ActualizarInfoUsuario(_DB, c)
	})

	// 👤 Perfil personal (usuarios autenticados)
	permitidosPerfil := []string{"banda", "finalusuario", "admin", "curador", "artista"}

	app.Get("/api/usuarios/mi-perfil", utils.AutenticacionRequerida(permitidosPerfil), func(c *fiber.Ctx) error {
		return utils.ObtenerMiPerfil(_DB, c)
	})

	app.Put("/api/usuarios/actualizar-perfil", utils.AutenticacionRequerida(permitidosPerfil), func(c *fiber.Ctx) error {
		return utils.ActualizarMiPerfil(_DB, c)
	})

	// 🔑 Recuperación de contraseña (público - no requiere autenticación)
	app.Post("/api/recuperar-password/enviar", func(c *fiber.Ctx) error {
		return utils.EnviarCodigoRecuperacion(_DB, c)
	})

	app.Post("/api/recuperar-password/cambiar", func(c *fiber.Ctx) error {
		return utils.CambiarPasswordConCodigo(_DB, c)
	})
	// --------- DESHABILITAR/HABILITAR CANCIONES -----------
	app.Put("/api/canciones/deshabilitar", func(c *fiber.Ctx) error {
		return utils.DeshabilitarCancion(_DB, c)
	})

	app.Put("/api/canciones/habilitar", func(c *fiber.Ctx) error {
		return utils.HabilitarCancion(_DB, c)
	})

	// Rutas de playlists (requieren autenticación)
	playlistGroup := app.Group("/api")
	permitidos_palylist := []string{"banda", "finalusuario"}
	playlistGroup.Use(utils.AutenticacionRequerida(permitidos_palylist))

	playlistGroup.Post("/crear_playlist", func(c *fiber.Ctx) error {
		return utils.CrearPlaylist(_DB, c)
	})
	playlistGroup.Get("/obtener_playlists", func(c *fiber.Ctx) error {
		return utils.ObtenerPlaylistsPorUsuario(_DB, c)
	})
	playlistGroup.Post("/agregar_cancion_playlist", func(c *fiber.Ctx) error {
		return utils.AgregarCancionAPlaylist(_DB, c)
	})
	playlistGroup.Post("/eliminar_cancion_playlist", func(c *fiber.Ctx) error {
		return utils.EliminarCancionDePlaylist(_DB, c)
	})
	playlistGroup.Post("/obtener_canciones_playlist", func(c *fiber.Ctx) error {
		return utils.ObtenerCancionesDePLaylist(_DB, c)
	})
	playlistGroup.Post("/eliminar_playlist", func(c *fiber.Ctx) error {
		return utils.EliminarPlaylist(_DB, c)
	})
	// Búsqueda (dentro de playlist group con autenticación)
	playlistGroup.Post("/buscar/canciones", func(c *fiber.Ctx) error {
		return utils.BuscarCanciones(_DB, c)
	})

	playlistGroup.Post("/buscar/albumes", func(c *fiber.Ctx) error {
		return utils.BuscarAlbumes(_DB, c)
	})

	// Álbumes activos y reproducciones
	playlistGroup.Post("/albums/canciones-activas", func(c *fiber.Ctx) error {
		return utils.ObtenerCancionesPorAlbumActivas(_DB, c)
	})

	playlistGroup.Post("/incrementar_reproducciones", func(c *fiber.Ctx) error {
		return utils.IncrementarReproducciones(_DB, c)
	})

	// -------------------------------
	// 🚀 Inicio del servidor
	// -------------------------------
	log.Println("🚀 Servidor iniciado en http://localhost:3000")
	log.Fatal(app.Listen(":3000"))
}
