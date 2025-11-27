// test/smoke_test.go
package test

import (
	"fmt"
	"net/http"
	"testing"
	"time"
)

const baseURL = "http://localhost:3000"

func testEndpoint(t *testing.T, name, url string, expectedStatus int) {
	t.Run(name, func(t *testing.T) {
		client := &http.Client{Timeout: 5 * time.Second}

		resp, err := client.Get(url)
		if err != nil {
			t.Fatalf("❌ Error: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode == expectedStatus {
			fmt.Printf(" PASÓ - %s (Status: %d)\n", name, resp.StatusCode)
		} else {
			t.Errorf(" FALLÓ - %s: esperado %d, recibido %d", name, expectedStatus, resp.StatusCode)
		}
	})
}

func TestSmoke01_ServidorActivo(t *testing.T) {
	fmt.Println("\n🧪 TC-SMOKE-01: Verificar servidor activo")
	testEndpoint(t, "Página principal", baseURL+"/", 200)
}

func TestSmoke02_ArchivosEstaticos(t *testing.T) {
	fmt.Println("\n🧪 TC-SMOKE-02: Archivos CSS disponibles")
	testEndpoint(t, "Archivo CSS", baseURL+"/SRC/CSS/Style.css", 200)
}

func TestSmoke03_PaginaRegistro(t *testing.T) {
	fmt.Println("\n🧪 TC-SMOKE-03: Página de registro accesible")
	testEndpoint(t, "HTML Registro", baseURL+"/SRC/html_templates/registro.html", 200)
}

func TestSmoke04_APIResponde(t *testing.T) {
	fmt.Println("\n🧪 TC-SMOKE-04: API de álbumes responde")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(baseURL + "/api/albums_listar")

	if err != nil {
		t.Fatalf("❌ Error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 || resp.StatusCode == 401 {
		fmt.Printf("✅ PASÓ - API responde (Status: %d)\n", resp.StatusCode)
	} else {
		t.Errorf("❌ FALLÓ - Status: %d", resp.StatusCode)
	}
}

func TestSmoke05_CloudinaryConfig(t *testing.T) {
	fmt.Println("\n🧪 TC-SMOKE-05: Cloudinary Config")
	testEndpoint(t, "Cloudinary Config", baseURL+"/api/cloudinary-config", 200)
}
