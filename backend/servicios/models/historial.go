package models

type Mv_Historial string

const (
	Adicion_album    Mv_Historial = "adicion_album"
	Adicion_Playlist Mv_Historial = "adicion_playlist"
	Estado_Usuario   Mv_Historial = "estado_usuario"
	EstadoAlbum      Mv_Historial = "estado_album"
	Estado_Cancion   Mv_Historial = "estado_cancion"
	Estado_Playlist  Mv_Historial = "estado_palylist"
)

type Historial struct {
	id_historial   int          `gorm:"column:id_historial;PrimaryKey" json:"id_historial"`
	Tipo_Mv        Mv_Historial `gorm:"column:tipo_mv; PrimaryKey" json:" tipo_mv"`
	fecha_mv       string       `gorm:"column:fecha_mv" json:"fecha_mv"`
	descripcion    string       `gorm:"column:descripcion" json:"descripcion"`
	id_responsable int          `gorm:"column:id_responsable" json:"id_responsable"`
}

func (Historial) TableName() string {
	return "historial"
}
