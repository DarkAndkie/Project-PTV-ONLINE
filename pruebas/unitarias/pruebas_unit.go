package pruebas

import (
	utils "proyecto-ptv-online/backend/servicios/utils"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidarCancion(t *testing.T) {
	tests := []struct {
		name       string
		duracion   string
		wbuscarErr bool
	}{
		{"Válida 03:45", "03:45", false},
		{"Invalida 99:99", "99:99", true},
		{"Invalida 00:00", "00:00", true},
		{"Invalida abc:de", "abc:de", true},
		{"Válida 59:59", "59:59", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := utils.ValidarDuracionCancion(tt.duracion)
			if tt.wbuscarErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
