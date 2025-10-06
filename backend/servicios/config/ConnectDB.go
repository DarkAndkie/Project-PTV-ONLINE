package servicios

import (
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// crearemos la función de conexión a la db
func ConnectDB() *gorm.DB {
	var (
		host     = "localhost"
		user     = "yisus"
		port     = "5432"
		password = "Chucho2003"
		name     = "ptv_proyect"
	)
	//conectar ahora si a la db

	dns := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, name)
	DB, err := gorm.Open(postgres.Open(dns), &gorm.Config{})
	DB.AutoMigrate(&Usuario{})
	if err != nil {
		log.Fatal("Error en hacer migración de db", err.Error())
	}
	sqlDB, err2 := DB.DB()
	if err2 != nil {
		log.Fatalf("Error al conectar a la db %v", err2)
		return nil
	}
	if err3 := sqlDB.Ping(); err2 != nil {
		log.Fatalln("Error haciendo ping a la db" + err3.Error())
		return nil
	}
	if DB.Error != nil {
		log.Fatalln("Error en conexion a la db" + err.Error())
		return nil
	}
	log.Println("Conexion exitosa a la db")
	return DB
}
