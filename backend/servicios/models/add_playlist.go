package models

type Add_Playlist struct {
	Id_add_playlist int    `gorm:"column:id_add_playlist;primaryKey;" json:"id_add_playlist"`
	Id_cancion      string `gorm:"column:id_cancion" json:"id_cancion"`
	Id_playlist     string `gorm:"column:id_playlist" json:"id_playlist"`
}

func (Add_Playlist) TableName() string {
	return "add_playlist"
}
