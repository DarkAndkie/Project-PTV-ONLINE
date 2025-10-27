package models

type Estado_Album string

const (
	Estado_Borrador      Estado_Album = "borrador"
	Estado_Activo        Estado_Album = "activo"
	Estado_Deshabilitado Estado_Album = "deshabilitado"
)

type Albums struct {
	Id_album     string       `gorm:"column:id_album;primaryKey;default:id_personalizado_albums()" json:"id_album"`
	Caratula_dir string       `gorm:"column:caratula_dir" json:"caratula_dir"`
	Nombre_album string       `gorm:"column:nombre_album" json:"nombre_album"`
	Descrip      string       `gorm:"column:descrip" json:"descrip"`
	Estado       Estado_Album `gorm:"column:estado" json:"estado"`
	Fecha_lanza  string       `gorm:"column:fecha_lanza" json:"fecha_lanza"`
	Id_banda     int          `gorm:"column:id_banda" json:"id_banda"`
}

func (Albums) TableName() string {
	return "album"
}
