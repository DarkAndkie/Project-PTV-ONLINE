package utils

import (
	"errors"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

// ExtraerInfoDelToken extrae id y role del token JWT
func ExtraerInfoDelToken(authHeader string) (int, string, error) {
	if authHeader == "" {
		return 0, "", errors.New("token no proporcionado")
	}

	// Remover "Bearer " del inicio
	token := strings.TrimPrefix(authHeader, "Bearer ")
	if token == authHeader {
		return 0, "", errors.New("formato de token inválido")
	}

	// Parsear token
	claims := jwt.MapClaims{}
	_, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})

	if err != nil {
		return 0, "", errors.New("token inválido: " + err.Error())
	}

	// Extraer campos
	userID, ok := claims["id"].(float64)
	if !ok {
		return 0, "", errors.New("id no encontrado en token")
	}

	userRole, ok := claims["tipo_user"].(string)
	if !ok {
		return 0, "", errors.New("rol no encontrado en token")
	}

	return int(userID), userRole, nil
}

// ValidarRol verifica si el rol del usuario está en la lista permitida
func ValidarRol(userRole string, rolesPermitidos []string) bool {
	for _, rol := range rolesPermitidos {
		if userRole == rol {
			return true
		}
	}
	return false
}
