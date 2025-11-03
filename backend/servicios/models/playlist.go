package models

type Playlist struct {
	Id_playlist   string `gorm:"colum:id_playlist;primaryKey;default:id_personalizado_playlist()" json:"id_playlist"`
	Estado        string `gorm:"colum:string" json:"estado"`
	Nombre        string `gorm:"column:nombre" json:"nombre"`
	Fecha_cracion string `gorm:"column:fecha_creacion" json:"fecha_cracion"`
	Id_user_final int    `gorm:"column:id_user_final" json:"id_user_final"`
}

func (Playlist) TableName() string {
	return "playlist"
}
