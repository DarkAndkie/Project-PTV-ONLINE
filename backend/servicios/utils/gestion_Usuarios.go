package utils

import (
	"errors"
	"fmt"
	"log"
	"math/rand"
	"net/smtp"
	"os"
	models "proyecto-ptv-online/backend/servicios/models"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func ValidarEmail(email string) bool {
	regex := `^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`
	re := regexp.MustCompile(regex)
	return re.MatchString(email)

}

// parseo del body
func validacionesCrearUsuario(_db *gorm.DB, c *fiber.Ctx) (*models.Usuario, error) {
	usuario := models.Usuario{}

	usuario.Nombre = c.FormValue("Nombre")
	usuario.Apellido = c.FormValue("Apellido")
	usuario.Email = c.FormValue("Correo")
	usuario.Password = c.FormValue("Password")
	usuario.Celular = c.FormValue("Celular")
	usuario.Tipo_user = models.TipoUsuario(c.FormValue("Tipo_user"))
	//bajamos a minuscula el tipo
	usuario.Tipo_user = models.TipoUsuario(string(usuario.Tipo_user))
	//validaciones
	log.Println("📥 Body recibido:", string(c.Body()))
	if ValidarEmail(usuario.Email) == false {
		return nil, errors.New("el correo electrónico no tiene un formato válido")
	}

	if utf8.RuneCountInString(usuario.Nombre) > 30 || utf8.RuneCountInString(usuario.Nombre) < 1 {
		return nil, errors.New("el nombre de usuario no puede ser superior a 30 caracteres")
	}
	if utf8.RuneCountInString(usuario.Apellido) > 30 {
		return nil, errors.New("el apellido no puede ser superior a 30 caracteres")
	}
	if utf8.RuneCountInString(usuario.Celular) > 13 || utf8.RuneCountInString(usuario.Celular) < 10 {
		return nil, errors.New("el celular no puede ser superior a 13 caracteres ni inferior a 10")
	}
	if _db.First(&usuario.Id_user, "id_user =? ", usuario.Id_user) == nil {
		return nil, errors.New("El usuario ya existe")
	}
	if _db.First(&usuario, "correo =?", usuario.Email) == nil {
		return nil, errors.New("El correo ya está Registrado")
	}
	if PasswordFormato(usuario.Password) != nil {
		return nil, errors.New("Error en el formato de contraseña:" + PasswordFormato(usuario.Password).Error())
	}
	//Ciframos la contraseña
	hash, err := CifrarContraseña(usuario.Password)
	if err != nil {
		return nil, errors.New("Error en el cifrado de contrasñea: " + err.Error())
	}
	usuario.Password = hash
	return &usuario, nil
}

//ahora se viene lo rico

// funcion para crear un codigo aleatorio
func GenerarCodigoCorreo() string {
	return fmt.Sprintf("%06d", rand.Intn(1000000))
}

// funcion para enviar el correo
func EnvioDeCodigo(tx *gorm.DB, usuario models.Usuario, correo string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	password := os.Getenv("SMTP_PASSWORD")

	fmt.Println("Preparando envío de correo")
	fmt.Println("SMTP_HOST:", host)
	fmt.Println("SMTP_PORT:", port)
	fmt.Println("SMTP_USER:", user)
	fmt.Println("Correo destino:", correo)

	auth := smtp.PlainAuth("", user, password, host)
	addr := host + ":" + port

	codigo := GenerarCodigoCorreo()
	TiempoExpiracion := time.Now().UTC().Add(10 * time.Minute)

	fmt.Println("Código generado:", codigo)
	fmt.Println("Expira en:", TiempoExpiracion.Format(time.RFC1123))

	ModeloCodigo := models.ValidacionCorreo{
		Id_user:    usuario.Id_user,
		Codigo:     codigo,
		Expiracion: TiempoExpiracion,
		Verificado: false,
	}

	if err := tx.Create(&ModeloCodigo).Error; err != nil {
		fmt.Println("Error al guardar el código en la base de datos:", err)
		return errors.New("Error al guardar el código de verificación en la base de datos")
	}

	fmt.Println("Código guardado en base de datos")

	mensaje := []byte(fmt.Sprintf("To: %s\r\nSubject: Código de verificación\r\n\r\n%s\r\n", correo, codigo))

	err := smtp.SendMail(addr, auth, user, []string{correo}, mensaje)
	if err != nil {
		fmt.Println("Error al enviar el correo:", err)
		return err
	}

	fmt.Println("Correo enviado correctamente a", correo)
	return nil
}

func CrearUsuario(_db *gorm.DB, c *fiber.Ctx) error {
	usuario, err := validacionesCrearUsuario(_db, c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	err = _db.Transaction(func(tx *gorm.DB) error {
		usuario.Tipo_user = models.TipoUsuario("deshabilitado")
		if err := tx.Create(&usuario).Error; err != nil {
			return err
		}
		if err := EnvioDeCodigo(tx, *usuario, usuario.Email); err != nil {
			return err
		}
		return nil
	})
	
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al registrar el usuario: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Usuario registrado. Verifica tu correo.",
		"user":    usuario,
	})
}
func VerificarCodigo(_db *gorm.DB, c *fiber.Ctx) error {
	email := c.FormValue("Correo")
	codigo := c.FormValue("Codigo")
	tipo := "finalusuario"

	var usuario models.Usuario
	if err := _db.First(&usuario, "correo = ?", email).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Usuario no encontrado"})
	}

	var validacion models.ValidacionCorreo
	if err := _db.First(&validacion, "id_user = ? AND codigo = ?", usuario.Id_user, codigo).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Código inválido"})
	}

	if validacion.Verificado {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Código ya usado"})
	}
	if time.Now().UTC().After(validacion.Expiracion) {
		// el código expiró; intentamos enviar uno nuevo antes de retornar
		if err := _db.Where("id_user = ?", usuario.Id_user).Delete(&models.ValidacionCorreo{}).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al limpiar códigos antiguos: " + err.Error()})
		}
		if err := EnvioDeCodigo(_db, usuario, usuario.Email); err != nil {
			// si falla el reenvío, informamos el error correspondiente
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Código expirado y no se pudo enviar uno nuevo: " + err.Error()})
		}

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Código expirado. Se ha enviado un nuevo código al correo"})

	}

	validacion.Verificado = true
	_db.Save(&validacion)

	usuario.Tipo_user = models.TipoUsuario(strings.ToLower(tipo))
	_db.Save(&usuario)

	return c.JSON(fiber.Map{"message": "Correo verificado correctamente",
		"direccion": "../../SRC/html_templates/index.html"})
}

// ✅ REENVIAR CÓDIGO DE VERIFICACIÓN
func ReenviarCodigo(_db *gorm.DB, c *fiber.Ctx) error {
	email := c.FormValue("Correo")

	log.Printf("📧 Solicitud de reenvío de código para: %s", email)

	var usuario models.Usuario
	if err := _db.First(&usuario, "correo = ?", email).Error; err != nil {
		log.Printf("❌ Usuario no encontrado: %s", email)
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Usuario no encontrado",
		})
	}

	// Verificar si ya está verificado
	var validacion models.ValidacionCorreo
	if err := _db.First(&validacion, "id_user = ?", usuario.Id_user).Error; err == nil {
		if validacion.Verificado {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Este usuario ya está verificado",
			})
		}
	}

	// Eliminar códigos anteriores del mismo usuario
	if err := _db.Where("id_user = ?", usuario.Id_user).Delete(&models.ValidacionCorreo{}).Error; err != nil {
		log.Printf("⚠️ Error al limpiar códigos antiguos: %v", err)
	}

	// Enviar nuevo código usando transacción
	err := _db.Transaction(func(tx *gorm.DB) error {
		return EnvioDeCodigo(tx, usuario, usuario.Email)
	})

	if err != nil {
		log.Printf("❌ Error al reenviar código: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al reenviar código: " + err.Error(),
		})
	}

	log.Printf("✅ Código reenviado a: %s", email)
	return c.JSON(fiber.Map{
		"message": "Código reenviado correctamente. Revisa tu correo.",
	})
}

// pucha la wea por fin, vamos con lo next
func ConsultarUsuarios(_db *gorm.DB, c *fiber.Ctx, consulta string) error {
	usuario := models.Usuario{}
	if err := _db.First(&usuario, "email=?", consulta).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "No se ha encontrado el usuario" + err.Error(),
		})
	}
	return c.JSON(fiber.Map{
		"message": "Usuario encontrado",
		"usuario": usuario,
	})

}
func ListarUsuarios(_db *gorm.DB, c *fiber.Ctx) error {
	var usuarios []models.Usuario
	if err := _db.Find(&usuarios).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al consultar usuarios",
		})
	}
	return c.JSON(usuarios)
}

func BuscarUsuariosPorNombre(_db *gorm.DB, c *fiber.Ctx) error {
	nombre := c.Params("nombre")
	var resultados []models.Usuario

	patron := "%" + strings.ToLower(nombre) + "%"
	if err := _db.Where("LOWER(nombre) LIKE ?", patron).Find(&resultados).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al buscar usuarios por nombre",
		})
	}

	if len(resultados) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"message": "No se encontraron usuarios con ese nombre",
		})
	}

	// Solo mostramos datos clave
	var respuesta []fiber.Map
	for _, u := range resultados {
		respuesta = append(respuesta, fiber.Map{
			"id_user": u.Id_user,
			"nombre":  u.Nombre,
			"correo":  u.Email,
			"tipo":    u.Tipo_user,
		})
	}

	return c.JSON(respuesta)
}

func CambiarTipoUsuario(_db *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		Tipo string `json:"tipo"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Error al parsear"})
	}

	tipo := strings.ToLower(body.Tipo)
	tiposValidos := map[string]bool{
		"admin": true, "banda": true, "curador": true,
		"artista": true, "finalusuario": true, "deshabilitado": true,
	}
	if !tiposValidos[tipo] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Tipo de usuario no válido"})
	}

	if err := _db.Model(&models.Usuario{}).Where("id_user = ?", id).Update("tipo_user", tipo).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al actualizar tipo"})
	}
	return c.JSON(fiber.Map{"message": "Tipo de usuario actualizado"})
}

func CambiarEstadoUsuario(_db *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		Habilitar bool `json:"habilitar"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Error al parsear"})
	}

	nuevoTipo := "deshabilitado"
	if body.Habilitar {
		nuevoTipo = "finalusuario"
	}

	if err := _db.Model(&models.Usuario{}).Where("id_user = ?", id).Update("tipo_user", nuevoTipo).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al cambiar estado"})
	}
	return c.JSON(fiber.Map{"message": "Estado actualizado"})
}

func EliminarUsuarioPorID(_db *gorm.DB, c *fiber.Ctx) error {
	id := c.Params("id")
	if err := _db.Delete(&models.Usuario{}, "id_user = ?", id).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al eliminar usuario"})
	}
	return c.JSON(fiber.Map{"message": "Usuario eliminado exitosamente"})
}

func ActualizarUsuarios(_db *gorm.DB, c *fiber.Ctx) error {
	usuario, err := validacionesCrearUsuario(_db, c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	if err2 := _db.Model(&usuario).Update(usuario.Nombre, usuario.Email).Error; err2 != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"Error": "Error al actualizar el usuario",
		})
	}
	if err3 := _db.Model(&usuario).Update(string(usuario.Tipo_user), usuario.Password).Error; err3 != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"Error": "Error al actualizar el usuario",
		})
	}
	return c.JSON(fiber.Map{
		"message": "Usuario actualizado exitosamente",
		"user":    usuario,
	})
}

func ListarBandas(_db *gorm.DB, c *fiber.Ctx) error {
	var bandas []models.Usuario
	if err := _db.Where("tipo_user = ?", models.Banda).Find(&bandas).Error; err != nil {
		return err
	}
	return c.JSON(bandas)
}
