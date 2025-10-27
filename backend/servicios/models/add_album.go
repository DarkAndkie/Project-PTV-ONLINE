package models

type Add_Album struct {
	id_adicion   int    `gorm:"column: id_adicion; PrimaryKey" json:"id_adicion"`
	n_canciones  int    `gorm:"column:n_canciones" json:"n_canciones"`
	id_album     string `gorm:"column:id_album" json:"id_album"`
	id_banda     int    `gorm:"column:id_banda" json:"id_banda"`
	id_historial int    `gorm:"column:id_historial" json:"id_historial"`
}

func (Add_Album) TableName() string {
	return "add_album"
}
