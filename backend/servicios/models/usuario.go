package models

type TipoUsuario string

const (
	Admin         TipoUsuario = "admin"
	Curador       TipoUsuario = "curador"
	Banda         TipoUsuario = "banda"
	Artista       TipoUsuario = "artista"
	FinalUsuario  TipoUsuario = "finalusuario"
	Deshabilitado TipoUsuario = "deshabilitado"
)

type Usuario struct {
	Id_user   int         `gorm:"column:id_user; PrimaryKey; NOTNULL" json:"id_user"`
	Nombre    string      `gomr:"column:nombre; NOTNULL" json:"nombre"`
	Apellido  string      `gorm:"column:apellido; NOTNULL" json:"apellido"`
	Email     string      `gorm:"column:correo; NOTNULL; unique" json:"email"`
	Password  string      `gorm:"column:password; NOTNULL" json:"password"`
	Tipo_user TipoUsuario `gorm:"column:tipo_user; NOTNULL" json:"tipo_user"`
	Celular   string      `gorm:"column:celular; NOTNULL; default:true" json:"celular"`
}

func (Usuario) TableName() string {
	return "usuario"
}
