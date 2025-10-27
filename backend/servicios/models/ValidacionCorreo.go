package models

import (
	"time"
)

type ValidacionCorreo struct {
	Id         int       `gorm:"column:id; primaryKey; autoIncrement" json:"id"`
	Id_user    int       `gorm:"column:id_user; NOTNULL" json:"id_user"`
	Codigo     string    `gorm:"column:codigo; NOTNULL" json:"codigo"`
	Expiracion time.Time `gorm:"column:expiracion; NOTNULL" json:"expiracion"`
	Verificado bool      `gorm:"column:verificado; NOTNULL; default:false" json:"verificado"`
}

func (ValidacionCorreo) TableName() string {
	return "validacioncorreo"
}
