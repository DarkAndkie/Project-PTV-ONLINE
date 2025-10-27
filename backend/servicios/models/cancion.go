package models

type Cancion struct {
	Id_cancion     string `gorm:"column:id_cancion;primaryKey;default:id_personalizado_cancion()" json:"id_cancion"` // ← Cambiado PrimaryKey a primaryKey
	Nombre         string `gorm:"column:nombre" json:"nombre"`
	Descrip        string `gorm:"column:descrip" json:"descrip"`
	Id_banda       int    `gorm:"column:id_banda" json:"id_banda"`
	Id_album       string `gorm:"column:id_album" json:"id_album"`
	Duracion       string `gorm:"column:duracion" json:"duracion"`
	Cancion_path   string `gorm:"column:cancion_path" json:"cancion_path"`
	Caratula_path  string `gorm:"column:caratula_path" json:"caratula_path"`             // ← Corregido: era gormn ahora es gorm                // ← Corregido: era gormn ahora es gorm
	N_reproduccion int    `gorm:"column:n_reproduccion;default:0" json:"n_reproduccion"` // ← Cambié a int con default 0
}

func (Cancion) TableName() string {
	return "cancion"
}
