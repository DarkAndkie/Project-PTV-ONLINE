package models

type Add_Playlist struct {
	id_add_playlist int    `gorm:"column:  id_add_playlist; PrimaryKey" json:" id_add_playlist"`
	id_cancion      string `gorm:"column:id_cancion" json:"id_cancion"`
	id_playlist     string `gorm:"column:id_album" json:"id_album"`
	id_historial    int    `gorm:"column:id_historial" json:"id_historial"`
}

func (Add_Playlist) TableName() string {
	return "add_playlist"
}
