package servicios

import (
	"fmt"
	"regexp"

	"golang.org/x/crypto/bcrypt"
)

// validación de formato de contraseña
func PasswordFormato(password string) error {
	if password == "" {
		return fmt.Errorf("La contraseña no puede estar vacía")
	}
	if len(password) < 8 {
		return fmt.Errorf("La contraseña debe tener al menos 8 caracteres")
	}
	if match, _ := regexp.MatchString(`[A-Za-z]`, password); !match {
		return fmt.Errorf("la contraseña debe contener al menos una letra")
	}
	if match, _ := regexp.MatchString(`[0-9]`, password); !match {
		return fmt.Errorf("la contraseña debe contener al menos un número")
	}
	if match, _ := regexp.MatchString((`[!@#\$%\^&\*\(\)_\+\-=\[\]\{\};:'",.<>\/?\\|]`), password); !match {
		return fmt.Errorf(("La contraseña debe tener al menos un caracter especial"))
	}
	return nil
}
func CifrarContraseña(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hash), err
}
