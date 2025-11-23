package test_helpers

import (
	"fmt"
	"os"
	"testing"

	"proyecto-ptv-online/backend/servicios/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// SetupTestDB crea una base de datos de prueba
func SetupTestDB(t *testing.T) *gorm.DB {
	// Configuración para DB de prueba
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		getEnv("TEST_DB_HOST", "localhost"),
		getEnv("TEST_DB_USER", "yisus"),
		getEnv("TEST_DB_PASSWORD", "Chucho2003"),
		getEnv("TEST_DB_NAME", "ptv_test"),
		getEnv("TEST_DB_PORT", "5432"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent), // Sin logs en tests
	})

	if err != nil {
		t.Fatalf("Error conectando a DB de prueba: %v", err)
	}

	// Migrar esquema
	err = db.AutoMigrate(
		&models.Usuario{},
		&models.Albums{},
		&models.Cancion{},
		&models.Playlist{},
		&models.Add_Playlist{},
		&models.ValidacionCorreo{},
	)

	if err != nil {
		t.Fatalf("Error migrando esquema: %v", err)
	}

	return db
}

// CleanupTestDB limpia la base de datos de prueba
func CleanupTestDB(t *testing.T, db *gorm.DB) {
	// Limpiar todas las tablas
	db.Exec("TRUNCATE TABLE usuarios CASCADE")
	db.Exec("TRUNCATE TABLE albums CASCADE")
	db.Exec("TRUNCATE TABLE cancion CASCADE")
	db.Exec("TRUNCATE TABLE playlist CASCADE")
	db.Exec("TRUNCATE TABLE add_playlist CASCADE")
	db.Exec("TRUNCATE TABLE validacion_correo CASCADE")

	sqlDB, _ := db.DB()
	sqlDB.Close()
}

// SeedTestData inserta datos de prueba
func SeedTestData(t *testing.T, db *gorm.DB) {
	// Usuario de prueba
	testUser := models.Usuario{
		Nombre:    "Test",
		Apellido:  "User",
		Email:     "test@test.com",
		Password:  "$2a$10$hashexample", // Hash de "Test123!"
		Celular:   "1234567890",
		Tipo_user: "finalusuario",
	}
	db.Create(&testUser)

	// Banda de prueba
	testBanda := models.Usuario{
		Nombre:    "Test",
		Apellido:  "Banda",
		Email:     "banda@test.com",
		Password:  "$2a$10$hashexample",
		Celular:   "0987654321",
		Tipo_user: models.Banda,
	}
	db.Create(&testBanda)
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
