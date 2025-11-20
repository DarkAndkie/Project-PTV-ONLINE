package utils

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// LimpiarCloudinary elimina archivos de Cloudinary
func LimpiarCloudinary(c *fiber.Ctx) error {
	var body struct {
		URLs          []string `json:"urls"`
		ResourceTypes []string `json:"resource_types"`
	}

	if err := c.BodyParser(&body); err != nil {
		log.Println("❌ Error al parsear body:", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Datos inválidos",
		})
	}

	if len(body.URLs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se proporcionaron URLs para eliminar",
		})
	}

	log.Printf("🗑️ Eliminando %d archivos de Cloudinary...", len(body.URLs))

	cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	apiKey := os.Getenv("CLOUDINARY_API_KEY")
	apiSecret := os.Getenv("CLOUDINARY_API_SECRET")

	if cloudName == "" || apiKey == "" || apiSecret == "" {
		log.Println("❌ Cloudinary no está configurado correctamente")
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Cloudinary no configurado",
		})
	}

	eliminados := 0
	errores := 0

	for i, url := range body.URLs {
		resourceType := "video" // Default para canciones
		if i < len(body.ResourceTypes) {
			resourceType = body.ResourceTypes[i]
		}

		publicID := extraerPublicID(url)
		if publicID == "" {
			log.Printf("⚠️ No se pudo extraer public_id de: %s", url)
			errores++
			continue
		}

		if eliminarDeCloudinary(cloudName, apiKey, apiSecret, publicID, resourceType) {
			eliminados++
			log.Printf("✅ Eliminado: %s", publicID)
		} else {
			errores++
			log.Printf("❌ Error al eliminar: %s", publicID)
		}

		// Pequeña pausa para no saturar la API
		time.Sleep(100 * time.Millisecond)
	}

	log.Printf("📊 Resultado: %d eliminados, %d errores", eliminados, errores)

	return c.JSON(fiber.Map{
		"mensaje":    fmt.Sprintf("%d archivos eliminados correctamente", eliminados),
		"eliminados": eliminados,
		"errores":    errores,
	})
}

// extraerPublicID extrae el public_id de una URL de Cloudinary
func extraerPublicID(url string) string {
	// Ejemplo URL: https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
	// public_id: sample

	if !strings.Contains(url, "cloudinary.com") {
		return ""
	}

	// Buscar el patrón /upload/v[números]/
	parts := strings.Split(url, "/upload/")
	if len(parts) < 2 {
		return ""
	}

	// Tomar la parte después de /upload/
	afterUpload := parts[1]

	// Remover la versión (v1234567890/)
	versionParts := strings.SplitN(afterUpload, "/", 2)
	if len(versionParts) < 2 {
		return ""
	}

	// Obtener el nombre del archivo sin extensión
	pathWithFile := versionParts[1]

	// Remover la extensión
	lastDot := strings.LastIndex(pathWithFile, ".")
	if lastDot == -1 {
		return pathWithFile
	}

	return pathWithFile[:lastDot]
}

// eliminarDeCloudinary hace la petición DELETE a Cloudinary
func eliminarDeCloudinary(cloudName, apiKey, apiSecret, publicID, resourceType string) bool {
	// URL de la API de Cloudinary para eliminar
	apiURL := fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/%s/destroy", cloudName, resourceType)

	// Crear el payload
	payload := map[string]string{
		"public_id": publicID,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Println("❌ Error al crear payload:", err)
		return false
	}

	// Crear la petición
	req, err := http.NewRequest("POST", apiURL, strings.NewReader(string(payloadBytes)))
	if err != nil {
		log.Println("❌ Error al crear petición:", err)
		return false
	}

	// Agregar autenticación básica
	req.SetBasicAuth(apiKey, apiSecret)
	req.Header.Set("Content-Type", "application/json")

	// Hacer la petición
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("❌ Error en la petición:", err)
		return false
	}
	defer resp.Body.Close()

	// Verificar respuesta
	if resp.StatusCode == http.StatusOK {
		return true
	}

	log.Printf("⚠️ Status code: %d", resp.StatusCode)
	return false
}

// ============================================
// ✅ AGREGAR ESTAS FUNCIONES AL FINAL DEL ARCHIVO
// ============================================

// LimpiarCloudinaryAsync elimina archivos de forma asíncrona (para beforeunload)
func LimpiarCloudinaryAsync(urls []string, resourceTypes []string) {
	log.Printf("🗑️ [ASYNC] Iniciando limpieza de %d archivos...", len(urls))

	cloudName := os.Getenv("CLOUDINARY_CLOUD_NAME")
	apiKey := os.Getenv("CLOUDINARY_API_KEY")
	apiSecret := os.Getenv("CLOUDINARY_API_SECRET")

	if cloudName == "" || apiKey == "" || apiSecret == "" {
		log.Println("❌ [ASYNC] Cloudinary no configurado")
		return
	}

	eliminados := 0
	for i, url := range urls {
		resourceType := "video"
		if i < len(resourceTypes) {
			resourceType = resourceTypes[i]
		}

		publicID := extraerPublicID(url)
		if publicID == "" {
			log.Printf("⚠️ [ASYNC] No se pudo extraer public_id de: %s", url)
			continue
		}

		if eliminarDeCloudinary(cloudName, apiKey, apiSecret, publicID, resourceType) {
			eliminados++
			log.Printf("✅ [ASYNC] Eliminado: %s", publicID)
		} else {
			log.Printf("❌ [ASYNC] Error al eliminar: %s", publicID)
		}

		time.Sleep(100 * time.Millisecond)
	}

	log.Printf("📊 [ASYNC] Limpieza completada: %d/%d eliminados", eliminados, len(urls))
}
