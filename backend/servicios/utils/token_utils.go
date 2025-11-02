package utils

import (
	"errors"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// Claims simples
type TokenClaims struct {
	Id_user   int    `json:"id_user"`
	Correo    string `json:"correo"`
	Tipo_user string `json:"tipo_user"`
	jwt.RegisteredClaims
}

var jwtKey = []byte(os.Getenv("JWT_SECRET"))

// GenerarTokenFromFields genera un JWT con id, correo y tipo
func GenerarTokenFromFields(id int, correo string, tipo string) (string, error) {
	claims := TokenClaims{
		Id_user:   id,
		Correo:    correo,
		Tipo_user: tipo,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(3 * time.Hour)), // 3 horas
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "ptv-online",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

// VerificarToken verifica y devuelve los claims
func VerificarToken(tokenString string) (*TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	}, jwt.WithLeeway(5*time.Second))
	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*TokenClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("token inválido")
}

// Middleware para Fiber que exige token y (opcional) tipo
// Uso: app.Post("/ruta", utils.AutenticacionRequerida("admin"), handler)

func AutenticacionRequerida(tipoRequerido string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token requerido"})
		}
		// espera "Bearer <token>"
		var tokenStr string
		const bearerPrefix = "Bearer "
		if len(authHeader) > len(bearerPrefix) && authHeader[:len(bearerPrefix)] == bearerPrefix {
			tokenStr = authHeader[len(bearerPrefix):]
		} else {
			tokenStr = authHeader
		}

		claims, err := VerificarToken(tokenStr)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token inválido o expirado"})
		}

		// Si se requiere rol específico
		if tipoRequerido != "" && claims.Tipo_user != tipoRequerido {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Acceso denegado - rol requerido: " + tipoRequerido})
		}

		// Guardar info útil en Locals
		c.Locals("usuario_id", claims.Id_user)
		c.Locals("usuario_correo", claims.Correo)
		c.Locals("usuario_tipo", claims.Tipo_user)

		return c.Next()
	}
}
