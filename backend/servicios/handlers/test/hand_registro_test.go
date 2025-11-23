package handlers

import (
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"

	"proyecto-ptv-online/backend/servicios/models"
	"proyecto-ptv-online/backend/servicios/utils"
	test_helpers "proyecto-ptv-online/test"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
)

func TestRegistrarUsuario_Integration(t *testing.T) {
	// Setup - Configurar variables de entorno MOCK para evitar errores de SMTP
	os.Setenv("SMTP_HOST", "localhost")
	os.Setenv("SMTP_PORT", "1025")
	os.Setenv("SMTP_USER", "test@test.com")
	os.Setenv("SMTP_PASS", "test123")
	os.Setenv("SMTP_FROM", "test@test.com")

	// Limpiar al final
	defer func() {
		os.Unsetenv("SMTP_HOST")
		os.Unsetenv("SMTP_PORT")
		os.Unsetenv("SMTP_USER")
		os.Unsetenv("SMTP_PASS")
		os.Unsetenv("SMTP_FROM")
	}()

	// Setup DB
	db := test_helpers.SetupTestDB(t)
	defer test_helpers.CleanupTestDB(t, db)

	app := fiber.New()
	app.Post("/registro_post", func(c *fiber.Ctx) error {
		return utils.CrearUsuario(db, c)
	})

	tests := []struct {
		name           string
		payload        map[string]string
		expectedStatus int
		checkDB        bool
	}{
		{
			name: "Registro exitoso",
			payload: map[string]string{
				"Nombre":    "Juan",
				"Apellido":  "Pérez",
				"Correo":    "juan@test.com",
				"Password":  "Pass123!",
				"Celular":   "3001234567",
				"Tipo_user": "finalusuario",
			},
			expectedStatus: 200,
			checkDB:        true,
		},
		{
			name: "Email duplicado",
			payload: map[string]string{
				"Nombre":    "Pedro",
				"Apellido":  "López",
				"Correo":    "juan@test.com",
				"Password":  "Pass123!",
				"Celular":   "3009876543",
				"Tipo_user": "finalusuario",
			},
			expectedStatus: 400,
			checkDB:        false,
		},
		{
			name: "Email inválido",
			payload: map[string]string{
				"Nombre":    "Ana",
				"Apellido":  "García",
				"Correo":    "email-invalido",
				"Password":  "Pass123!",
				"Celular":   "3005555555",
				"Tipo_user": "finalusuario",
			},
			expectedStatus: 400,
			checkDB:        false,
		},
		{
			name: "Password débil",
			payload: map[string]string{
				"Nombre":    "Carlos",
				"Apellido":  "Ruiz",
				"Correo":    "carlos@test.com",
				"Password":  "123",
				"Celular":   "3007777777",
				"Tipo_user": "finalusuario",
			},
			expectedStatus: 400,
			checkDB:        false,
		},
		{
			name: "Campos vacíos",
			payload: map[string]string{
				"Nombre":    "",
				"Apellido":  "García",
				"Correo":    "vacio@test.com",
				"Password":  "Pass123!",
				"Celular":   "3008888888",
				"Tipo_user": "finalusuario",
			},
			expectedStatus: 400,
			checkDB:        false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Construir form data
			formData := url.Values{}
			for key, val := range tt.payload {
				formData.Set(key, val)
			}

			// Crear request
			req := httptest.NewRequest(
				"POST",
				"/registro_post",
				strings.NewReader(formData.Encode()),
			)
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

			// Ejecutar request
			resp, err := app.Test(req, -1)
			assert.NoError(t, err)

			// Verificar status code
			assert.Equal(t, tt.expectedStatus, resp.StatusCode,
				"Status code no coincide para: %s", tt.name)

			// Verificar en DB si se esperaba éxito
			if tt.checkDB && resp.StatusCode == 200 {
				// Verificar usuario
				var usuario models.Usuario
				err := db.Where("correo = ?", tt.payload["Correo"]).First(&usuario).Error
				assert.NoError(t, err, "Usuario debería existir en DB")
				assert.Equal(t, tt.payload["Nombre"], usuario.Nombre)
				assert.Equal(t, tt.payload["Apellido"], usuario.Apellido)

				// Verificar código de verificación
				var validacion models.ValidacionCorreo
				err = db.Where("id_user = ?", usuario.Id_user).First(&validacion).Error
				assert.NoError(t, err, "Validación debería existir")
				assert.NotEmpty(t, validacion.Codigo, "Código no debe estar vacío")
				assert.False(t, validacion.Verificado, "No debe estar verificado aún")
			}
		})
	}
}
