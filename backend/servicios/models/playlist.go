package models

type Playlist struct {
	id_adicion   int    `gorm:"colum:id_adicion;primaryKey" json:"id_adicion"`
	n_canciones  int    `gorm:"colum:n_canciones" json:"n_canciones"`
	id_album     string `gorm:"column:id_album" json:"id_album"`
	id_banda     int    `gorm:"column:id_banda" json:"id_banda"`
	id_historial int    `gorm:"colum:id_historial" json:"id_historial"`
}

func (Playlist) Tablename() string {
	return "playlist"
}
