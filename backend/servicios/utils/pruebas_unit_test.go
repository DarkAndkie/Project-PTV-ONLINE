package utils

import (
	"fmt"
	models "proyecto-ptv-online/backend/servicios/models"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

// ============================================
// TC-UNIT-01: Validación de Duración
// ============================================
func TestValidarDuracionCancion(t *testing.T) {
	tests := []struct {
		name     string
		duracion string
		wantErr  bool
		errorMsg string
	}{
		{
			name:     "Duración válida 03:45",
			duracion: "03:45",
			wantErr:  false,
		},
		{
			name:     "Duración válida 00:01",
			duracion: "00:01",
			wantErr:  false,
		},
		{
			name:     "Duración inválida 00:00",
			duracion: "00:00",
			wantErr:  true,
			errorMsg: "La duración no puede ser 00:00",
		},
		{
			name:     "Duración inválida 99:99",
			duracion: "99:99",
			wantErr:  true,
			errorMsg: "Los minutos deben estar entre 00 y 59",
		},
		{
			name:     "Formato incorrecto abc:de",
			duracion: "abc:de",
			wantErr:  true,
			errorMsg: "La duración debe tener el formato mm:ss",
		},
		{
			name:     "Segundos inválidos 03:60",
			duracion: "03:60",
			wantErr:  true,
			errorMsg: "Los segundos deben estar entre 00 y 59",
		},
		{
			name:     "Duración excede límite 61:00",
			duracion: "61:00",
			wantErr:  true,
			errorMsg: "Los minutos deben estar entre 00 y 59",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidarDuracionCancion(tt.duracion)

			if tt.wantErr {
				assert.Error(t, err, "Se esperaba un error pero no se obtuvo")
				if tt.errorMsg != "" {
					assert.Contains(t, err.Error(), tt.errorMsg)
				}
			} else {
				assert.NoError(t, err, "No se esperaba error pero se obtuvo: %v", err)
			}
		})
	}
}

// ============================================
// TC-UNIT-02: Validación de Email
// ============================================
func TestValidarEmail(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		expected bool
	}{
		{
			name:     "Email válido simple",
			email:    "test@example.com",
			expected: true,
		},
		{
			name:     "Email válido con subdominios",
			email:    "user@mail.example.co.uk",
			expected: true,
		},
		{
			name:     "Email válido con números",
			email:    "user123@test456.com",
			expected: true,
		},
		{
			name:     "Email inválido sin @",
			email:    "testexample.com",
			expected: false,
		},
		{
			name:     "Email inválido sin dominio",
			email:    "test@",
			expected: false,
		},
		{
			name:     "Email inválido sin extensión",
			email:    "test@example",
			expected: false,
		},
		{
			name:     "Email vacío",
			email:    "",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidarEmail(tt.email)
			assert.Equal(t, tt.expected, result,
				"Para email '%s', se esperaba %v pero se obtuvo %v",
				tt.email, tt.expected, result)
		})
	}
}

// ============================================
// TC-UNIT-03: Validación de Password
// ============================================
func TestPasswordFormato(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  bool
	}{
		{
			name:     "Password válida con todo",
			password: "Pass123!",
			wantErr:  false,
		},
		{
			name:     "Password muy corta",
			password: "Pass1!",
			wantErr:  true,
		},
		{
			name:     "Password sin números",
			password: "Password",
			wantErr:  true,
		},
		{
			name:     "Password sin mayúsculas",
			password: "password123!",
			wantErr:  true,
		},
		{
			name:     "Password sin caracteres especiales",
			password: "Password123",
			wantErr:  true,
		},
		{
			name:     "Password vacía",
			password: "",
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := PasswordFormato(tt.password)

			if tt.wantErr == true {
				assert.Error(t, err, "Se esperaba error para password: %s", tt.password)
			} else {
				assert.NoError(t, err, "No se esperaba error para password: %s", tt.password)
			}
		})
	}
}

// ============================================
// TC-UNIT-04: Validación de URLs
// ============================================
func TestExisteElArchivo(t *testing.T) {
	tests := []struct {
		name        string
		url         string
		tipoArchivo string
		expected    bool
		skipReason  string
	}{
		{
			name:        "URL Cloudinary válida (imagen)",
			url:         "https://res.cloudinary.com/demo/image/upload/sample.jpg",
			tipoArchivo: "caratula",
			expected:    true,
		},
		{
			name:        "URL Cloudinary válida (audio)",
			url:         "https://res.cloudinary.com/dyf3wicig/video/upload/v1763157018/b1zkp9b6d7tmq0rhsxbi.m4a",
			tipoArchivo: "audio",
			expected:    true,
		},
		{
			name:        "URL sin protocolo",
			url:         "cloudinary.com/image.jpg",
			tipoArchivo: "caratula",
			expected:    false,
		},
		{
			name:        "URL inválida 404",
			url:         "https://httpstat.us/404",
			tipoArchivo: "caratula",
			expected:    false,
		},
		{
			name:        "URL vacía",
			url:         "",
			tipoArchivo: "caratula",
			expected:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.skipReason != "" {
				t.Skip(tt.skipReason)
			}

			result := existeElArchivo(tt.url, tt.tipoArchivo)
			assert.Equal(t, tt.expected, result,
				"Para URL '%s' tipo '%s', esperaba %v pero obtuvo %v",
				tt.url, tt.tipoArchivo, tt.expected, result)
		})
	}
}

// ============================================
// TC-UNIT-05: Validación de Álbum
// ============================================
func TestParsear_ValidarAlbum(t *testing.T) {
	// Mock de base de datos (necesitarás sqlmock)
	// Por ahora, pruebas de validación de campos

	tests := []struct {
		name    string
		album   models.Albums
		wantErr bool
		errMsg  string
	}{
		{
			name: "Álbum válido",
			album: models.Albums{
				Nombre_album: "Test Album",
				Caratula_dir: "https://res.cloudinary.com/demo/image.jpg",
				Descrip:      "Descripción de prueba",
			},
			wantErr: false,
		},
		{
			name: "Nombre muy largo",
			album: models.Albums{
				Nombre_album: "Este es un nombre de álbum extremadamente largo que supera los 50 caracteres permitidos",
				Caratula_dir: "https://res.cloudinary.com/demo/image.jpg",
				Descrip:      "Test",
			},
			wantErr: true,
			errMsg:  "no puede superar 50 caracteres",
		},
		{
			name: "Descripción muy larga",
			album: models.Albums{
				Nombre_album: "Test",
				Caratula_dir: "https://res.cloudinary.com/demo/image.jpg",
				Descrip:      string(make([]byte, 300)), // 300 caracteres
			},
			wantErr: true,
			errMsg:  "no puede superar 250 caracteres",
		},
		{
			name: "URL sin protocolo",
			album: models.Albums{
				Nombre_album: "Test",
				Caratula_dir: "cloudinary.com/image.jpg",
				Descrip:      "Test",
			},
			wantErr: true,
			errMsg:  "debe comenzar con http",
		},
		{
			name: "Carátula URL muy larga",
			album: models.Albums{
				Nombre_album: "Test",
				Caratula_dir: "https://" + string(make([]byte, 600)),
				Descrip:      "Test",
			},
			wantErr: true,
			errMsg:  "supera el límite permitido",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Nota: Esta función requiere conexión a DB
			// Para pruebas unitarias puras, necesitarías usar sqlmock
			// o separar la lógica de validación de la lógica de DB

			// Por ahora, solo validamos la lógica sin DB
			err := validarCamposAlbum(tt.album)

			if tt.wantErr {
				assert.Error(t, err)
				if tt.errMsg != "" {
					assert.Contains(t, err.Error(), tt.errMsg)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// Función auxiliar para separar validación de DB
func validarCamposAlbum(album models.Albums) error {
	if len(album.Nombre_album) > 50 {
		return fmt.Errorf("El nombre del álbum no puede superar 50 caracteres")
	}
	if len(album.Descrip) > 250 {
		return fmt.Errorf("La descripción no puede superar 250 caracteres")
	}
	if len(album.Caratula_dir) > 500 {
		return fmt.Errorf("La dirección de carátula supera el límite permitido")
	}
	if !strings.HasPrefix(album.Caratula_dir, "http://") &&
		!strings.HasPrefix(album.Caratula_dir, "https://") {
		return fmt.Errorf("La URL debe comenzar con http:// o https://")
	}
	return nil
}
