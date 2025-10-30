package utils

import (
	"errors"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	models "proyecto-ptv-online/backend/servicios/models"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// Validar y parsear álbum
func Parsear_ValidarAlbum(_db *gorm.DB, album models.Albums) error {

	var count int64
	_db.Model(&models.Albums{}).Where("nombre_album = ?", album.Nombre_album).Count(&count)
	if count > 0 {
		return errors.New("Ya existe este nombre para un álbum")
	}

	if utf8.RuneCountInString(album.Caratula_dir) > 500 {
		return errors.New("La dirección de carátula supera el límite permitido")
	}
	if utf8.RuneCountInString(album.Nombre_album) > 50 {
		return errors.New("El nombre del álbum no puede superar 50 caracteres")
	}
	if utf8.RuneCountInString(album.Descrip) > 250 {
		return errors.New("La descripción no puede superar 250 caracteres")
	}

	if !strings.HasPrefix(album.Caratula_dir, "http://") && !strings.HasPrefix(album.Caratula_dir, "https://") {
		return errors.New("La URL de la carátula debe comenzar con http:// o https://")
	}

	if !existeElArchivo(album.Caratula_dir, "caratula") {
		return errors.New("El enlace de la carátula no es existente, por favor ingrese un enlace válido y que pertenezca a una imagen")
	}

	return nil
}

func parsear_Validar_Cancion(_db *gorm.DB, cancion models.Cancion) error {

	if utf8.RuneCountInString(cancion.Nombre) > 40 {
		return errors.New("El nombre de la canción no puede ser superior a 40 caracteres")
	}
	if utf8.RuneCountInString(cancion.Descrip) > 300 {
		return errors.New("La descripción de la canción no puede ser superior a 300 caracteres")
	}

	// ✅ Validar duración con límites reales
	if err := validarDuracionCancion(cancion.Duracion); err != nil {
		return err
	}

	// ✅ Validar URL antes de verificar si existe
	if !strings.HasPrefix(cancion.Cancion_path, "http://") && !strings.HasPrefix(cancion.Cancion_path, "https://") {
		return errors.New("La URL de la canción debe comenzar con http:// o https://")
	}

	if !existeElArchivo(cancion.Cancion_path, "audio") {
		return errors.New("El enlace de la canción es inválido, por favor ingrese uno correcto y que sea un archivo de audio")
	}

	return nil
}

// ✅ NUEVA FUNCIÓN: Validar duración con límites reales
func validarDuracionCancion(duracion string) error {
	// Verificar formato mm:ss
	re := regexp.MustCompile(`^(\d{2}):(\d{2})$`)
	matches := re.FindStringSubmatch(duracion)

	if matches == nil {
		return errors.New("La duración debe tener el formato mm:ss (ejemplo: 03:45)")
	}

	// Extraer minutos y segundos
	minutos, err1 := strconv.Atoi(matches[1])
	segundos, err2 := strconv.Atoi(matches[2])

	if err1 != nil || err2 != nil {
		return errors.New("La duración contiene valores no numéricos")
	}

	// ✅ Validar rangos
	if minutos < 0 || minutos > 59 {
		return errors.New("Los minutos deben estar entre 00 y 59")
	}

	if segundos < 0 || segundos > 59 {
		return errors.New("Los segundos deben estar entre 00 y 59")
	}

	// ✅ Validar que no sea 00:00
	if minutos == 0 && segundos == 0 {
		return errors.New("La duración no puede ser 00:00")
	}

	// ✅ Opcional: Validar duración máxima (ej: 60 minutos)
	duracionTotal := minutos*60 + segundos
	if duracionTotal > 3600 { // 60 minutos = 3600 segundos
		return errors.New("La duración no puede superar 60 minutos")
	}

	return nil
}

// ✅ FUNCIÓN MEJORADA: Verificar archivos con mejor manejo
func existeElArchivo(url string, tipoArchivo string) bool {
	log.Printf("🔍 Verificando URL: %s (tipo: %s)", url, tipoArchivo)

	// ✅ Manejar enlaces de Google Drive
	if strings.Contains(url, "drive.google.com") {
		log.Printf("⚠️ Advertencia: Google Drive no permite verificación directa de archivos")
		// Convertir a formato directo si es posible
		if strings.Contains(url, "/file/d/") {
			fileID := extraerGoogleDriveID(url)
			if fileID != "" {
				url = "https://drive.google.com/uc?export=view&id=" + fileID
				log.Printf("🔄 URL convertida: %s", url)
			}
		}
	}

	client := http.Client{
		Timeout: 10 * time.Second, // ✅ Aumentado a 10 segundos
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Permitir hasta 10 redirects
			if len(via) >= 10 {
				return errors.New("demasiados redirects")
			}
			return nil
		},
	}

	resp, err := client.Get(url)
	if err != nil {
		log.Printf("❌ Error al verificar URL: %v", err)
		return false
	}
	defer resp.Body.Close()

	log.Printf("📥 Status code: %d", resp.StatusCode)
	log.Printf("📥 Content-Type: %s", resp.Header.Get("Content-Type"))

	// ✅ CORREGIDO: StatusOK (200) en vez de StatusAccepted (202)
	if resp.StatusCode != http.StatusOK {
		log.Printf("❌ Status code inválido: %d", resp.StatusCode)
		return false
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		log.Printf("⚠️ No hay Content-Type en la respuesta")
		return false
	}

	switch tipoArchivo {
	case "audio":
		valido := strings.HasPrefix(contentType, "audio/")
		log.Printf("🎵 ¿Es audio?: %v", valido)
		return valido
	case "caratula":
		valido := strings.HasPrefix(contentType, "image/")
		log.Printf("🖼️ ¿Es imagen?: %v", valido)
		return valido
	}

	return false
}

// ✅ NUEVA FUNCIÓN: Extraer ID de Google Drive
func extraerGoogleDriveID(url string) string {
	// Buscar el patrón /file/d/{FILE_ID}/
	re := regexp.MustCompile(`/file/d/([^/]+)`)
	matches := re.FindStringSubmatch(url)
	if len(matches) > 1 {
		return matches[1]
	}
	return ""
}

// Registrar álbum
// Agregar al archivo de utils o routes// CrearAlbumCompleto crea un álbum y sus canciones en una sola transacción
func CrearAlbumCompleto(_db *gorm.DB, c *fiber.Ctx) error {

	//como me dió pereza hacer mas extenso el js de administración de albums y mandé album y el array de canciones juntos
	//so toca hcaer un strcut para recbirlo con fiber
	type Payload struct {
		Album     models.Albums    `json:"album"`
		Canciones []models.Cancion `json:"canciones"`
	}
	var datos Payload
	if err := c.BodyParser(&datos); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "no se pudo parsear correctamente los datos desde el payload",
		})
	}
	albums := datos.Album
	canciones := datos.Canciones
	albums.Estado = "borrador"
	if err := Parsear_ValidarAlbum(_db, albums); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Error al rellenar alguno de los datos" + err.Error(),
		})
	}
	cancionesValidas := []models.Cancion{}
	for _, d := range canciones {
		if err := parsear_Validar_Cancion(_db, d); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"Error": "Error al validar la canción: " + d.Nombre + " " + err.Error(),
			})
		}
		cancionesValidas = append(cancionesValidas, d)
	}
	err := _db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&albums).Error; err != nil {
			return err
		}
		for i := range cancionesValidas {
			cancionesValidas[i].Id_album = albums.Id_album
			cancionesValidas[i].Id_banda = albums.Id_banda
			if err := tx.Create(&cancionesValidas[i]).Error; err != nil {
				return err
			}
		}
		log.Println("Creado en db")
		return nil //se supone que si todo sale fino se guarda
	})

	if err != nil {
		log.Println("❌ Error en transacción:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pudo guardar el álbum y sus canciones",
		})
	}

	return c.JSON(fiber.Map{
		"mensaje":  "Álbum y canciones guardados correctamente",
		"id_album": albums.Id_album,
	})
}

// Actualizar estado del álbum

func ActualizarEstadoAlbum(_db *gorm.DB, c *fiber.Ctx) error {
	var body struct {
		IdAlbum string `json:"id_album"`
		Estado  string `json:"estado"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Datos inválidos"})
	}

	if body.IdAlbum == "" {
		return c.Status(400).JSON(fiber.Map{"error": "id_album es requerido"})
	}

	if body.Estado == "" {
		return c.Status(400).JSON(fiber.Map{"error": "estado es requerido"})
	}

	result := _db.Model(&models.Albums{}).Where("id_album = ?", body.IdAlbum).Update("estado", body.Estado)

	if result.RowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Álbum no encontrado"})
	}

	return c.JSON(fiber.Map{"message": "Estado actualizado correctamente"})
}

// Listar todos los álbumes
func ListarAlbums(_db *gorm.DB, c *fiber.Ctx) error {
	var albums []models.Albums
	if err := _db.Find(&albums).Error; err != nil {
		log.Println("❌ Error al consultar álbumes:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al consultar álbumes"})
	}

	log.Printf("✅ Álbums encontrados: %d\n", len(albums))
	return c.JSON(albums)
}
