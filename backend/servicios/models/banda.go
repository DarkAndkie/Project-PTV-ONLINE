package models

import "time"

type Estado_Album string

const (
	Estado_Borrador      Estado_Album = "borrador"
	Estado_Activo        Estado_Album = "activo"
	Estado_Deshabilitado Estado_Album = "deshabilitado"
)

type Albums struct {
	id_album     string       `gorm:"colum:id_album:primaryKey," json:"id_album"`
	caratula_dir string       `gorm:"colum:caratula_dir" "json:"caratula_dir"`
	nombre_album string       `gorm:"column:nombre_album" json:"nombre_album"`
	descrip      string       `gorm:"colum:descrip" json:"descrip"`
	estado       Estado_Album `gorm:"colum:estado" json:"estado"`
	fecha_lanza  time.Time    `gorm:"colum:fecha_lanza" json:"fecha_lanza"`
}
